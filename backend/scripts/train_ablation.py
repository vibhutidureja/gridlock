import os
import sys
from catboost import CatBoostClassifier
from sb3_contrib import MaskablePPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
from stable_baselines3.common.utils import set_random_seed

base_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(base_dir, ".."))
sys.path.append(backend_dir)

from app.rl.traffic_env import TrafficManagementEnv
from scripts.train_rl import load_and_prepare_daily_data

def train_scenario(scenario_name, daily_data):
    print(f"\n{'='*60}")
    print(f"Training PPO Agent for Mask Scenario {scenario_name}")
    print(f"{'='*60}")
    
    set_random_seed(42)
    
    env = TrafficManagementEnv(daily_data=daily_data, mask_scenario=scenario_name)
    vec_env = DummyVecEnv([lambda: env])
    vec_env = VecNormalize(vec_env, norm_obs=True, norm_reward=True, clip_obs=10.)
    
    # Best params from our previous Optuna tuning
    model = MaskablePPO(
        "MlpPolicy",
        vec_env,
        learning_rate=0.0003,
        n_steps=1024,
        batch_size=64,
        n_epochs=10,
        gamma=0.95,
        gae_lambda=0.95,
        clip_range=0.2,
        ent_coef=0.0,
        verbose=1,
        seed=42
    )
    
    model.learn(total_timesteps=100000)
    
    model_path = os.path.join(base_dir, f"../models/ppo_scenario_{scenario_name.lower()}.zip")
    vec_path = os.path.join(base_dir, f"../models/vec_normalize_{scenario_name.lower()}.pkl")
    
    model.save(model_path)
    vec_env.save(vec_path)
    print(f"Saved Scenario {scenario_name} model and normalization stats.")

if __name__ == "__main__":
    cat_model_path = os.path.join(base_dir, "../models/sla_model.cbm")
    catboost_model = CatBoostClassifier()
    try:
        catboost_model.load_model(cat_model_path)
    except:
        print("Catboost not found")
        sys.exit(1)
        
    csv_path = os.path.join(base_dir, "../../dataset/Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv")
    daily_data = load_and_prepare_daily_data(csv_path, catboost_model=catboost_model)
    
    # We already have A as `ppo_feature_agent.zip`. Let's just train B and C.
    train_scenario("B", daily_data)
    train_scenario("C", daily_data)
