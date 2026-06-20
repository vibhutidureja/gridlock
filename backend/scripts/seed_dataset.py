import pandas as pd
import requests
import os

def seed_data():
    # Find CSV path relative to script directory
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    csv_path = os.path.join(base_dir, "dataset", "Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv")
    if not os.path.exists(csv_path):
        csv_path = os.path.join(os.getcwd(), "dataset", "Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv")
    if not os.path.exists(csv_path):
        print(f"Dataset not found at {csv_path}")
        return

    print("Loading dataset...")
    df = pd.read_csv(csv_path, low_memory=False)
    
    # Fill NA to avoid JSON errors
    df['event_type'] = df['event_type'].fillna("Unknown")
    df['priority'] = df['priority'].fillna("Low")
    df['zone'] = df['zone'].fillna("Unknown")
    
    # Take a sample of 20 events to populate the dashboard
    sample_df = df.sample(n=20, random_state=42)
    
    url = "http://localhost:8000/api/v1/events/"
    
    print("Seeding database with original dataset...")
    success_count = 0
    for idx, row in sample_df.iterrows():
        payload = {
            "event_type": str(row['event_type']),
            "priority": str(row['priority']),
            "zone": str(row['zone']),
            "road_closure": False
        }
        
        try:
            resp = requests.post(url, json=payload, timeout=5)
            if resp.status_code == 200:
                success_count += 1
            else:
                print(f"Failed to insert: {resp.text}")
        except Exception as e:
            print(f"Error: {e}")
            
    print(f"Successfully seeded {success_count} events from original dataset!")

if __name__ == '__main__':
    seed_data()
