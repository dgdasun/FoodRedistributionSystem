# Zero Waste — AI Powered Smart Surplus Food Redistribution & Waste Reduction System

Full-stack implementation built on:

- **Frontend:** React (Vite)
- **Backend:** Spring Boot (Java 17+)
- **Database:** MongoDB (Spring Data MongoDB)
- **AI/ML:** Python (FastAPI + scikit-learn), called by the Spring Boot
  backend as a separate microservice

## Architecture

```
┌─────────────┐        REST/JSON        ┌────────────────────┐        REST/JSON        ┌─────────────────────┐
│   React     │ ───────────────────────▶│   Spring Boot       │ ───────────────────────▶│  Python AI Service   │
│  (Vite)     │◀───────────────────────  │   Backend (8080)    │◀───────────────────────  │   (FastAPI, 8000)    │
│  :5173      │                          │                     │                          │                      │
└─────────────┘                          └──────────┬──────────┘                          └──────────────────────┘
                                                      │
                                                      ▼
                                          ┌────────────────────┐
                                          │      MongoDB         │
                                          │       :27017         │
                                          └────────────────────┘
```

- **React** never talks to the AI service directly — it always goes through
  Spring Boot's REST API (`/api/...`), same as before.
- **Spring Boot** owns all persistence (MongoDB) and business rules
  (expiry classification, ticket generation, notifications, etc). Whenever
  an AI decision is needed, its `AIClientService` assembles the relevant
  data and calls the Python service over HTTP.
- **Python (FastAPI)** is a stateless compute service with two endpoints:
  - `POST /recommend/priority` — ranks beneficiary requests (weighted
    scoring: urgency, distance, org size, capacity, allocation history)
  - `POST /predict/surplus` — forecasts surplus food per category using a
    scikit-learn `LinearRegression` model fit on historical inventory data

This separation means the AI/ML team can iterate on the Python service (swap
in better models, add training pipelines, deploy on GPU nodes, etc.)
completely independently of the Java backend or React frontend — only the
JSON contract between them needs to stay stable.

## Project structure

```
foodshare-system/
├── backend-spring/        # Spring Boot REST API (Java 17, Maven)
│   └── src/main/java/com/foodshare/
│       ├── model/          # MongoDB documents (User, Donation, FoodRequest, Ticket, ...)
│       ├── repository/     # Spring Data MongoDB repositories
│       ├── service/        # Business logic + AIClientService (calls the Python service)
│       ├── controller/     # REST controllers
│       └── config/         # CORS, RestTemplate, global exception handling, DataSeeder
├── ai-service/             # Python AI/ML microservice (FastAPI)
│   └── app/
│       ├── main.py         # FastAPI app + routes
│       ├── schemas.py      # Pydantic request/response models
│       └── ml/
│           ├── priority.py     # Priority-Based Smart Allocation scoring
│           └── prediction.py   # scikit-learn surplus forecasting
├── frontend/                # React (Vite) — same UI as before
├── docker-compose.yml       # Runs all 4 services together
└── sample-data/
    └── sample_inventory.csv
```

## Running it locally (without Docker)

You need: **Java 17+ & Maven**, **Python 3.10+**, **Node.js 18+**, and a
**MongoDB** instance (local install or `mongod` running on default port
27017 — no manual DB/collection setup needed, Spring Boot creates
collections automatically and seeds demo data on first run).

### 1. MongoDB

```bash
# if you don't already have Mongo running locally:
docker run -d -p 27017:27017 --name foodshare-mongo mongo:7
```

### 2. Python AI service

```bash
cd ai-service
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Check it's up: `http://localhost:8000/health` and interactive docs at
`http://localhost:8000/docs`.

### 3. Spring Boot backend

```bash
cd backend-spring
mvn spring-boot:run
```

Runs on `http://localhost:8080`. On first startup it seeds MongoDB with the
same demo dataset used throughout development (donor, NGOs, a farm partner,
admin, sample listings, and 20 days of historical data for the AI model).
Health check: `http://localhost:8080/api/health`.

By default it looks for the AI service at `http://localhost:8000` — override
with the `AI_SERVICE_URL` env var if needed.

### 4. React frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api/*` to the Spring Boot
backend at `:8080` (see `vite.config.js`).

## Running it all with Docker Compose

```bash
docker compose up --build
```

This starts MongoDB, the Python AI service, the Spring Boot backend, and an
nginx-served production build of the React frontend, wired together:

| Service    | URL                        |
|------------|------------------------------|
| Frontend   | http://localhost:3000        |
| Backend    | http://localhost:8080/api    |
| AI service | http://localhost:8000        |
| MongoDB    | localhost:27017              |

## Demo accounts (no password — this is a Project I prototype)

| Role                  | Email                          |
|------------------------|----------------------------------|
| Donor (Supermarket)    | perera@abcsupermarket.lk         |
| Beneficiary (NGO)      | contact@hopekitchen.lk           |
| Beneficiary (Charity)  | info@caringhands.lk              |
| Farm/Compost           | farm@greenacres.lk               |
| Administrator           | admin@foodshare.lk               |

Use the quick-login buttons on the sign-in screen, or register a new
NGO/charity/farm account via "Register here" — it lands in **Admin →
Verifications** awaiting approval.

## Trying the AI features specifically

1. Log in as the donor, go to **My Donations → Upload CSV**, and pick
   `sample-data/sample_inventory.csv`.
2. **Publish** a surplus item.
3. Log in as an NGO (`contact@hopekitchen.lk` or `info@caringhands.lk`) and
   submit a request for that item under **Available Food**.
4. Log back in as the donor → **My Donations → View Requests** on that item.
   This calls `GET /api/requests/recommendations/{itemId}`, which Spring
   Boot forwards to the Python service's `/recommend/priority` endpoint —
   you'll see the AI-ranked beneficiaries with their computed scores.
5. Check the **Impact** page — it calls `GET /api/ai/predict`, which Spring
   Boot forwards to the Python service's `/predict/surplus` endpoint,
   returning a scikit-learn-generated 7-day surplus forecast per category.

You can also call the Python service directly (bypassing Spring Boot) to
inspect it in isolation — try the interactive Swagger UI at
`http://localhost:8000/docs`.

## Notes on scope

- QR codes are rendered as a stylised placeholder pattern with the ticket's
  unique code printed on it — swapping in a real QR-generation library is a
  drop-in future enhancement on either the Spring Boot or React side.
- The priority-ranking model in `ai-service/app/ml/priority.py` is a
  transparent, auditable weighted-scoring formula rather than a trained
  classifier — appropriate for an allocation system handling essential
  resources where explainability matters. `ai-service/app/ml/prediction.py`
  does use a genuine scikit-learn model (`LinearRegression` per category).
  Both are isolated behind clear function boundaries so they can be
  upgraded to more advanced models independently.
- POS integration, mobile app, GPS route optimization, IoT monitoring, SMS/
  email notifications, blockchain transparency and multi-language support
  remain out of scope, matching the report's own "Future Work" chapter.






Role	Email
Donor (Supermarket)	perera@abcsupermarket.lk
Beneficiary (NGO)	contact@hopekitchen.lk
Beneficiary (Charity)	info@caringhands.lk
Farm/Compost	farm@greenacres.lk
Administrator	admin@foodshare.lk