import os
import sys
import numpy as np
from catboost import CatBoostClassifier
from sb3_contrib import MaskablePPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
from stable_baselines3.common.utils import set_random_seed

base_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(base_dir, ".."))
sys.path.append(backend_dir)

from app.rl.traffic_env import TrafficManagementEnv
from scripts.train_rl import load_and_prepare_daily_data

def evaluate_ablation_scenario(model_path, vec_path, test_days, scenario_name):
    set_random_seed(42)
    env = TrafficManagementEnv(daily_data=test_days, mask_scenario=scenario_name)
    vec_env = DummyVecEnv([lambda: env])
    vec_env = VecNormalize.load(vec_path, vec_env)
    vec_env.training = False
    vec_env.norm_reward = False
    
    model = MaskablePPO.load(model_path, env=vec_env)
    
    total_cost = 0.0
    sla_breaches = 0
    baseline_breaches = 195
    
    # We must iterate deterministic
    for i in range(len(test_days)):
        obs, info = env.reset()
        env.current_day_events = test_days[i]
        env.current_event_idx = 0
        vec_obs = vec_env.reset()
        
        done = False
        while not done:
            masks = np.array([env.action_masks()])
            action, _ = model.predict(vec_obs, action_masks=masks, deterministic=True)
            action = action[0]
            
            obs, reward, terminated, truncated, step_info = env.step(action)
            if not (terminated or truncated):
                vec_obs = vec_env.normalize_obs(obs.reshape(1, -1))
            
            total_cost += step_info["cost"]
            if step_info["new_duration"] > 60.0:
                sla_breaches += 1
            done = terminated or truncated
            
    prevented = max(0, baseline_breaches - sla_breaches)
    prev_rate = (prevented / baseline_breaches) * 100
    cost_pb = total_cost / prevented if prevented > 0 else 0
    return prev_rate, cost_pb

def run_evaluation():
    print("=== Action-Mask Ablation Study Results ===")
    
    model_path = os.path.join(base_dir, "../models/sla_model.cbm")
    catboost_model = CatBoostClassifier()
    try:
        catboost_model.load_model(model_path)
    except:
        return

    csv_path = os.path.join(base_dir, "../../dataset/Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv")
    daily_data = load_and_prepare_daily_data(csv_path, catboost_model=catboost_model)
    test_days = daily_data[-20:]
    
    scenarios = [
        ("A", "ppo_feature_agent.zip", "vec_normalize_feature.pkl"), 
        ("B", "ppo_scenario_b.zip", "vec_normalize_b.pkl"),
        ("C", "ppo_scenario_c.zip", "vec_normalize_c.pkl")
    ]
    
    print(f"\n{'Scenario':<25} | {'Oracle Ceiling':<15} | {'PPO Prevention':<15} | {'Cost/Breach'}")
    print("-" * 75)
    
    oracle_ceilings = {"A": "46.67%", "B": "55.90%", "C": "76.41%"}
    
    for s_name, m_file, v_file in scenarios:
        m_path = os.path.join(base_dir, f"../models/{m_file}")
        v_path = os.path.join(base_dir, f"../models/{v_file}")
        
        if os.path.exists(m_path) and os.path.exists(v_path):
            prev, cost = evaluate_ablation_scenario(m_path, v_path, test_days, s_name)
            print(f"Scenario {s_name:<16} | {oracle_ceilings[s_name]:<15} | {prev:>14.2f}% | {cost:>14.2f}")
        else:
            print(f"Scenario {s_name:<16} | {oracle_ceilings[s_name]:<15} | {'Not trained':>14} | {'N/A':>14}")

if __name__ == "__main__":
    run_evaluation()
