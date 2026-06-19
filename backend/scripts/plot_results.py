import matplotlib.pyplot as plt
import numpy as np
import os

base_dir = os.path.dirname(os.path.abspath(__file__))

def generate_plots(prevention_rates, costs_per_breach, action_counts):
    # 1. Breach Reduction Plot
    plt.figure(figsize=(10, 6))
    models = list(prevention_rates.keys())
    rates = list(prevention_rates.values())
    
    plt.bar(models, rates, color=['#e74c3c', '#f1c40f', '#3498db', '#2ecc71'])
    plt.title('SLA Breach Prevention Rate (%)', fontsize=14)
    plt.ylabel('Prevention Rate (%)')
    plt.ylim(0, 100)
    for i, v in enumerate(rates):
        plt.text(i, v + 2, f"{v:.1f}%", ha='center', fontweight='bold')
    plt.savefig(os.path.join(base_dir, 'prevention_plot.png'), dpi=300, bbox_inches='tight')
    plt.close()

    # 2. Cost Comparison Plot
    plt.figure(figsize=(10, 6))
    models_cost = list(costs_per_breach.keys())
    costs = list(costs_per_breach.values())
    
    plt.bar(models_cost, costs, color=['#e74c3c', '#f1c40f', '#3498db', '#2ecc71'])
    plt.title('Intervention Cost per Prevented Breach', fontsize=14)
    plt.ylabel('Cost Score')
    for i, v in enumerate(costs):
        plt.text(i, v + 0.5, f"{v:.2f}", ha='center', fontweight='bold')
    plt.savefig(os.path.join(base_dir, 'cost_plot.png'), dpi=300, bbox_inches='tight')
    plt.close()

    # 3. Action Distribution Pie Chart (for PPO Cost-Aware)
    plt.figure(figsize=(8, 8))
    labels = ['No Action', 'Reroute', 'Dispatch', 'Closure', 'Emergency']
    sizes = action_counts
    colors = ['#bdc3c7', '#3498db', '#9b59b6', '#e67e22', '#e74c3c']
    
    plt.pie(sizes, labels=labels, colors=colors, autopct='%1.1f%%', startangle=90)
    plt.title('MaskablePPO Action Distribution', fontsize=14)
    plt.savefig(os.path.join(base_dir, 'action_dist_plot.png'), dpi=300, bbox_inches='tight')
    plt.close()
    
    print("Plots generated successfully!")

if __name__ == "__main__":
    # Hardcoded results filled from the latest evaluation
    prevention_rates = {
        "Strong Rule-Based": 25.1,
        "PPO v1": 76.9,
        "Cost-Optimized PPO": 62.1,
        "Prev-Optimized PPO": 45.6 
    }
    
    costs_per_breach = {
        "Strong Rule-Based": 11.24,
        "PPO v1": 18.19,
        "Cost-Optimized PPO": 5.02,
        "Prev-Optimized PPO": 10.56 
    }
    
    action_counts = [119, 100, 63, 31, 43] # Cost-Optimized Action Dist
    
    generate_plots(prevention_rates, costs_per_breach, action_counts)
