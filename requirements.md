# UrbanFlow Nexus: Project Vision & Context

UrbanFlow Nexus is not just a traffic prediction tool. It is a prescriptive analytics engine. When a traffic incident occurs, standard tools simply predict the resulting congestion. UrbanFlow Nexus answers the critical operational question: "What is the best action to take right now to minimize disruption and maximize resource efficiency?"

We shift traffic management from reactive monitoring to proactive, optimized intervention.

## Core Philosophy
- **Understand the Event**: Ingest structured data about incidents (accidents, protests, breakdowns).
- **Predict Operational Impact**: Forecast the severity and expected resolution time.
- **Learn from History**: Retrieve past successful interventions for similar events.
- **Simulate Counterfactuals**: Compare the impact of "Doing Nothing" versus specific mitigation strategies.
- **Optimize Resources**: Recommend a deployment plan using a trained Reinforcement Learning (PPO) agent that maximizes the return on investment (ROI) via the Traffic Intervention Effectiveness Score (TIES).
- **Execute & Learn**: Generate operational briefs and feed outcomes back into the system to improve future decisions.

## Key Innovations
- **Counterfactual Causal Inference**: Mathematically evaluating the impact of interventions before deploying them.
- **Traffic Intervention Effectiveness Score (TIES)**: An economic optimization metric ensuring limited resources (officers, barricades) are deployed efficiently.
- **Reinforcement Learning Agent**: A stateful Maskable PPO model that dynamically prescribes the optimal intervention strategy based on live traffic congestion and city-wide load.
- **Intervention Knowledge Graph**: A continuously updated repository mapping events to successful (and failed) interventions.

## Architecture Overview
UrbanFlow Nexus relies on a specialized, high-performance tech stack:
- **Data Layer**: PostgreSQL (with PostGIS) for relational and spatial data.
- **Graph Layer**: NetworkX for rapid, in-memory road network simulations. Neo4j for the Intervention Knowledge Graph.
- **Machine Learning Layer**: CatBoost and Scikit-Learn for accurate tabular predictions (Severity, Resolution Time) derived from categorical incident data.
- **Reinforcement Learning Layer**: Stable-Baselines3 (MaskablePPO) and Gymnasium for stateful intervention optimization and resource allocation.
- **AI Orchestration Layer**: LangChain and OpenAI (Agentic RAG) for reasoning and operational brief generation.
- **Application Layer**: FastAPI backend and Next.js frontend.

## Development Approach
This project strictly adheres to Test-Driven Development (TDD). Every feature, formula, and API endpoint must be accompanied by robust, FAANG-level testing using pytest, hypothesis (for property-based testing), and TestClient.
