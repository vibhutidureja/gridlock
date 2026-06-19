import os
import sys
import pandas as pd
import numpy as np
import optuna
from catboost import CatBoostClassifier
from sb3_contrib import MaskablePPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize

base_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(base_dir, ".."))
sys.path.append(backend_dir)

from app.rl.traffic_env import TrafficManagementEnv
from scripts.train_rl import load_and_prepare_daily_data

def evaluate_model(model, vec_env, env, test_days):
    sla_breaches = 0
    total_cost = 0.0
    for i in range(len(test_days)):
        obs, info = env.reset()
        env.current_day_events = test_days[i]
        env.current_event_idx = 0
        vec_obs = vec_env.reset()
        
        done = False
        while not done:
            masks = np.array([env.action_masks()])
            action, _states = model.predict(vec_obs, action_masks=masks, deterministic=True)
            action = action[0]
            obs, reward, terminated, truncated, step_info = env.step(action)
            if not (terminated or truncated):
                vec_obs = vec_env.normalize_obs(obs.reshape(1, -1))
            total_cost += step_info["cost"]
            if step_info["new_duration"] >= 60.0:
                sla_breaches += 1
            done = terminated or truncated
    return sla_breaches, total_cost

def objective(trial):
    # Optuna intelligent hyperparameter suggestions
    lr = trial.suggest_loguniform("learning_rate", 1e-5, 1e-3)
    gamma = trial.suggest_categorical("gamma", [0.90, 0.95, 0.98, 0.99])
    ent_coef = trial.suggest_loguniform("ent_coef", 1e-8, 0.1)
    
    cat_model_path = os.path.join(base_dir, "../models/sla_model.cbm")
    catboost_model = CatBoostClassifier()
    catboost_model.load_model(cat_model_path)
    csv_path = os.path.join(base_dir, "../../dataset/Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv")
    daily_data = load_and_prepare_daily_data(csv_path, catboost_model=catboost_model)
    
    train_days = daily_data[:-20]
    test_days = daily_data[-20:]
    
    env = TrafficManagementEnv(daily_data=train_days)
    vec_env = DummyVecEnv([lambda: env])
    vec_env = VecNormalize(vec_env, norm_obs=True, norm_reward=True, clip_obs=10.0)
    
    model = MaskablePPO(
        "MlpPolicy", vec_env, verbose=0, learning_rate=lr, gamma=gamma, ent_coef=ent_coef, n_steps=1024
    )
    # Train for 20k steps per trial to keep optimization relatively fast
    model.learn(total_timesteps=20000)
    
    # Eval
    vec_env.training = False
    vec_env.norm_reward = False
    breaches, cost = evaluate_model(model, vec_env, TrafficManagementEnv(daily_data=test_days), test_days)
    
    baseline_breaches = 195  
    prevented = max(0, baseline_breaches - breaches)
    cost_per_prevented = cost / prevented if prevented > 0 else float('inf')
    prevention_rate = (prevented / baseline_breaches) * 100
    
    # Custom Optuna Objective
    score = prevention_rate - (0.75 * cost_per_prevented)
    
    if prevention_rate < 70.0:
        score -= 100.0
    if cost_per_prevented > 12.0:
        score -= 100.0
        
    return score

def tune_with_optuna():
    print("=== Optuna Hyperparameter Optimization ===")
    study = optuna.create_study(direction="maximize")
    study.optimize(objective, n_trials=10) # 10 intelligent trials
    
    print("\nBest Config found:")
    for key, value in study.best_trial.params.items():
        print(f"  {key}: {value}")
        
    df = study.trials_dataframe()
    df.to_csv(os.path.join(base_dir, "../optuna_results.csv"), index=False)
    print("Optuna study results saved to optuna_results.csv")
    
if __name__ == "__main__":
    tune_with_optuna()
