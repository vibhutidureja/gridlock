import os
import json
import shutil

base_dir = os.path.dirname(os.path.abspath(__file__))
models_dir = os.path.abspath(os.path.join(base_dir, "../models"))

def freeze_model():
    print("Freezing Official Scenario C RL Model...")
    
    src_model = os.path.join(models_dir, "ppo_scenario_c.zip")
    src_vec = os.path.join(models_dir, "vec_normalize_c.pkl")
    
    dst_model = os.path.join(models_dir, "ppo_final.zip")
    dst_vec = os.path.join(models_dir, "vec_normalize_final.pkl")
    
    if os.path.exists(src_model) and os.path.exists(src_vec):
        shutil.copy2(src_model, dst_model)
        shutil.copy2(src_vec, dst_vec)
        print("Copied model and vector normalizer to final production names.")
    else:
        print("Error: Source files not found.")
        return
        
    config = {
        "model_name": "ppo_final",
        "version": "1.0.0",
        "description": "Final Production MaskablePPO Agent (Scenario C: No Masks)",
        "files": {
            "weights": "ppo_final.zip",
            "vec_normalize": "vec_normalize_final.pkl"
        },
        "environment": {
            "state_space": 14,
            "action_space": 5,
            "mask_scenario": "C",
            "reward_function": {
                "breach_prevented": 15.0,
                "flow_improvement": 0.3,
                "intervention_cost_penalty": -5.0,
                "explicit_action_penalties": {
                    "3": -2.0,
                    "4": -5.0
                }
            }
        },
        "hyperparameters": {
            "algorithm": "MaskablePPO",
            "policy": "MlpPolicy",
            "learning_rate": 0.0003,
            "n_steps": 1024,
            "batch_size": 64,
            "n_epochs": 10,
            "gamma": 0.95,
            "gae_lambda": 0.95,
            "clip_range": 0.2,
            "ent_coef": 0.0,
            "seed": 42
        },
        "training": {
            "total_timesteps": 100000,
            "hardware": "CPU"
        },
        "performance_metrics": {
            "prevention_rate": "60.00%",
            "cost_per_breach": 9.78,
            "theoretical_oracle_ceiling": "76.41%"
        }
    }
    
    config_path = os.path.join(models_dir, "final_model_config.json")
    with open(config_path, "w") as f:
        json.dump(config, f, indent=4)
        
    print(f"Generated final model configuration at: {config_path}")

if __name__ == "__main__":
    freeze_model()
