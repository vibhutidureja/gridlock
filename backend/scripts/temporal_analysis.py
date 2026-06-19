import os
import pandas as pd
import numpy as np
import sys
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, accuracy_score
import scipy.stats

base_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(base_dir, ".."))
sys.path.append(backend_dir)

from app.rl.traffic_env import TrafficManagementEnv
from scripts.train_rl import load_and_prepare_daily_data
from catboost import CatBoostClassifier

def run_temporal_analysis():
    print("=== Temporal Dependency Analysis ===")
    
    # 1. Load Data
    model_path = os.path.join(base_dir, "../models/sla_model.cbm")
    catboost_model = CatBoostClassifier()
    try:
        catboost_model.load_model(model_path)
    except Exception as e:
        print(f"Error loading CatBoost model: {e}")
        return

    csv_path = os.path.join(base_dir, "../../dataset/Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv")
    daily_data = load_and_prepare_daily_data(csv_path, catboost_model=catboost_model)
    
    env = TrafficManagementEnv(daily_data=daily_data)
    
    print("Generating offline environment rollout data using a random exploration policy...")
    
    # We will collect data for all days
    records = []
    
    for day_events in daily_data:
        env.current_day_events = day_events
        env.current_event_idx = 0
        obs, _ = env.reset()
        # override since reset randomizes
        env.current_day_events = day_events
        env.current_event_idx = 0
        obs = env._get_obs()
        
        done = False
        step = 0
        
        while not done:
            # Pick a random valid action
            valid_actions = np.where(env.action_masks())[0]
            action = np.random.choice(valid_actions)
            
            # Record state BEFORE action
            state_record = {
                'step': step,
                'catboost_prob': obs[0],
                'estimated_duration': obs[1],
                'current_congestion': obs[8],
                'current_day_load': obs[12] if len(obs) > 12 else 0,
                'corridor_risk': obs[13] if len(obs) > 13 else 0,
                'action': action
            }
            
            next_obs, reward, terminated, truncated, info = env.step(action)
            done = terminated or truncated
            
            # Record outcome
            state_record['breached'] = 1 if info.get('new_duration', 0) > 60 else 0
            state_record['next_congestion'] = next_obs[8] if not done else 0
            
            records.append(state_record)
            obs = next_obs
            step += 1

    df = pd.DataFrame(records)
    print(f"Collected {len(df)} environment transitions.")
    
    # 2. Build Lag Features
    print("Building historical lag features...")
    # Since episodes are separated by step=0, we can use shift but mask out boundaries
    for lag in [1, 2, 3, 4, 5, 10]:
        df[f'lag_{lag}_prob'] = df['catboost_prob'].shift(lag)
        df[f'lag_{lag}_action'] = df['action'].shift(lag)
        df[f'lag_{lag}_congestion'] = df['current_congestion'].shift(lag)
        df[f'lag_{lag}_breach'] = df['breached'].shift(lag)
        
        # Mask out shifts that cross episode boundaries (where step < lag)
        df.loc[df['step'] < lag, [f'lag_{lag}_prob', f'lag_{lag}_action', f'lag_{lag}_congestion', f'lag_{lag}_breach']] = np.nan

    df = df.dropna().copy()
    print(f"Data remaining after lagging: {len(df)}")
    
    # 3. Correlation Analysis
    print("\n--- Correlation Analysis ---")
    corr_1 = df['breached'].corr(df['lag_1_breach'])
    corr_3 = df['breached'].corr(df['lag_3_breach'])
    corr_5 = df['breached'].corr(df['lag_5_breach'])
    corr_10 = df['breached'].corr(df['lag_10_breach'])
    
    corr_cong = df['breached'].corr(df['lag_1_congestion'])
    
    print(f"Correlation between Breach(t) and Breach(t-1): {corr_1:.4f}")
    print(f"Correlation between Breach(t) and Breach(t-3): {corr_3:.4f}")
    print(f"Correlation between Breach(t) and Breach(t-5): {corr_5:.4f}")
    print(f"Correlation between Breach(t) and Breach(t-10): {corr_10:.4f}")
    print(f"Correlation between Breach(t) and Congestion(t-1): {corr_cong:.4f}")
    
    # 4. Predictive Modeling (Random Forest)
    print("\n--- Markov Assumption Test (Random Forest) ---")
    print("Task: Predict if the current event will breach, given the State + Action.")
    
    target = 'breached'
    
    # Model 1: Current State Only
    features_m1 = ['catboost_prob', 'estimated_duration', 'current_congestion', 'current_day_load', 'corridor_risk', 'action']
    
    # Model 2: State + Lag 1
    features_m2 = features_m1 + ['lag_1_prob', 'lag_1_action', 'lag_1_congestion']
    
    # Model 3: State + Lag 1 to 5
    features_m3 = features_m2 + [
        'lag_2_prob', 'lag_2_action', 'lag_2_congestion',
        'lag_3_prob', 'lag_3_action', 'lag_3_congestion',
        'lag_4_prob', 'lag_4_action', 'lag_4_congestion',
        'lag_5_prob', 'lag_5_action', 'lag_5_congestion'
    ]
    
    X1, X2, X3 = df[features_m1], df[features_m2], df[features_m3]
    y = df[target]
    
    # Split
    X1_train, X1_test, y_train, y_test = train_test_split(X1, y, test_size=0.2, random_state=42, stratify=y)
    X2_train, X2_test, _, _ = train_test_split(X2, y, test_size=0.2, random_state=42, stratify=y)
    X3_train, X3_test, _, _ = train_test_split(X3, y, test_size=0.2, random_state=42, stratify=y)
    
    rf = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
    
    rf.fit(X1_train, y_train)
    auc_1 = roc_auc_score(y_test, rf.predict_proba(X1_test)[:, 1])
    
    rf.fit(X2_train, y_train)
    auc_2 = roc_auc_score(y_test, rf.predict_proba(X2_test)[:, 1])
    
    rf.fit(X3_train, y_train)
    auc_3 = roc_auc_score(y_test, rf.predict_proba(X3_test)[:, 1])
    
    print(f"{'Model':<30} | {'Features':<10} | {'ROC-AUC':<10}")
    print("-" * 55)
    print(f"{'Current State Only':<30} | {len(features_m1):<10} | {auc_1:.4f}")
    print(f"{'Current State + Lag 1':<30} | {len(features_m2):<10} | {auc_2:.4f}")
    print(f"{'Current State + Lag 1 to 5':<30} | {len(features_m3):<10} | {auc_3:.4f}")
    
    print("\nConclusion:")
    if auc_3 - auc_1 < 0.01:
        print("-> The environment IS LIKELY MARKOVIAN. Adding memory (LSTM) does NOT significantly improve predictive power.")
        print("-> The current state already contains sufficient information to predict breaches.")
    else:
        print("-> The environment has STRONG TEMPORAL DEPENDENCIES. Adding memory (LSTM) significantly improves prediction.")
        print("-> RecurrentPPO is highly recommended.")

if __name__ == "__main__":
    run_temporal_analysis()
