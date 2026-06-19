import os
import sys
import numpy as np
import pandas as pd
from catboost import CatBoostClassifier
from sb3_contrib import MaskablePPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
from stable_baselines3.common.utils import set_random_seed

base_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(base_dir, ".."))
sys.path.append(backend_dir)

from app.rl.traffic_env import TrafficManagementEnv
from scripts.train_rl import load_and_prepare_daily_data
from scripts.evaluate_rl import evaluate_policy

def task_a(test_days):
    print("="*60)
    print("TASK A: Theoretical Maximum Prevention Analysis")
    print("="*60)
    
    buckets = {"0.0-0.3": [0,0,0], "0.3-0.6": [0,0,0], "0.6-0.8": [0,0,0], "0.8-1.0": [0,0,0]}
    
    for day in test_days:
        for event in day:
            duration = float(event.get('estimated_duration', 60.0))
            prob = float(event.get('catboost_prob', 0.5))
            
            b_key = ""
            if prob < 0.3: b_key = "0.0-0.3"
            elif prob < 0.6: b_key = "0.3-0.6"
            elif prob < 0.8: b_key = "0.6-0.8"
            else: b_key = "0.8-1.0"
            
            if duration >= 60.0:
                buckets[b_key][0] += 1
                if duration * 0.2 < 60.0:
                    buckets[b_key][1] += 1
                else:
                    buckets[b_key][2] += 1
                    
    print(f"{'Risk Bucket':<12} | {'Baseline Breaches':<18} | {'Preventable':<12} | {'Unpreventable'}")
    print("-" * 65)
    
    total_baseline = 0
    total_preventable = 0
    for k, v in buckets.items():
        total_baseline += v[0]
        total_preventable += v[1]
        print(f"{k:<12} | {v[0]:<18} | {v[1]:<12} | {v[2]}")
        
    print("-" * 65)
    print(f"Total Baseline Breaches: {total_baseline}")
    print(f"Total Preventable: {total_preventable}")
    ceiling = (total_preventable / total_baseline) * 100 if total_baseline > 0 else 0
    print(f"Maximum Achievable Prevention Rate: {ceiling:.2f}%")
    print("\n")

def task_b(test_days):
    print("="*60)
    print("TASK B: Multi-Seed Stability Analysis (Stochastic Eval)")
    print("="*60)
    
    rl_model_path = os.path.join(base_dir, "../models/ppo_traffic_agent.zip")
    vec_path = os.path.join(base_dir, "../models/vec_normalize.pkl")
    
    if not os.path.exists(rl_model_path) or not os.path.exists(vec_path):
        print("Models not found!")
        return

    seeds = [42, 123, 999, 2025, 7777]
    seed_results = []
    
    baseline_breaches = 195 # Known from Phase 3
    
    for s in seeds:
        set_random_seed(s)
        env = TrafficManagementEnv(daily_data=test_days)
        vec_env = DummyVecEnv([lambda: env])
        vec_env = VecNormalize.load(vec_path, vec_env)
        vec_env.training = False
        vec_env.norm_reward = False
        
        model = MaskablePPO.load(rl_model_path, env=vec_env, seed=s)
        
        # We need a custom eval loop that uses deterministic=False to measure policy variance
        total_cost = 0.0
        sla_breaches = 0
        
        for i in range(len(test_days)):
            obs, info = env.reset(seed=s+i)
            env.current_day_events = test_days[i]
            env.current_event_idx = 0
            vec_obs = vec_env.reset()
            
            done = False
            while not done:
                masks = np.array([env.action_masks()])
                # NON-DETERMINISTIC evaluation to check policy variance
                action, _states = model.predict(vec_obs, action_masks=masks, deterministic=False)
                action = action[0]
                
                obs, reward, terminated, truncated, step_info = env.step(action)
                if not (terminated or truncated):
                    vec_obs = vec_env.normalize_obs(obs.reshape(1, -1))
                
                total_cost += step_info["cost"]
                if step_info["new_duration"] >= 60.0: sla_breaches += 1
                done = terminated or truncated
                
        prevented = max(0, baseline_breaches - sla_breaches)
        prev_rate = (prevented / baseline_breaches) * 100
        cost_pb = total_cost / prevented if prevented > 0 else 0
        seed_results.append((prev_rate, cost_pb))
        
    print(f"{'Seed':<10} | {'Prevention Rate':<16} | {'Cost/Breach'}")
    print("-" * 45)
    rates = []
    for i, s in enumerate(seeds):
        print(f"{s:<10} | {seed_results[i][0]:>15.2f}% | {seed_results[i][1]:>10.2f}")
        rates.append(seed_results[i][0])
        
    print("-" * 45)
    print(f"Mean Prevention: {np.mean(rates):.2f}%")
    print(f"Std Deviation: {np.std(rates):.2f}%")
    print(f"Best Seed: {seeds[np.argmax(rates)]} ({np.max(rates):.2f}%)")
    print(f"Worst Seed: {seeds[np.argmin(rates)]} ({np.min(rates):.2f}%)\n")

