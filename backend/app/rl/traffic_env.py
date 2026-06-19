import gymnasium as gym
from gymnasium import spaces
import numpy as np

class TrafficManagementEnv(gym.Env):
    metadata = {"render_modes": ["human"]}

    def __init__(self, daily_data=None, mask_scenario="A"):
        super(TrafficManagementEnv, self).__init__()
        
        self.daily_data = daily_data if daily_data is not None else []
        self.mask_scenario = mask_scenario
        
        # State: 14 continuous features
        # [catboost_prob, original_duration, priority, truck_age, route_distance, 
        #  hour, day_of_week, traffic_density, current_congestion, 
        #  corridor_event_count, corridor_avg_duration, corridor_breach_rate,
        #  current_day_load, corridor_risk_rank]
        self.observation_space = spaces.Box(low=-np.inf, high=np.inf, shape=(14,), dtype=np.float32)

        self.action_space = spaces.Discrete(5)

        self.action_effects = {
            0: {"duration_mod": 1.0, "congestion_mod": 1.0, "cost": 0},
            1: {"duration_mod": 0.8, "congestion_mod": 0.85, "cost": 1},
            2: {"duration_mod": 0.6, "congestion_mod": 0.75, "cost": 2},
            3: {"duration_mod": 0.4, "congestion_mod": 0.60, "cost": 4},
            4: {"duration_mod": 0.2, "congestion_mod": 0.40, "cost": 6},
        }

        self.MAX_EVENTS_PER_DAY = 100
        self.current_day_events = []
        self.current_event_idx = 0
        self.current_congestion = 0.0

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        
        if len(self.daily_data) > 0:
            idx = self.np_random.integers(0, len(self.daily_data))
            self.current_day_events = self.daily_data[idx]
        else:
            self.current_day_events = [self._generate_dummy_data() for _ in range(10)]

        self.current_event_idx = 0
        self.current_congestion = 0.0 # Base congestion at start of day
        
        return self._get_obs(), {}

    def step(self, action):
        event = self.current_day_events[self.current_event_idx]
        
        original_duration = float(event.get('estimated_duration', 60.0))
        catboost_prob = float(event.get('catboost_prob', 0.5))
        
        # 1. Action Effects
        effect = self.action_effects[int(action)]
        new_duration = original_duration * effect["duration_mod"]
        
        # 2. Dynamic Congestion updates
        priority_map = {"Low": 1.0, "Medium": 1.5, "High": 2.0}
        p_val = priority_map.get(event.get("priority", "Medium"), 1.5)
        
        event_load = (original_duration / 60.0) * p_val * float(event.get("traffic_density", 0.5))
        self.current_congestion = (self.current_congestion * 0.8) + (event_load * effect["congestion_mod"])
        
        # 3. Reward Calculation (Cost-Aware formulation)
        traffic_flow_improvement = original_duration - new_duration
        intervention_cost = effect["cost"]
        
        breach_prevented = 1.0 if (catboost_prob > 0.7 and new_duration < 60.0) else 0.0
        
        reward = (25.0 * breach_prevented) + (0.3 * traffic_flow_improvement) - (3.0 * intervention_cost)
        
        if int(action) == 4:
            reward -= 5.0
        if int(action) == 3:
            reward -= 2.0
        
        info = {
            "original_duration": original_duration,
            "new_duration": new_duration,
            "cost": intervention_cost,
            "catboost_prob": catboost_prob,
            "is_masked": not self.action_masks()[int(action)]
        }
        
        # 4. Advance Step
        self.current_event_idx += 1
        
        terminated = (self.current_event_idx >= len(self.current_day_events))
        truncated = (self.current_event_idx >= self.MAX_EVENTS_PER_DAY)
        
        if terminated or truncated:
            obs = np.zeros(14, dtype=np.float32)
        else:
            obs = self._get_obs()
            
        return obs, reward, terminated, truncated, info

    def action_masks(self):
        """
        Returns a boolean array of valid actions based on CatBoost risk.
        Risk < 0.30: Allowed = [0, 1]
        Risk 0.30-0.60: Allowed = [0, 1, 2]
        Risk > 0.60: Allowed = [0, 1, 2, 3, 4]
        """
        if self.current_event_idx >= len(self.current_day_events):
            return np.array([True, True, True, True, True])
            
        event = self.current_day_events[self.current_event_idx]
        risk = float(event.get('catboost_prob', 0.5))
        
        if self.mask_scenario == "C":
            return np.array([True, True, True, True, True])
            
        elif self.mask_scenario == "B":
            if risk < 0.30:
                return np.array([True, True, True, False, False])
            elif risk <= 0.60:
                return np.array([True, True, True, True, False])
            else:
                return np.array([True, True, True, True, True])
                
        else: # Scenario A (Strict)
            if risk < 0.30:
                return np.array([True, True, False, False, False])
            elif risk <= 0.60:
                return np.array([True, True, True, False, False])
            else:
                return np.array([True, True, True, True, True])

    def _get_obs(self):
        event = self.current_day_events[self.current_event_idx]
        
        priority_map = {"Low": 0.0, "Medium": 1.0, "High": 2.0}
        
        obs = np.array([
            float(event.get("catboost_prob", 0.5)),
            float(event.get("estimated_duration", 60.0)),
            priority_map.get(event.get("priority", "Medium"), 1.0),
            float(event.get("truck_age", 5.0)),
            float(event.get("route_distance", 10.0)),
            float(event.get("hour", 12.0)),
            float(event.get("day_of_week", 2.0)),
            float(event.get("traffic_density", 0.5)),
            self.current_congestion,
            float(event.get("corridor_event_count", 0.5)),
            float(event.get("corridor_avg_duration", 60.0)),
            float(event.get("corridor_breach_rate", 0.5)),
            float(event.get("current_day_load", 0.5)),
            float(event.get("corridor_risk_rank", 0.5))
        ], dtype=np.float32)
        
        return obs

    def _generate_dummy_data(self):
        return {
            "estimated_duration": np.random.uniform(30, 120),
            "traffic_density": np.random.uniform(0.1, 1.0),
            "priority": np.random.choice(["Low", "Medium", "High"]),
            "truck_age": np.random.uniform(0, 20),
            "route_distance": np.random.uniform(1, 50),
            "hour": np.random.randint(0, 24),
            "day_of_week": np.random.randint(0, 7),
            "catboost_prob": np.random.uniform(0, 1),
            "corridor_event_count": 0.5,
            "corridor_avg_duration": 60.0,
            "corridor_breach_rate": 0.5
        }
