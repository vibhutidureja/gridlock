import os
import pandas as pd
import numpy as np
from catboost import CatBoostClassifier
from sb3_contrib import MaskablePPO
from stable_baselines3.common.env_checker import check_env
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
import sys

base_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(base_dir, ".."))
sys.path.append(backend_dir)

from app.rl.traffic_env import TrafficManagementEnv

def load_and_prepare_daily_data(csv_path, catboost_model=None):
    print("Loading and preparing raw traffic data for RL...")
    df = pd.read_csv(csv_path, low_memory=False)
    
    df['start_datetime'] = pd.to_datetime(df['start_datetime'], errors='coerce')
    df['end_datetime'] = pd.to_datetime(df['end_datetime'], errors='coerce')
    df['resolved_datetime'] = pd.to_datetime(df.get('resolved_datetime', df['end_datetime']), errors='coerce')
    df['closed_datetime'] = pd.to_datetime(df.get('closed_datetime', df['end_datetime']), errors='coerce')
    
    best_end = df['resolved_datetime'].combine_first(df['end_datetime']).combine_first(df['closed_datetime'])
    df['estimated_duration'] = (best_end - df['start_datetime']).dt.total_seconds() / 60
    
    df = df.dropna(subset=['start_datetime', 'estimated_duration'])
    df = df[(df['estimated_duration'] > 1) & (df['estimated_duration'] <= 1440)].copy()
    
    df['hour'] = df['start_datetime'].dt.hour
    df['day_of_week'] = df['start_datetime'].dt.dayofweek
    df['date'] = df['start_datetime'].dt.date
    
    fill_cols = ['event_type', 'event_cause', 'veh_type', 'corridor', 
                 'priority', 'police_station', 'add1', 'add2', 'pin']
    for col in fill_cols:
        if col in df.columns:
            df[col] = df[col].fillna("Unknown").astype(str)
        else:
            df[col] = "Unknown"
            
    if 'latitude' not in df.columns: df['latitude'] = 12.9716
    else: df['latitude'] = pd.to_numeric(df['latitude'], errors='coerce').fillna(12.9716)
    if 'longitude' not in df.columns: df['longitude'] = 77.5946
    else: df['longitude'] = pd.to_numeric(df['longitude'], errors='coerce').fillna(77.5946)
    
    hourly_counts = df.groupby(['date', 'hour', 'corridor']).size().reset_index(name='events_per_hour')
    df = df.merge(hourly_counts, on=['date', 'hour', 'corridor'], how='left')
    max_events = df['events_per_hour'].max()
    df['traffic_density'] = df['events_per_hour'] / (max_events if max_events > 0 else 1)
    
    corridor_stats = df.groupby('corridor').agg(
        corridor_event_count=('estimated_duration', 'count'),
        corridor_avg_duration=('estimated_duration', 'mean'),
        corridor_breach_rate=('estimated_duration', lambda x: (x > 60).mean())
    ).reset_index()
    max_c_events = corridor_stats['corridor_event_count'].max()
    corridor_stats['corridor_event_count'] = corridor_stats['corridor_event_count'] / (max_c_events if max_c_events > 0 else 1)
    corridor_stats['corridor_risk_rank'] = corridor_stats['corridor_breach_rate'].rank(pct=True)
    
    df = df.merge(corridor_stats, on='corridor', how='left')
    
    daily_load = df.groupby('date')['estimated_duration'].sum().reset_index(name='current_day_load')
    max_load = daily_load['current_day_load'].max()
    daily_load['current_day_load'] = daily_load['current_day_load'] / (max_load if max_load > 0 else 1)
    df = df.merge(daily_load, on='date', how='left')

    if 'cmonth' not in df.columns: df['cmonth'] = df['start_datetime'].dt.month
    if 'cdate' not in df.columns: df['cdate'] = df['start_datetime'].dt.day
    if 'chour' not in df.columns: df['chour'] = df['start_datetime'].dt.hour
    
    if catboost_model is not None:
        print("Precomputing CatBoost Probabilities...")
        features_df = df[[
            'event_type', 'event_cause', 'veh_type', 'corridor', 
            'priority', 'police_station', 'add1', 'add2', 'pin',
            'latitude', 'longitude', 'cmonth', 'cdate', 'chour'
        ]].copy()
        
        probs = catboost_model.predict_proba(features_df)
        df['catboost_prob'] = probs[:, 1]
    else:
        df['catboost_prob'] = 0.5
        
    df = df.sort_values('start_datetime')
    daily_groups = []
    
    for date, group in df.groupby('date'):
        events = group.to_dict('records')
        daily_groups.append(events)
        
    print(f"Grouped into {len(daily_groups)} strict 24-hour days.")
    return daily_groups

def train_rl_agent():
    print("=== Traffic Management RL Pipeline (MaskablePPO + VecNormalize) ===")
    
    model_path = os.path.join(base_dir, "../models/sla_model.cbm")
    catboost_model = CatBoostClassifier()
    try:
        catboost_model.load_model(model_path)
    except Exception as e:
        print(f"Error loading CatBoost model: {e}")
        return

    csv_path = os.path.join(base_dir, "../../dataset/Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv")
    try:
        daily_data = load_and_prepare_daily_data(csv_path, catboost_model=catboost_model)
    except Exception as e:
        print(f"Error loading dataset: {e}")
        daily_data = []

    env = TrafficManagementEnv(daily_data=daily_data)
    check_env(env, warn=True)
    
    # Wrap in VecNormalize
    vec_env = DummyVecEnv([lambda: env])
    vec_env = VecNormalize(vec_env, norm_obs=True, norm_reward=True, clip_obs=10.0)
    
    print("Initializing MaskablePPO Agent (Tuned with Optuna)...")
    model = MaskablePPO(
        "MlpPolicy",
        vec_env,
        learning_rate=0.0004795,
        gamma=0.98,
        ent_coef=4.13e-08,
        verbose=1,
        tensorboard_log=os.path.join(base_dir, "../logs/"),
        n_epochs=10
    )

    training_steps = 100000
    print(f"Training MaskablePPO for {training_steps} timesteps...")
    model.learn(total_timesteps=training_steps)

    # Save Model & Normalization Stats
    model.save(os.path.join(base_dir, "../models/ppo_feature_agent.zip"))
    print(f"MaskablePPO Agent saved to {os.path.join(base_dir, '../models/ppo_feature_agent.zip')}")
    vec_env.save(os.path.join(base_dir, "../models/vec_normalize_feature.pkl"))
    print(f"VecNormalize stats saved to {os.path.join(base_dir, '../models/vec_normalize_feature.pkl')}")

if __name__ == "__main__":
    train_rl_agent()
