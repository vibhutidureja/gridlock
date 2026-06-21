import os
import sys
import pandas as pd
from sqlalchemy import create_engine, text
from neo4j import GraphDatabase

# Add parent dir to path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import DATABASE_URL
from app.models import Base
from app.routers.events import ZONE_COORDS
try:
    from app.ml_engine import ml_engine
except ImportError:
    ml_engine = None

def reset_postgres():
    print(f"Connecting to PostgreSQL database at {DATABASE_URL}...")
    engine = create_engine(DATABASE_URL)
    with engine.begin() as conn:
        print("Clearing PostgreSQL tables...")
        if DATABASE_URL.startswith("sqlite"):
            conn.execute(text("DELETE FROM simulated_interventions;"))
            conn.execute(text("DELETE FROM traffic_events;"))
        else:
            conn.execute(text("TRUNCATE TABLE simulated_interventions CASCADE;"))
            conn.execute(text("TRUNCATE TABLE traffic_events CASCADE;"))
        print("Successfully cleared SQL tables!")

def reset_neo4j():
    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    # For inside docker container, if bolt://localhost fails, try Bolt to the container name
    if "docker" in os.getenv("PATH", "") or not os.path.exists("C:\\Windows"):
        uri = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
    user = os.getenv("NEO4J_USER", "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "password")
    
    print(f"Connecting to Neo4j database at {uri}...")
    driver = GraphDatabase.driver(uri, auth=(user, password))
    
    seed_query = """
    MATCH (n) DETACH DELETE n;
    
    CREATE (e1:Event {id: 'evt-001', type: 'Accident', zone: 'Central', severity: 8.5})
    CREATE (e2:Event {id: 'evt-002', type: 'Breakdown', zone: 'Hebbal', severity: 6.0})
    CREATE (e3:Event {id: 'evt-003', type: 'Traffic Jam', zone: 'Central', severity: 7.2})
    CREATE (e4:Event {id: 'evt-004', type: 'Accident', zone: 'Indiranagar', severity: 9.0})
    
    CREATE (i1:Intervention {id: 'int-001', strategy_name: 'Deploy Officers + Upstream Diversion', impact_reduction: 45.0, resources: '4 Officers, 2 Barricades'})
    CREATE (i2:Intervention {id: 'int-002', strategy_name: 'Barricades Only', impact_reduction: 20.0, resources: '0 Officers, 4 Barricades'})
    CREATE (i3:Intervention {id: 'int-003', strategy_name: 'Signal Timing Adjustment', impact_reduction: 30.0, resources: '0 Officers, 0 Barricades'})
    CREATE (i4:Intervention {id: 'int-004', strategy_name: 'Tow Truck + Police Escort', impact_reduction: 60.0, resources: '1 Tow Truck, 2 Officers'})
    CREATE (i5:Intervention {id: 'int-005', strategy_name: 'Ambulance + Reroute Traffic', impact_reduction: 55.0, resources: '1 Ambulance, VMS Update'})
    
    CREATE (e1)-[:MITIGATED_BY {success_flag: true, time_saved_mins: 40}]->(i1)
    CREATE (e2)-[:MITIGATED_BY {success_flag: true, time_saved_mins: 15}]->(i2)
    CREATE (e3)-[:MITIGATED_BY {success_flag: true, time_saved_mins: 25}]->(i3)
    CREATE (e4)-[:MITIGATED_BY {success_flag: false, time_saved_mins: 5}]->(i2)
    CREATE (e4)-[:MITIGATED_BY {success_flag: true, time_saved_mins: 50}]->(i1)
    """
    try:
        with driver.session() as session:
            statements = [s.strip() for s in seed_query.split(";") if s.strip()]
            for statement in statements:
                # Remove comments
                lines = [l for l in statement.split("\n") if not l.strip().startswith("//")]
                clean_statement = "\n".join(lines).strip()
                if clean_statement:
                    session.run(clean_statement)
            print("Successfully reset and seeded Neo4j!")
    except Exception as e:
        print(f"Failed to reset/seed Neo4j: {e}")
    finally:
        driver.close()

def seed_postgres():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    csv_path = os.path.join(base_dir, "dataset", "Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv")
    if not os.path.exists(csv_path):
        csv_path = os.path.join(os.getcwd(), "dataset", "Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv")
    if not os.path.exists(csv_path):
        print(f"Dataset not found at {csv_path}, skipping SQL seed")
        return
        
    print("Loading dataset for PostgreSQL seeding...")
    df = pd.read_csv(csv_path, low_memory=False)
    
    df['event_type'] = df['event_type'].fillna("Unknown")
    df['priority'] = df['priority'].fillna("Low")
    df['zone'] = df['zone'].fillna("Unknown")
    
    sample_df = df.sample(n=8, random_state=42)
    
    engine = create_engine(DATABASE_URL)
    
    import uuid
    import datetime
    import random
    import re
    from app.models import TrafficEvent
    from sqlalchemy.orm import sessionmaker
    
    Session = sessionmaker(bind=engine)
    session = Session()
    
    success_count = 0
    try:
        for idx, row in sample_df.iterrows():
            event_type = str(row['event_type'])
            priority = str(row['priority'])
            zone = str(row['zone'])
            
            mapped_zone = "Central"
            matched = False
            for k in ZONE_COORDS.keys():
                if k.lower() in zone.lower():
                    mapped_zone = k
                    matched = True
                    break
            
            if not matched:
                mapped_zone = random.choice(list(ZONE_COORDS.keys()))
            
            try:
                if ml_engine is not None:
                    pred = ml_engine.predict(event_type, priority, mapped_zone, False)
                    sev = pred.get("predicted_severity", 5.0)
                    res_time = pred.get("predicted_resolution_time_mins", 60)
                else:
                    sev = 5.0
                    res_time = 60
            except Exception:
                sev = 5.0
                res_time = 60

            # Predefined list of known, highly valid road intersections in Bangalore
            # (MG Road, Silk Board, Hebbal, Indiranagar, Koramangala, Majestic, E-City, Whitefield)
            valid_road_coords = [
                "POINT(77.606800 12.974700)",
                "POINT(77.622500 12.917600)",
                "POINT(77.588800 13.038200)",
                "POINT(77.638900 12.978400)",
                "POINT(77.625300 12.936500)",
                "POINT(77.573600 12.976600)",
                "POINT(77.662200 12.848800)",
                "POINT(77.747100 12.983000)"
            ]
            
            location = valid_road_coords[success_count % len(valid_road_coords)]
            
            db_event = TrafficEvent(
                id=str(uuid.uuid4()),
                event_type=event_type,
                priority=priority,
                zone=mapped_zone,
                road_closure=False,
                predicted_severity=sev,
                predicted_resolution_time_mins=res_time,
                location=location,
                created_at=datetime.datetime.utcnow()
            )
            session.add(db_event)
            success_count += 1
            
        session.commit()
        print(f"Successfully seeded {success_count} events from original dataset into PostgreSQL!")
    except Exception as e:
        session.rollback()
        print(f"Failed to seed PostgreSQL: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    print("=== STARTING DATABASE RESET & SEED ===")
    reset_postgres()
    reset_neo4j()
    seed_postgres()
    print("=== DATABASE RESET & SEED COMPLETE ===")
