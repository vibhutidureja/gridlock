# 📋 Gridlock Project Roadmap & Tasks

## Phase 1: Project Setup & Infrastructure
- [x] Initialize Git repository and setup `.gitignore` for root, frontend, and backend.
- [x] Fix nested git repository issue in `frontend` folder.
- [x] Set up Python virtual environment (`venv`) for backend.
- [x] Initialize Next.js project for the frontend.
- [x] Create `docker-compose.yml` for local development (PostgreSQL, FastAPI, Next.js).
- [x] Set up environment variables (`.env` files) for database URLs and API keys.

## Phase 2: Database & Backend (FastAPI)
- [x] Set up SQLAlchemy ORM and database connection (`database.py`).
- [x] Define Database Models (`models.py`):
    - `TrafficEvent` (id, event_type, priority, zone, location, etc.)
    - `SimulatedIntervention` (officers_deployed, barricades, impact_reduction)
- [x] Set up Alembic for database migrations.
- [x] Build CRUD API Endpoints (`routers/`):
    - `POST /events/`: Create a new traffic event.
    - `GET /events/`: Fetch active events (with filtering).
    - `PUT /events/{id}`: Update event status/resolution.
- [x] Integrate ML Engine into FastAPI endpoint (`POST /predict-impact/`).

## Phase 3: Machine Learning (CatBoost)
- [x] Clean and preprocess historical traffic data (`Astram event data`).
- [x] Feature Engineering (Extract hour, day, rush hour, latitude, longitude).
- [x] Handle outliers (Filter resolution times between 5 mins and 12 hours).
- [x] Train CatBoost models for `resolution_time` and `severity`.
- [x] Export trained `.cbm` models to backend `models/` directory.
- [x] Build `MLEngine` class to load models and serve predictions dynamically.

## Phase 3.5: Reinforcement Learning (RL) Engine
- [x] Define a custom `Gymnasium` Environment (`MockTrafficEnv`) to simulate city load and active congestion.
- [x] Train a `MaskablePPO` agent (Stable-Baselines3) to pick optimal interventions based on CatBoost risk signals.
- [x] Conduct Ablation Studies (Rule-Based vs PPO vs Oracle Ceilings).
- [x] Implement Action Masking to prevent illegal operations when resources (officers/barricades) are depleted.
- [x] Build stateful `SimulationContext` for real-time tracking of city-wide event decay.
- [x] Integrate `rl_inference.py` into FastAPI simulate endpoint.

## Phase 4: Frontend Development (Next.js)
- [x] Set up Tailwind CSS and UI component library (shadcn/ui or MUI).
- [x] Build global layout (Navbar, Sidebar, Dashboard wrapper).
- [x] **Dashboard Integration**:
    - Display live traffic events and ML predictions.
    - Show key metrics (Average clearance time, active bottlenecks).
- [x] **Map Integration (Leaflet / Google Maps)**:
    - Plot traffic events on the map using Latitude/Longitude.
    - Color-code events based on ML predicted severity.
- [x] **Forms & User Inputs**:
    - Build a form to log new traffic events manually.
    - Build a simulation panel to test interventions (e.g., "Add 5 officers", see predicted time drop).
- [x] Connect Frontend to FastAPI backend using `axios` or `fetch`.

## Phase 5: Testing, Polish & Deployment
- [x] Write basic unit tests for FastAPI endpoints (using `pytest` and `TestClient`).
- [x] Test ML Engine fallback logic (ensure API doesn't crash if ML model fails).
- [x] Optimize frontend performance (lazy loading maps).
- [x] Dockerize the final application (create `Dockerfile` for frontend and backend).
- [ ] Deploy Backend & Database (Render / Railway / AWS).
- [ ] Deploy Frontend (Vercel / Netlify).