import os
import sys
import numpy as np
from catboost import CatBoostClassifier
from sb3_contrib import MaskablePPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize

base_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(base_dir, ".."))
sys.path.append(backend_dir)

from app.rl.traffic_env import TrafficManagementEnv
from scripts.train_rl import load_and_prepare_daily_data

def evaluate_policy(model, vec_env, env, policy_name, results, test_days):
    total_reward = 0.0
    sla_breaches = 0
    total_cost = 0.0
    total_events = 0
    masked_action_attempts = 0
    action_counts = {0:0, 1:0, 2:0, 3:0, 4:0}
    high_risk_events = 0
    high_risk_emergency = 0
    
    for i in range(len(test_days)):
        vec_obs = vec_env.reset()
        
        # Override the random day chosen by vec_env.reset()
        env = vec_env.envs[0]
        env.current_day_events = test_days[i]
        env.current_event_idx = 0
        
        # Re-compute initial observation for the injected day
        obs = env._get_obs()
        vec_obs = vec_env.normalize_obs(obs.reshape(1, -1))
        
        done = False
        while not done:
            prob = float(env.current_day_events[env.current_event_idx].get('catboost_prob', 0.5))
            masks = np.array([env.action_masks()])
            action, _states = model.predict(vec_obs, action_masks=masks, deterministic=True)
            action = action[0]
            
            if prob > 0.8:
                high_risk_events += 1
                if action == 4:
                    high_risk_emergency += 1
            
            obs, reward, terminated, truncated, step_info = env.step(action)
            if not (terminated or truncated):
                vec_obs = vec_env.normalize_obs(obs.reshape(1, -1))
            
            total_reward += reward
            total_cost += step_info["cost"]
            action_counts[action] += 1
            if step_info["new_duration"] >= 60.0: sla_breaches += 1
            if step_info.get("is_masked", False): masked_action_attempts += 1
            
            total_events += 1
            done = terminated or truncated
            
    results[policy_name] = {
        "Total Reward": total_reward,
        "SLA Breaches": sla_breaches,
        "Total Cost": total_cost,
        "Events Evaluated": total_events,
        "Masked Attempts": masked_action_attempts,
        "Action Counts": action_counts,
        "High Risk Events": high_risk_events,
        "High Risk Emergency": high_risk_emergency
    }

