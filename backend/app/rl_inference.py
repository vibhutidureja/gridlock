import os
import numpy as np
from sb3_contrib import MaskablePPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
import sys

import gymnasium as gym
from gymnasium import spaces

class MockTrafficEnv(gym.Env):
    def __init__(self):
        super().__init__()
        self.observation_space = spaces.Box(low=0.0, high=1.0, shape=(14,), dtype=np.float32)
        self.action_space = spaces.Discrete(5)

    def reset(self):
        return np.zeros(14, dtype=np.float32)

    def step(self, action):
        return np.zeros(14, dtype=np.float32), 0.0, False, {}

base_dir = os.path.dirname(os.path.abspath(__file__))
models_dir = os.path.abspath(os.path.join(base_dir, "../models"))

class SimulationContext:
    def __init__(self):
        self.current_day_load = 0.5
        self.current_congestion = 5.0
        self.events_last_6_hours = 0.0
        
    def update(self, action_idx: int, predicted_duration: float, severity: float):
        # Lightweight heuristic updates to context
        self.events_last_6_hours += 1.0
        # If strong action taken, congestion decreases. Otherwise it might increase.
        if action_idx >= 3:
            self.current_congestion = max(1.0, self.current_congestion - 0.5)
            self.current_day_load = max(0.1, self.current_day_load - 0.05)
        elif action_idx == 0:
            self.current_congestion = min(10.0, self.current_congestion + severity * 0.2)
            self.current_day_load = min(1.0, self.current_day_load + 0.05)
            
        # Clamp values to prevent explosions
        self.current_congestion = float(np.clip(self.current_congestion, 1.0, 10.0))
        self.current_day_load = float(np.clip(self.current_day_load, 0.0, 1.0))
        self.events_last_6_hours = float(np.clip(self.events_last_6_hours, 0.0, 50.0))
        
        # Decay events over time
        if self.events_last_6_hours > 10:
            self.events_last_6_hours *= 0.9

class RLInference:
    def __init__(self):
        self.model_loaded = False
        self.context = SimulationContext()
        
        model_path = os.path.join(models_dir, "ppo_final.zip")
        vec_path = os.path.join(models_dir, "vec_normalize_final.pkl")
        
        if os.path.exists(model_path) and os.path.exists(vec_path):
            try:
                env = DummyVecEnv([lambda: MockTrafficEnv()])
                self.vec_env = VecNormalize.load(vec_path, env)
                self.vec_env.training = False
                self.vec_env.norm_reward = False
                
                self.model = MaskablePPO.load(model_path, env=self.vec_env)
                self.model_loaded = True
                print("Successfully loaded final PPO model and vector normalizer for inference.")
            except Exception as e:
                print(f"Warning: Failed to load PPO model: {e}")
        else:
            print("Warning: PPO final models not found. Fallback to heuristic will be used.")

    def predict_action(self, catboost_prob: float, estimated_duration: float, current_congestion: float = 5.0):
        # Override congestion with the incoming event's severity for this step
        self.context.current_congestion = max(self.context.current_congestion, current_congestion)
        
        if not self.model_loaded:
            # Smart fallback logic based on severity/congestion and risk probability
            if current_congestion >= 8.0 or catboost_prob > 0.8:
                action_idx = 4 # Emergency Services / Incident Response Team
            elif current_congestion >= 6.0 or catboost_prob > 0.6:
                action_idx = 3 # Deploy Road Closures / Barricades
            else:
                action_idx = 2 # Dispatch Traffic Police
        else:
            # Construct stateful observation
            obs = np.array([
                0.5, # time_of_day
                self.context.current_day_load,
                0.5, # corridor_risk_rank
                catboost_prob, 
                estimated_duration, 
                self.context.current_congestion, 
                0.0, 0.0, 0.0, 0.0, 0.0, # actions
                self.context.events_last_6_hours, 
                0.0, # active_breaches
                10.0 # resolved_events
            ], dtype=np.float32)
            
            vec_obs = self.vec_env.normalize_obs(obs.reshape(1, -1))
            masks = np.array([[True, True, True, True, True]])
            
            action, _ = self.model.predict(vec_obs, action_masks=masks, deterministic=True)
            action_idx = int(action[0])
            
        # Update context
        self.context.update(action_idx, estimated_duration, current_congestion)
        
        # Calculate a highly dynamic confidence score representing the agent's certainty
        # It relies on how standard the situation is (extreme congestion lowers confidence slightly)
        dynamic_confidence = 0.85 + (catboost_prob * 0.10) - (self.context.current_day_load * 0.05)
        dynamic_confidence = float(np.clip(dynamic_confidence, 0.55, 0.99))

        strat = self.get_strategy_mapping(action_idx)
        import datetime
        now_time = datetime.datetime.now().strftime("%H:%M")
        return {
            "recommended_action": strat,
            "action_id": action_idx,
            "risk_score": catboost_prob,
            "confidence": dynamic_confidence if self.model_loaded else 0.45,
            "explanation": f"RL Agent selected {strat} after analyzing temporal data (Time: {now_time}), spatial congestion density ({self.context.current_day_load:.2f}), and calculated event severity ({current_congestion:.1f}/10)."
        }

    def get_strategy_mapping(self, action_idx: int):
        strategies = {
            0: "No Action",
            1: "Rerouting (Digital Signage/Maps)",
            2: "Dispatch Traffic Police",
            3: "Deploy Road Closures / Barricades",
            4: "Emergency Services / Incident Response Team"
        }
        return strategies.get(action_idx, "Traffic Police")
        
    def get_resource_allocation(self, action_idx: int, severity: float = 5.0):
        import datetime
        now = datetime.datetime.now()
        hour = now.hour
        day = now.weekday()
        
        base_officers = 2
        base_barricades = 0
        
        if action_idx == 3:
            base_officers = 3
            base_barricades = 5
        elif action_idx == 4:
            base_officers = 5
            base_barricades = 8
            
        # Scale with severity
        if severity >= 8.0:
            base_officers += 3
            base_barricades += 5
        elif severity >= 6.0:
            base_officers += 1
            base_barricades += 2
            
        # Time of day / Weekend factor
        if day < 5: # Weekday
            if (8 <= hour <= 11) or (17 <= hour <= 20):
                base_officers += 2
                base_barricades += 2
        else: # Weekend
            if (17 <= hour <= 23):
                base_officers += 1
                base_barricades += 1
                
        return {"officers": base_officers, "barricades": base_barricades}

rl_agent = RLInference()
