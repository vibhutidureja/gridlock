import pandas as pd
import numpy as np
import os
from catboost import CatBoostRegressor
from sklearn.cluster import KMeans
import warnings

warnings.filterwarnings("ignore")

def get_time_of_day(hour):
    if 5 <= hour < 12:
        return "Morning"
    elif 12 <= hour < 17:
        return "Afternoon"
    elif 17 <= hour < 21:
        return "Evening"
    return "Night"

def load_and_preprocess_data(csv_path):
    df = pd.read_csv(csv_path, low_memory=False)

    cat_cols = [
        'event_type', 'event_cause', 'veh_type', 'corridor', 'zone',
        'priority', 'time_of_day', 'location_cluster', 'police_station', 'junction'
    ]

    num_cols = [
        'start_hour', 'day_of_week', 'is_weekend', 'is_rush_hour',
        'latitude', 'longitude', 'hour_sin', 'hour_cos', 'corridor_freq',
        'zone_freq', 'event_cause_freq', 'location_cluster_freq',
        'lat_lon_sum', 'lat_lon_product'
    ]

    # Date parsing and temporal features
    dt = pd.to_datetime(df['start_datetime'], errors='coerce')
    df['start_hour'] = dt.dt.hour.fillna(0).astype(int)
    df['day_of_week'] = dt.dt.dayofweek.fillna(0).astype(int)
    df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
    df['is_rush_hour'] = df['start_hour'].apply(
        lambda x: 1 if ((8 <= x <= 11) or (17 <= x <= 21)) else 0
    )
    df['time_of_day'] = df['start_hour'].apply(get_time_of_day)

    # Cyclical encoding
    df['hour_sin'] = np.sin(2 * np.pi * df['start_hour'] / 24)
    df['hour_cos'] = np.cos(2 * np.pi * df['start_hour'] / 24)

    # Spatial features and clustering
    for col in ['latitude', 'longitude']:
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    coords = df[['latitude', 'longitude']].fillna(0)
    df['location_cluster'] = KMeans(
        n_clusters=40, random_state=42, n_init=10
    ).fit_predict(coords).astype(str)

    # Frequency encoding
    df['corridor_freq'] = df.groupby('corridor')['corridor'].transform('count')
    df['zone_freq'] = df.groupby('zone')['zone'].transform('count')
    df['event_cause_freq'] = df.groupby('event_cause')['event_cause'].transform('count')
    df['location_cluster_freq'] = df.groupby('location_cluster')['location_cluster'].transform('count')

    # Feature interactions
    df['lat_lon_sum'] = df['latitude'] + df['longitude']
    df['lat_lon_product'] = df['latitude'] * df['longitude']

    # Handling missing categoricals
    for col in cat_cols:
        if col not in df.columns:
            df[col] = "Unknown"
        df[col] = df[col].fillna("Unknown").astype(str)

    # Actual target calculation (resolution time)
    start = pd.to_datetime(df['start_datetime'], errors='coerce')
    resolved = pd.to_datetime(df['resolved_datetime'], errors='coerce')
    end_event = pd.to_datetime(df['end_datetime'], errors='coerce')
    closed = pd.to_datetime(df['closed_datetime'], errors='coerce')

    best_end = resolved.combine_first(end_event).combine_first(closed)
    df['target_mins'] = (best_end - start).dt.total_seconds() / 60

    # Filter out extreme outliers
    df = df[
        (df['target_mins'] >= 5) & 
        (df['target_mins'] <= 720)
    ].copy()

    X = df[cat_cols + num_cols]
    y_time = df['target_mins']

    return X, y_time, cat_cols

def train_and_save():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.abspath(os.path.join(base_dir, "../../dataset/Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv"))
    
    print("Loading and preprocessing data...")
    X, y_time, cat_cols = load_and_preprocess_data(csv_path)
    
    print("Training time_model with optimized hyperparameters...")
    time_model = CatBoostRegressor(
        iterations=2000,
        learning_rate=0.05,
        depth=6,
        l2_leaf_reg=15,
        loss_function='Huber:delta=50',
        eval_metric='MAE',
        random_seed=42,
        verbose=100
    )
    
    # Fitting on the entire dataset for final model saving
    time_model.fit(X, y_time, cat_features=cat_cols)
    
    # Saving the model
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.abspath(os.path.join(base_dir, "../models/time_model.cbm"))
    time_model.save_model(model_path)
    print(f"Model trained and saved successfully at '{model_path}'.")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.abspath(os.path.join(base_dir, "../models"))
    os.makedirs(models_dir, exist_ok=True)
    train_and_save()