import os
import pandas as pd
import numpy as np
import sys
from catboost import CatBoostClassifier

base_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(base_dir, ".."))
sys.path.append(backend_dir)

from scripts.train_rl import load_and_prepare_daily_data

def get_valid_actions(risk):
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

def run_oracle():
    print("=== Budget-Constrained Oracle Analysis (Exact DP) ===")
    
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
    
    test_days = daily_data[-20:]
    baseline_breaches = 195
    
    print("\nSolving Exact Dynamic Programming for 20 Test Days...")
    
    # global_frontier maps `total_breaches` to `min_cost`
    global_frontier = {0: 0.0}
    
    # Pre-generate noise for deterministic alignment
    rng = np.random.default_rng(42)
    
    for day_idx, day_events in enumerate(test_days):
        # dp state: (congestion_level (0-10), breaches) -> min_cost
        dp = {(0, 0): 0.0}
        
        for step_idx, event in enumerate(day_events):
            new_dp = {}
            risk = float(event.get('catboost_prob', 0.5))
            original_duration = float(event.get('estimated_duration', 60.0))
            valid_actions = get_valid_actions(risk)
            
            # Use fixed noise
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
            
        # day_frontier maps `b` to `min_cost`
        day_frontier = {}
        for (c, b), cost in dp.items():
            if b not in day_frontier or cost < day_frontier[b]:
                day_frontier[b] = cost
                
        # merge with global
        new_global = {}
        for b_g, cost_g in global_frontier.items():
            for b_d, cost_d in day_frontier.items():
                b_tot = b_g + b_d
                c_tot = cost_g + cost_d
                if b_tot not in new_global or c_tot < new_global[b_tot]:
                    new_global[b_tot] = c_tot
        global_frontier = new_global
    
    print("\nDP Complete. Calculating Pareto Limits...\n")
    
    # Analyze Budgets
    budgets = [8, 10, 12, 15, float('inf')]
    
    # We want to maximize `prevented` subject to `cost / prevented <= budget`
    
    print(f"{'Budget Limit':<15} | {'Max Prevention %':<20} | {'Breaches':<10} | {'Cost/Breach':<15}")
    print("-" * 65)
    
    results = {}
    
    for budget in budgets:
        best_prevented = -1
        best_cost = 0
        best_breaches = baseline_breaches
        
        for breaches, cost in global_frontier.items():
            prevented = baseline_breaches - breaches
            if prevented <= 0:
                continue
                
            cost_per_breach = cost / prevented
            
            if cost_per_breach <= budget:
                if prevented > best_prevented:
                    best_prevented = prevented
                    best_cost = cost_per_breach
                    best_breaches = breaches
                elif prevented == best_prevented and cost_per_breach < best_cost:
                    best_cost = cost_per_breach
                    
        if best_prevented == -1:
            prev_pct = "0.0%"
            c_p_str = "N/A"
            b_str = str(baseline_breaches)
        else:
            prev_pct = f"{(best_prevented / baseline_breaches)*100:.2f}%"
            c_p_str = f"{best_cost:.2f}"
            b_str = str(best_breaches)
            
        b_label = "Unlimited" if budget == float('inf') else f"Cost <= {budget}"
        print(f"{b_label:<15} | {prev_pct:<20} | {b_str:<10} | {c_p_str:<15}")
        results[budget] = prev_pct
        
    print("\n--- Model Comparison ---")
    print(f"{'Policy':<25} | {'Prevention %':<15} | {'Cost/Prevented'}")
    print("-" * 60)
    print(f"{'Strong Rule Based':<25} | {'25.10%':<15} | 11.24")
    print(f"{'Cost-Optimized PPO':<25} | {'42.60%':<15} | 8.99")
    print(f"{'Feature-Enriched PPO':<25} | {'44.60%':<15} | 7.45")
    
    oracle_12 = results.get(12, "0.0%")
    print(f"{'Oracle @ Cost <= 12':<25} | {oracle_12:<15} | <= 12.00")
    print(f"{'Absolute Oracle Ceiling':<25} | {results.get(float('inf')):<15} | Unlimited")

if __name__ == "__main__":
    run_oracle()
