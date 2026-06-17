import os
from neo4j import GraphDatabase

uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
user = os.getenv("NEO4J_USER", "neo4j")
password = os.getenv("NEO4J_PASSWORD", "password")

driver = GraphDatabase.driver(uri, auth=(user, password))

seed_query = """
// Clear existing dummy data if any
MATCH (n) DETACH DELETE n;

// Create Events
CREATE (e1:Event {id: 'evt-001', type: 'Accident', zone: 'Central', severity: 8.5})
CREATE (e2:Event {id: 'evt-002', type: 'Breakdown', zone: 'North', severity: 6.0})
CREATE (e3:Event {id: 'evt-003', type: 'Traffic Jam', zone: 'Central', severity: 7.2})
CREATE (e4:Event {id: 'evt-004', type: 'Accident', zone: 'South', severity: 9.0})

// Create Interventions
CREATE (i1:Intervention {id: 'int-001', strategy_name: 'Deploy Officers + Upstream Diversion', impact_reduction: 45.0, resources: '4 Officers, 2 Barricades'})
CREATE (i2:Intervention {id: 'int-002', strategy_name: 'Barricades Only', impact_reduction: 20.0, resources: '0 Officers, 4 Barricades'})
CREATE (i3:Intervention {id: 'int-003', strategy_name: 'Signal Timing Adjustment', impact_reduction: 30.0, resources: '0 Officers, 0 Barricades'})

// Create Relationships
CREATE (e1)-[:MITIGATED_BY {success_flag: true, time_saved_mins: 40}]->(i1)
CREATE (e2)-[:MITIGATED_BY {success_flag: true, time_saved_mins: 15}]->(i2)
CREATE (e3)-[:MITIGATED_BY {success_flag: true, time_saved_mins: 25}]->(i3)
CREATE (e4)-[:MITIGATED_BY {success_flag: false, time_saved_mins: 5}]->(i2)
CREATE (e4)-[:MITIGATED_BY {success_flag: true, time_saved_mins: 50}]->(i1)
"""

def seed_db():
    try:
        with driver.session() as session:
            session.run(seed_query)
            print("Successfully seeded Neo4j with dummy Events and Interventions!")
    except Exception as e:
        print(f"Failed to seed Neo4j: {e}")
    finally:
        driver.close()

if __name__ == "__main__":
    seed_db()
