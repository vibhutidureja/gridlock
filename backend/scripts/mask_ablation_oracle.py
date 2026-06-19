import os
import pandas as pd
import numpy as np
import sys
from catboost import CatBoostClassifier

base_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(base_dir, ".."))
sys.path.append(backend_dir)

from scripts.train_rl import load_and_prepare_daily_data

def get_valid_actions(risk, scenario):
    if scenario == "C":
        return [0, 1, 2, 3, 4]
    elif scenario == "B":
        if risk < 0.30: return [0, 1, 2]
        elif risk <= 0.60: return [0, 1, 2, 3]
        else: return [0, 1, 2, 3, 4]
    else: # Scenario A
        if risk < 0.30: return [0, 1]
        elif risk <= 0.60: return [0, 1, 2]
        else: return [0, 1, 2, 3, 4]

def get_modifier(action):
    if action == 1: return 0.8
    if action == 2: return 0.65
    if action == 3: return 0.45
    if action == 4: return 0.20
    return 1.0

def get_cost(action):
    if action == 1: return 5.0
    if action == 2: return 12.0
    if action == 3: return 20.0
    if action == 4: return 50.0
    return 0.0

def calculate_oracle_ceiling(test_days, scenario):
    global_frontier = {0: 0.0}
    rng = np.random.default_rng(42)
    
    for day_events in test_days:
        dp = {(0, 0): 0.0}
        for event in day_events:
            new_dp = {}
            risk = float(event.get('catboost_prob', 0.5))
            original_duration = float(event.get('estimated_duration', 60.0))
            valid_actions = get_valid_actions(risk, scenario)
            noise = rng.uniform(0.9, 1.1)
            
            for (c, b), cost in dp.items():
                for action in valid_actions:
                    mod = get_modifier(action)
                    c_float = c / 10.0
                    act_cost = get_cost(action)
                    new_duration = original_duration * mod * (1.0 + c_float * 0.5) * noise
                    
                    is_breach = new_duration > 60.0
                    new_b = b + (1 if is_breach else 0)
                    new_c = min(10, c + 2) if is_breach else max(0, c - 1)
                    new_cost = cost + act_cost
                    
                    state = (new_c, new_b)
                    if state not in new_dp or new_cost < new_dp[state]:
                        new_dp[state] = new_cost
            dp = new_dp
            
        day_frontier = {}
        for (c, b), cost in dp.items():
            if b not in day_frontier or cost < day_frontier[b]:
                day_frontier[b] = cost
                
        new_global = {}
        for b_g, cost_g in global_frontier.items():
            for b_d, cost_d in day_frontier.items():
                b_tot = b_g + b_d
                c_tot = cost_g + cost_d
                if b_tot not in new_global or c_tot < new_global[b_tot]:
                    new_global[b_tot] = c_tot
        global_frontier = new_global
        
    best_prevented = -1
    best_cost = 0
    baseline_breaches = 195
    
    # Unlimited budget
    for breaches, cost in global_frontier.items():
        prevented = baseline_breaches - breaches
        if prevented <= 0: continue
        cost_per_breach = cost / prevented
        
        if prevented > best_prevented:
            best_prevented = prevented
            best_cost = cost_per_breach
        elif prevented == best_prevented and cost_per_breach < best_cost:
            best_cost = cost_per_breach
            
    if best_prevented == -1:
        return 0.0, 0.0
    return (best_prevented / baseline_breaches) * 100, best_cost

def run_oracle():
    print("=== Mask Ablation Oracle Analysis ===")
    
    model_path = os.path.join(base_dir, "../models/sla_model.cbm")
    catboost_model = CatBoostClassifier()
    try:
        catboost_model.load_model(model_path)
    except Exception as e:
        print(f"Error loading CatBoost model: {e}")
        return

    csv_path = os.path.join(base_dir, "../../dataset/Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv")
    daily_data = load_and_prepare_daily_data(csv_path, catboost_model=catboost_model)
    test_days = daily_data[-20:]
    
    print("\nCalculating ceilings...")
    ceiling_A, cost_A = calculate_oracle_ceiling(test_days, "A")
    ceiling_B, cost_B = calculate_oracle_ceiling(test_days, "B")
    ceiling_C, cost_C = calculate_oracle_ceiling(test_days, "C")
    
    print(f"\n{'Scenario':<25} | {'Oracle Ceiling':<15} | {'Cost/Prevented'}")
    print("-" * 65)
    print(f"{'Scenario A (Strict)':<25} | {ceiling_A:>14.2f}% | {cost_A:>14.2f}")
    print(f"{'Scenario B (Relaxed)':<25} | {ceiling_B:>14.2f}% | {cost_B:>14.2f}")
    print(f"{'Scenario C (No Masks)':<25} | {ceiling_C:>14.2f}% | {cost_C:>14.2f}")

if __name__ == "__main__":
    run_oracle()
