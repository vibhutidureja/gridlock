import pandas as pd
import numpy as np
import os
from catboost import CatBoostClassifier
import warnings

warnings.filterwarnings("ignore")

def load_and_preprocess_data(csv_path):
    df = pd.read_csv(csv_path, low_memory=False)

    # Convert time columns to calculate min_to_take_action
    for col in ['created_date', 'modified_datetime']:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors='coerce')

    if 'created_date' in df.columns and 'modified_datetime' in df.columns:
        df['min_to_take_action'] = (df['modified_datetime'] - df['created_date']).dt.total_seconds() / 60
    else:
        # Fallback if specific columns are not available, we use start and resolved
        start = pd.to_datetime(df['start_datetime'], errors='coerce')
        resolved = pd.to_datetime(df['resolved_datetime'], errors='coerce')
        end_event = pd.to_datetime(df['end_datetime'], errors='coerce')
        closed = pd.to_datetime(df['closed_datetime'], errors='coerce')
        best_end = resolved.combine_first(end_event).combine_first(closed)
        df['min_to_take_action'] = (best_end - start).dt.total_seconds() / 60

    # Clean address data
    if 'address' in df.columns:
        address_parts = df['address'].astype(str).str.split(',')
        df['add1'] = address_parts.apply(lambda x: x[1].strip() if isinstance(x, list) and len(x) > 1 else "Unknown")
        df['add2'] = address_parts.apply(lambda x: x[2].strip() if isinstance(x, list) and len(x) > 2 else "Unknown")
        df['pin'] = df['address'].astype(str).str.extract(r'Pin-(\d{6})')
        df['pin'] = df['pin'].fillna("Unknown")
    else:
        df['add1'] = "Unknown"
        df['add2'] = "Unknown"
        df['pin'] = "Unknown"

    # Filter reality outliers
    df = df[
        (df['min_to_take_action'] > 1) & 
        (df['min_to_take_action'] <= 1440)
    ].copy()
    
    df = df.dropna(subset=['min_to_take_action'])

    # Target
    df['is_delayed'] = (df['min_to_take_action'] > 60).astype(int)

    # Extract numerical features
    if 'latitude' in df.columns and 'longitude' in df.columns:
        df['latitude'] = pd.to_numeric(df['latitude'], errors='coerce').fillna(12.9716)
        df['longitude'] = pd.to_numeric(df['longitude'], errors='coerce').fillna(77.5946)
    else:
        df['latitude'] = 12.9716
        df['longitude'] = 77.5946

    if 'created_date' in df.columns:
        dt_series = pd.to_datetime(df['created_date'], errors='coerce')
        df['cmonth'] = dt_series.dt.month.fillna(0).astype(int)
        df['cdate'] = dt_series.dt.day.fillna(0).astype(int)
        df['chour'] = dt_series.dt.hour.fillna(0).astype(int)
    else:
        df['cmonth'] = 0
        df['cdate'] = 0
        df['chour'] = 0

    cat_cols = [
        'event_type', 'event_cause', 'veh_type', 'corridor', 
        'priority', 'police_station', 'add1', 'add2', 'pin'
    ]
    num_cols = ['latitude', 'longitude', 'cmonth', 'cdate', 'chour']

    for col in cat_cols:
        if col not in df.columns:
            df[col] = "Unknown"
        df[col] = df[col].fillna("Unknown").astype(str)

    X = df[cat_cols + num_cols]
    y = df['is_delayed']

    return X, y, cat_cols

def train_and_save():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.abspath(os.path.join(base_dir, "../../dataset/Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv"))
    
    print("Loading and preprocessing data...")
    X, y, cat_cols = load_and_preprocess_data(csv_path)
    
    print(f"Training SLA Predictor on {len(X)} rows...")
    model = CatBoostClassifier(
        iterations=1500,
        depth=8,
        learning_rate=0.03,
        eval_metric='AUC',
        auto_class_weights='Balanced',
        verbose=100,
        random_state=42
    )
    
    model.fit(X, y, cat_features=cat_cols)
    
    model_path = os.path.abspath(os.path.join(base_dir, "../models/sla_model.cbm"))
    model.save_model(model_path)
    print(f"Model trained and saved successfully at '{model_path}'.")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.abspath(os.path.join(base_dir, "../models"))
    os.makedirs(models_dir, exist_ok=True)
    train_and_save()