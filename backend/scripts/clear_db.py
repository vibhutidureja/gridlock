import os
import sys
from sqlalchemy import create_engine, text
from neo4j import GraphDatabase

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/urbanflow")
engine = create_engine(DATABASE_URL)
with engine.begin() as conn:
    print("Clearing PostgreSQL tables...")
    if DATABASE_URL.startswith("sqlite"):
        conn.execute(text("DELETE FROM simulated_interventions;"))
        conn.execute(text("DELETE FROM traffic_events;"))
    else:
        conn.execute(text("TRUNCATE TABLE simulated_interventions CASCADE;"))
        conn.execute(text("TRUNCATE TABLE traffic_events CASCADE;"))
    print("Successfully cleared SQL tables (0 events remaining)!")

uri = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
user = os.getenv("NEO4J_USER", "neo4j")
password = os.getenv("NEO4J_PASSWORD", "password")

print(f"Connecting to Neo4j database at {uri}...")
try:
    driver = GraphDatabase.driver(uri, auth=(user, password))
    with driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n;")
        print("Successfully cleared Neo4j database (0 nodes remaining)!")
except Exception as e:
    print(f"Failed to clear Neo4j: {e}")
finally:
    if 'driver' in locals():
        driver.close()