def evaluate_baselines():
    print("=== Traffic Management RL Evaluation (Phase 4: Risk-Aware PPO) ===")
    
    cat_model_path = os.path.join(base_dir, "../models/sla_model.cbm")
    catboost_model = CatBoostClassifier()
    try:
        catboost_model.load_model(cat_model_path)
    except Exception as e:
        print(f"Error loading CatBoost model: {e}")
        return

    csv_path = os.path.join(base_dir, "../../dataset/Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv")
    daily_data = load_and_prepare_daily_data(csv_path, catboost_model=catboost_model)
    test_days = daily_data[-20:] if len(daily_data) > 20 else daily_data
    
    policies = ["Strong Rule Based"]
    results = {}

    for policy in policies:
        env = TrafficManagementEnv(daily_data=test_days)
        total_reward = 0.0
        sla_breaches = 0
        total_cost = 0.0
        total_events = 0
        action_counts = {0:0, 1:0, 2:0, 3:0, 4:0}
        high_risk_events = 0
        high_risk_emergency = 0
        
        for i in range(len(test_days)):
            obs, info = env.reset()
            env.current_day_events = test_days[i]
            env.current_event_idx = 0
            
            done = False
            while not done:
                event = env.current_day_events[env.current_event_idx]
                catboost_prob = float(event.get('catboost_prob', 0.5))
                
                if policy == "Strong Rule Based":
                    if catboost_prob > 0.85: action = 4
                    elif catboost_prob > 0.65: action = 2
                    elif catboost_prob > 0.45: action = 1
                    else: action = 0
                    
                if catboost_prob > 0.8:
                    high_risk_events += 1
                    if action == 4:
                        high_risk_emergency += 1
                    
                obs, reward, terminated, truncated, step_info = env.step(action)
                
                total_reward += reward
                total_cost += step_info["cost"]
                action_counts[action] += 1
                if step_info["new_duration"] >= 60.0: sla_breaches += 1
                total_events += 1
                done = terminated or truncated
                
        results[policy] = {"Total Reward": total_reward, "SLA Breaches": sla_breaches, "Total Cost": total_cost, "Events Evaluated": total_events, "Masked Attempts": 0, "Action Counts": action_counts, "High Risk Events": high_risk_events, "High Risk Emergency": high_risk_emergency}

    # print("\nEvaluating Cost-Optimized PPO Agent...")
    # cost_ppo_path = os.path.join(base_dir, "../models/ppo_traffic_agent.zip")
    # cost_vec_path = os.path.join(base_dir, "../models/vec_normalize.pkl")
    # if os.path.exists(cost_ppo_path) and os.path.exists(cost_vec_path):
    #     env = TrafficManagementEnv(daily_data=test_days)
    #     vec_env = DummyVecEnv([lambda: env])
    #     vec_env = VecNormalize.load(cost_vec_path, vec_env)
    #     vec_env.training = False
    #     vec_env.norm_reward = False
    #     model = MaskablePPO.load(cost_ppo_path, env=vec_env)
    #     evaluate_policy(model, vec_env, env, "Cost-Optimized PPO", results, test_days)
    # else:
    #     print("Cost-Optimized PPO models not found.")
        
    print("\nEvaluating Feature-Enriched PPO Agent...")
    feat_ppo_path = os.path.join(base_dir, "../models/ppo_feature_agent.zip")
    feat_vec_path = os.path.join(base_dir, "../models/vec_normalize_feature.pkl")
    if os.path.exists(feat_ppo_path) and os.path.exists(feat_vec_path):
        env = TrafficManagementEnv(daily_data=test_days)
        vec_env = DummyVecEnv([lambda: env])
        vec_env = VecNormalize.load(feat_vec_path, vec_env)
        vec_env.training = False
        vec_env.norm_reward = False
        model = MaskablePPO.load(feat_ppo_path, env=vec_env)
        evaluate_policy(model, vec_env, env, "Feature-Enriched PPO", results, test_days)
    else:
        print("Feature-Enriched PPO models not found.")

    print("\n" + "="*80)
    print("--- Phase 5 Evaluation Results (Feature Gap Analysis) ---")
    print("="*80)
    
    baseline_breaches = 195 # Hardcoded from Phase 3 to keep calculations aligned
    print(f"{'Policy':<25} | {'Breaches':<10} | {'Prevention %':<12} | {'Cost/Prevented':<14} | {'Emergency (>0.8)'}")
    print("-" * 85)
    
    for policy, metrics in results.items():
        breaches = metrics["SLA Breaches"]
        cost = metrics["Total Cost"]
        hr_events = metrics.get("High Risk Events", 0)
        hr_emerg = metrics.get("High Risk Emergency", 0)
        
        prevention_rate, cost_per_prevented = 0.0, 0.0
        prevented = max(0, baseline_breaches - breaches)
        prevention_rate = (prevented / baseline_breaches) * 100.0
        if prevented > 0: cost_per_prevented = cost / prevented
        
        emerg_rate = (hr_emerg / hr_events) * 100 if hr_events > 0 else 0
        
        print(f"{policy:<25} | {breaches:<10} | {prevention_rate:>10.1f}% | {cost_per_prevented:>14.2f} | {emerg_rate:>10.1f}% ({hr_emerg}/{hr_events})")

    for p in ["Cost-Optimized PPO", "Risk-Aware PPO"]:
        if p in results:
            print(f"\n[{p} Action Distribution]")
            total = sum(results[p]["Action Counts"].values())
            for act, count in results[p]["Action Counts"].items():
                pct = (count / total) * 100 if total > 0 else 0
                print(f"Action {act}: {count} ({pct:.1f}%)")

if __name__ == "__main__":
    evaluate_baselines()
