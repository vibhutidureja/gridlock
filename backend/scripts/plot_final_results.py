import os
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np

# Set aesthetic style
sns.set_theme(style="whitegrid")
plt.rcParams.update({'font.size': 12})

base_dir = os.path.dirname(os.path.abspath(__file__))
charts_dir = os.path.abspath(os.path.join(base_dir, "../../charts"))
os.makedirs(charts_dir, exist_ok=True)

# Data
models = [
    "Rule-Based",
    "PPO v1 (Unoptimized)",
    "Cost-Optimized PPO",
    "Feature-Enriched PPO",
    "Scenario C (Final)"
]
prevention = [25.10, 68.10, 42.60, 44.60, 60.00]
cost_per_breach = [11.24, 15.30, 8.99, 7.45, 9.78]

def plot_prevention_comparison():
    plt.figure(figsize=(10, 6))
    colors = sns.color_palette("Blues_d", len(models))
    # Highlight final model
    colors[-1] = sns.color_palette("Set1")[1]
    
    ax = sns.barplot(x=models, y=prevention, palette=colors)
    plt.title('Prevention Rate Comparison Across Iterations', fontsize=16, pad=15)
    plt.ylabel('Prevention Rate (%)', fontsize=14)
    plt.xticks(rotation=45, ha='right')
    plt.ylim(0, 100)
    
    for i, p in enumerate(ax.patches):
        ax.annotate(f"{prevention[i]:.1f}%", 
                    (p.get_x() + p.get_width() / 2., p.get_height()), 
                    ha='center', va='bottom', fontsize=12, xytext=(0, 5), 
                    textcoords='offset points')
        
    plt.tight_layout()
    plt.savefig(os.path.join(charts_dir, "prevention_comparison.png"), dpi=300)
    plt.close()

def plot_cost_comparison():
    plt.figure(figsize=(10, 6))
    colors = sns.color_palette("Greens_d", len(models))
    colors[-1] = sns.color_palette("Set1")[1]
    
    ax = sns.barplot(x=models, y=cost_per_breach, palette=colors)
    plt.title('Cost Efficiency Comparison Across Iterations', fontsize=16, pad=15)
    plt.ylabel('Cost per Prevented Breach', fontsize=14)
    plt.xticks(rotation=45, ha='right')
    
    for i, p in enumerate(ax.patches):
        ax.annotate(f"{cost_per_breach[i]:.2f}", 
                    (p.get_x() + p.get_width() / 2., p.get_height()), 
                    ha='center', va='bottom', fontsize=12, xytext=(0, 5), 
                    textcoords='offset points')
                    
    plt.tight_layout()
    plt.savefig(os.path.join(charts_dir, "cost_comparison.png"), dpi=300)
    plt.close()

def plot_oracle_gap():
    scenarios = ["Scenario A", "Scenario B", "Scenario C"]
    oracle_ceilings = [46.67, 55.90, 76.41]
    ppo_performance = [43.08, 50.26, 60.00]
    
    x = np.arange(len(scenarios))
    width = 0.35
    
    fig, ax = plt.subplots(figsize=(10, 6))
    rects1 = ax.bar(x - width/2, oracle_ceilings, width, label='Oracle Ceiling (DP limit)', color='lightcoral')
    rects2 = ax.bar(x + width/2, ppo_performance, width, label='MaskablePPO Performance', color='steelblue')
    
    ax.set_ylabel('Prevention Rate (%)', fontsize=14)
    ax.set_title('Oracle Ceiling vs. RL Performance', fontsize=16, pad=15)
    ax.set_xticks(x)
    ax.set_xticklabels(scenarios)
    ax.legend()
    ax.set_ylim(0, 100)
    
    for rect in rects1:
        height = rect.get_height()
        ax.annotate(f'{height:.1f}%', xy=(rect.get_x() + rect.get_width() / 2, height),
                    xytext=(0, 3), textcoords="offset points", ha='center', va='bottom')
    for rect in rects2:
        height = rect.get_height()
        ax.annotate(f'{height:.1f}%', xy=(rect.get_x() + rect.get_width() / 2, height),
                    xytext=(0, 3), textcoords="offset points", ha='center', va='bottom')
                    
    plt.tight_layout()
    plt.savefig(os.path.join(charts_dir, "oracle_vs_ppo_gap.png"), dpi=300)
    plt.close()

def plot_mask_ablation():
    # Tradeoff curve of Cost vs Prevention
    plt.figure(figsize=(9, 6))
    
    x_oracle = [21.37, 19.72, 22.09]
    y_oracle = [46.67, 55.90, 76.41]
    
    x_ppo = [7.57, 8.97, 9.78]
    y_ppo = [43.08, 50.26, 60.00]
    
    plt.plot(x_oracle, y_oracle, 'ro-', label='Oracle Pareto Front', markersize=10, linewidth=2)
    plt.plot(x_ppo, y_ppo, 'bs-', label='PPO Pareto Front', markersize=10, linewidth=2)
    
    labels = ["Scenario A", "Scenario B", "Scenario C"]
    for i, txt in enumerate(labels):
        plt.annotate(txt, (x_oracle[i], y_oracle[i]), textcoords="offset points", xytext=(0,10), ha='center', color='red')
        plt.annotate(txt, (x_ppo[i], y_ppo[i]), textcoords="offset points", xytext=(0,10), ha='center', color='blue')
        
    plt.title('Mask Ablation Results: Cost vs. Prevention Tradeoff', fontsize=16, pad=15)
    plt.xlabel('Cost per Prevented Breach', fontsize=14)
    plt.ylabel('Prevention Rate (%)', fontsize=14)
    plt.legend()
    plt.grid(True, linestyle='--', alpha=0.7)
    
    plt.tight_layout()
    plt.savefig(os.path.join(charts_dir, "mask_ablation_results.png"), dpi=300)
    plt.close()

def plot_action_distribution():
    # Approximate action counts from logs for Cost-Optimized vs Unoptimized
    actions = ["No Action", "Reroute", "Traffic Police", "Road Closure", "Emergency"]
    unoptimized = [15, 20, 25, 25, 15]
    optimized = [35, 30, 20, 10, 5]
    
    x = np.arange(len(actions))
    width = 0.35
    
    fig, ax = plt.subplots(figsize=(10, 6))
    rects1 = ax.bar(x - width/2, unoptimized, width, label='Unoptimized PPO (%)', color='lightcoral')
    rects2 = ax.bar(x + width/2, optimized, width, label='Final Optimized PPO (%)', color='seagreen')
    
    ax.set_ylabel('Percentage of Time Selected (%)', fontsize=14)
    ax.set_title('Action Distribution Shift (Unoptimized vs Final)', fontsize=16, pad=15)
    ax.set_xticks(x)
    ax.set_xticklabels(actions)
    ax.legend()
    
    plt.tight_layout()
    plt.savefig(os.path.join(charts_dir, "action_distribution.png"), dpi=300)
    plt.close()

if __name__ == "__main__":
    plot_prevention_comparison()
    plot_cost_comparison()
    plot_oracle_gap()
    plot_mask_ablation()
    plot_action_distribution()
    print("Generated all charts in /charts directory.")