def task_cd(test_days):
    print("="*60)
    print("TASK D: Action Utilization Audit")
    print("="*60)
    
    rl_model_path = os.path.join(base_dir, "../models/ppo_traffic_agent.zip")
    vec_path = os.path.join(base_dir, "../models/vec_normalize.pkl")
    
    env = TrafficManagementEnv(daily_data=test_days)
    vec_env = DummyVecEnv([lambda: env])
    vec_env = VecNormalize.load(vec_path, vec_env)
    vec_env.training = False
    vec_env.norm_reward = False
    model = MaskablePPO.load(rl_model_path, env=vec_env)
    
    results = {}
    evaluate_policy(model, vec_env, env, "Cost-Optimized", results, test_days)
    
    counts = results["Cost-Optimized"]["Action Counts"]
    print(f"Action 0 (No Action): {counts[0]}")
    print(f"Action 1 (Reroute)  : {counts[1]}")
    print(f"Action 2 (Dispatch) : {counts[2]}")
    print(f"Action 3 (Closure)  : {counts[3]}")
    print(f"Action 4 (Emergency): {counts[4]}")
    
    # Check high risk under-utilization
    high_risk_events = 0
    high_risk_emergency = 0
    
    for i in range(len(test_days)):
        obs, info = env.reset()
        env.current_day_events = test_days[i]
        env.current_event_idx = 0
        vec_obs = vec_env.reset()
        
        done = False
        while not done:
            prob = float(env.current_day_events[env.current_event_idx].get('catboost_prob', 0.5))
            masks = np.array([env.action_masks()])
            action, _ = model.predict(vec_obs, action_masks=masks, deterministic=True)
            action = action[0]
            
            if prob > 0.8:
                high_risk_events += 1
                if action == 4:
                    high_risk_emergency += 1
                    
            obs, reward, terminated, truncated, _ = env.step(action)
            if not (terminated or truncated):
                vec_obs = vec_env.normalize_obs(obs.reshape(1, -1))
            done = terminated or truncated
            
    print(f"\nOut of {high_risk_events} high-risk events (prob > 0.8), Emergency (Action 4) was used {high_risk_emergency} times ({(high_risk_emergency/max(1, high_risk_events))*100:.1f}%).\n")

if __name__ == "__main__":
    cat_model_path = os.path.join(base_dir, "../models/sla_model.cbm")
    catboost_model = CatBoostClassifier()
    catboost_model.load_model(cat_model_path)
    csv_path = os.path.join(base_dir, "../../dataset/Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv")
    daily_data = load_and_prepare_daily_data(csv_path, catboost_model=catboost_model)
    test_days = daily_data[-20:] if len(daily_data) > 20 else daily_data
    
    task_a(test_days)
    task_b(test_days)
    task_cd(test_days)
