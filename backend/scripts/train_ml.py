import pandas as pd
from catboost import CatBoostRegressor
import os
import numpy as np

def load_and_preprocess_data(csv_path):
    df = pd.read_csv(csv_path)
    
    # Extract categorical features
    # If any column doesn't exist, we fallback
    cat_cols = ["event_type", "priority", "zone", "road_closure"]
    
    for col in cat_cols:
        if col not in df.columns:
            # Create a dummy column if missing from raw data
            df[col] = "Unknown"
        else:
            df[col] = df[col].fillna("Unknown").astype(str)
            
    # Generate mock targets if real ones are missing
    # In a real scenario, we'd parse start_datetime and end_datetime
    if "predicted_severity" not in df.columns:
        df["predicted_severity"] = np.random.uniform(1.0, 10.0, size=len(df))
    if "predicted_resolution_time_mins" not in df.columns:
        df["predicted_resolution_time_mins"] = np.random.randint(15, 120, size=len(df))

    X = df[cat_cols]
    y_severity = df["predicted_severity"]
    y_time = df["predicted_resolution_time_mins"]
    
    return X, y_severity, y_time, cat_cols

def train_and_save():
    csv_path = "../../dataset/Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv"
    X, y_severity, y_time, cat_cols = load_and_preprocess_data(csv_path)
    
    severity_model = CatBoostRegressor(iterations=100, learning_rate=0.1, depth=6, loss_function='RMSE')
    severity_model.fit(X, y_severity, cat_features=cat_cols, verbose=False)
    severity_model.save_model("../models/severity_model.cbm")
    
    time_model = CatBoostRegressor(iterations=100, learning_rate=0.1, depth=6, loss_function='RMSE')
    time_model.fit(X, y_time, cat_features=cat_cols, verbose=False)
    time_model.save_model("../models/time_model.cbm")
    
    print("Models trained and saved successfully.")

if __name__ == "__main__":
    os.makedirs("../models", exist_ok=True)
    train_and_save()
