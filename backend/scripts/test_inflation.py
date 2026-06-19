import numpy as np

# Simulate the bug
# We have 20 test days. Let's assume each day has a true number of natural baseline breaches.
true_breaches_per_day = [12, 8, 15, 6, 9, 10, 11, 7, 14, 8, 13, 9, 7, 10, 11, 12, 8, 14, 11, 10]
# Sum is exactly 195
assert sum(true_breaches_per_day) == 195

print("True Baseline Breaches (All 20 days):", sum(true_breaches_per_day))

# Let's say the Oracle has a 46% prevention rate. So it prevents 46% of breaches on any day.
agent_breach_rate = 1.0 - 0.46

np.random.seed(42)

for run in range(5):
    # Old evaluate_rl.py randomly sampled 20 days WITH replacement!
    sampled_indices = np.random.choice(20, size=20, replace=True)
    sampled_true_breaches = [true_breaches_per_day[i] for i in sampled_indices]
    
    actual_natural_breaches = sum(sampled_true_breaches)
    
    # Agent plays on these days. It lets 54% of breaches slip through.
    agent_breaches = int(actual_natural_breaches * agent_breach_rate)
    
    # The BUG: The script hardcoded 195 as the baseline!
    hardcoded_prevented = 195 - agent_breaches
    inflated_prevention_rate = hardcoded_prevented / 195.0
    
    print(f"\nRun {run+1}:")
    print(f"Sampled actual natural breaches: {actual_natural_breaches}")
    print(f"Agent's breaches on these days: {agent_breaches}")
    print(f"Calculated 'Prevented' (195 - {agent_breaches}): {hardcoded_prevented}")
    print(f"Reported Prevention %: {inflated_prevention_rate * 100:.1f}%")
