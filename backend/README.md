# 🌀 BuildWithAI · TRIZ-Powered Engineering Workspace
## 🚀 Build with AI Wrocław · Day 5 Hands-on Workshop

Welcome to **BuildWithAI**, an AI-assisted engineering workspace where users formulate technical contradictions (e.g., *"I need this file compression engine to be highly parallelized, but memory overhead spikes beyond limits when thread count increases"*), and the system utilizes the deterministic **TRIZ (Theory of Inventive Problem Solving) methodology** to generate actionable, real-world software architecture recommendations.

This hands-on workshop takes you through building, orchestrating, and deploying a modern, full-stack, secure, multi-tier AI Agent architecture natively on Google Cloud Platform (GCP).

---

## 🛠️ End-to-End System Architecture

```text
       +-----------------------------------------+
       |           Angular Frontend              |
       |       (Cloud Run - Public Ingress)      |
       +--------------------+--------------------+
                            |  HTTP /api/solve
                            v
       +-----------------------------------------+
       |            NestJS Backend               |      +------------------------+
       |       (Cloud Run - Public Ingress)      +----> |  Cloud SQL Postgres   |
       +--------------------+--------------------+      |     (Prisma DB client) |
                            |  HTTP Message             +------------------------+
                            v
+---------------------------+---------------------------+
|                       VPC Network                     | (Secure Internal Ingress)
|                                                       |
|      +-----------------------------------------+      |
|      |               ADK Agent                 |      |
|      |       (Cloud Run - Internal Ingress)    |      |
|      +                    +                    +      |
|                           |  McpToolset (SSE)         |
|                           v                           |
|      +-----------------------------------------+      |
|      |             TRIZ MCP Server             |      |
|      |       (Cloud Run - Internal Ingress)    |      |
|      +-----------------------------------------+      |
+-------------------------------------------------------+
```

| Component | Technology | Role | Ingress Security |
| :--- | :--- | :--- | :--- |
| **Frontend** | **Angular 19 + Nx Monorepo** | Sleek Conversational Chat UI. Renders dynamic agent bubbles, embedded TRIZ cards, and a history drawer. | **Public** (Internet accessible) |
| **Backend** | **NestJS + Prisma Client** | Receives chat messages, manages the global AI session, and persists chat logs to Cloud SQL. Runs migrations automatically on boot. | **Public** (Internet accessible) |
| **ADK Agent** | **Google Cloud ADK (Python)** | Conversational brain. Orchestrates Vertex AI LLM reasoning and dynamically calls tools if a contradiction is detected in the chat. | **Public** (Internet accessible) |
| **MCP Server** | **FastMCP (Python) + pytriz** | Passive tool exposing the standard 39x39 TRIZ Contradiction Matrix to find inventive principles. | **Public** (Internet accessible) |
| **Database** | **Cloud SQL (PostgreSQL)** | Persistent, managed relational storage for the global chronological chat history and extracted metadata. | **Cloud SQL Auth Proxy** (No public IP) |

---

## ☁️ Part 2: The GCP Microservice Assembly Line

To ensure a fault-proof deployment, we will build this architecture using an **Assembly Line** approach. For each microservice, you will:
1. Run it locally on your machine.
2. Test it locally to verify it connects successfully to the *previously deployed* cloud component.
3. Deploy it to Google Cloud Run.

We have provided a unified `Makefile` to handle all complex `gcloud` invocations.

### 📋 Prerequisites & Foundation
Install and authenticate the Google Cloud CLI, then set your target variables:
```bash
gcloud auth login
export GCP_PROJECT="your-unique-project-id"
export REGION="europe-west1"

# 1. Bind your project
make gcp-init GCP_PROJECT=$GCP_PROJECT

# 2. Enable Required Google Cloud APIs
make gcp-enable-apis GCP_PROJECT=$GCP_PROJECT

# 3. Create Artifact Registry to hold your containers
make gcp-create-registry GCP_PROJECT=$GCP_PROJECT REGION=$REGION

# 4. Provision Cloud SQL PostgreSQL (Takes 4-6 minutes)
export DB_PASSWORD="inventapassword"
make gcp-create-db GCP_PROJECT=$GCP_PROJECT REGION=$REGION DB_PASSWORD=$DB_PASSWORD

# 5. Package all code into Docker Containers in the cloud!
make build-all GCP_PROJECT=$GCP_PROJECT REGION=$REGION
```

---

### 🏭 Stage 1: TRIZ MCP Server (Passive Tooling)

The MCP server exposes the TRIZ contradiction matrix tools.

**1. Run Locally:**
Open a terminal and start the server:
```bash
cd mcp-server
MCP_HOST=0.0.0.0 MCP_PORT=8000 uv run python app/main.py
```

**2. Test Locally:**
Open a second terminal and verify the server is listening:
```bash
curl -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -H "Accept: application/json" -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
```
*(You should see a JSON response listing `browse_contradiction_matrix` and other tools. Kill the local server with `Ctrl+C` when done).*

**3. Deploy to GCP:**
```bash
make deploy-mcp GCP_PROJECT=$GCP_PROJECT REGION=$REGION
```

---

### 🧠 Stage 2: ADK Agent (The Brain)

The ADK Agent orchestrates the Gemini LLM. We will run it locally and test its connection to your newly deployed Cloud MCP Server!

**1. Run Locally (Connected to Cloud MCP):**
First, grab your deployed MCP URL from the previous step.
```bash
cd adk-agents
export MCP_SERVER_URL="https://triz-mcp-server-xxxx.a.run.app/mcp"
export ADK_API_BACKEND="vertex"
export GOOGLE_GENAI_USE_VERTEXAI="1"
export GOOGLE_CLOUD_PROJECT=$GCP_PROJECT

uv run adk api_server problem_solver --port 8081 --host 0.0.0.0
```

**2. Test Locally:**
Initialize a test session and send a prompt to verify Vertex AI and the Cloud MCP Server connect seamlessly:
```bash
curl -s -X POST http://localhost:8081/apps/problem_solver/users/test/sessions/test-session -H "Content-Type: application/json" -d '{}'

curl -X POST http://localhost:8081/run -H "Content-Type: application/json" -d '{
  "appName": "problem_solver",
  "userId": "test",
  "sessionId": "test-session",
  "newMessage": {
    "role": "user",
    "parts": [{"text": "I want speed to improve (9) but memory degrades (23)."}]
  }
}'
```
*(You should see a massive JSON response containing the TRIZ principles retrieved from the cloud!).*

**3. Deploy to GCP (Forcing 1 Warm Instance):**
```bash
make deploy-agent GCP_PROJECT=$GCP_PROJECT REGION=$REGION
```

---

### ⚙️ Stage 3: NestJS Backend (The API)

The backend handles database logging. To test it locally, we must create a secure tunnel to your Cloud SQL database using the Cloud SQL Auth Proxy.

**1. Start the Cloud SQL Proxy (Terminal 1):**
Download the proxy and map your cloud database to your local port 5432:
```bash
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.2/cloud-sql-proxy-linux-amd64
chmod +x cloud-sql-proxy
./cloud-sql-proxy $GCP_PROJECT:$REGION:buildwithai-db --port 5432
```

**2. Run Locally (Terminal 2):**
In a new terminal, launch NestJS connected to the Proxy and your deployed Cloud ADK Agent:
```bash
export DATABASE_URL="postgresql://postgres:inventapassword@localhost:5432/buildwithai?schema=public"
export ADK_AGENT_URL="https://triz-adk-agent-xxxx.a.run.app"
npx nx serve backend
```

**3. Test Locally:**
Verify the backend correctly routes to the Cloud Agent and persists to Cloud SQL:
```bash
curl -X POST http://localhost:3000/api/solve -H "Content-Type: application/json" -d '{
  "problemDescription": "Test contradiction from localhost!"
}'
```

**4. Deploy to GCP (Forcing 1 Warm Instance):**
*(Kill your local servers).*
```bash
make deploy-backend GCP_PROJECT=$GCP_PROJECT REGION=$REGION DB_PASSWORD=$DB_PASSWORD
```

---

### 🖥️ Stage 4: Angular Frontend (The UI)

The frontend is a static UI. We will run it locally and connect it to your live deployed backend.

**1. Run Locally:**
```bash
npx nx serve frontend
```

**2. Test Locally:**
Open **`http://localhost:4200`** in your browser.
Click the **⚙️ Settings** gear in the top right, and paste your deployed Backend URL (e.g., `https://buildwithai-backend-xxxx.a.run.app/api`). Click "Apply" and submit a contradiction on the screen!

**3. Deploy to GCP (Forcing 1 Warm Instance):**
```bash
make deploy-frontend GCP_PROJECT=$GCP_PROJECT REGION=$REGION
```

---

### 🎉 Final Verification
Run the following target to print out the final, active production URLs of all deployed services:
```bash
make show-urls GCP_PROJECT=$GCP_PROJECT REGION=$REGION
```
Open the Frontend URL in your browser and enjoy the fully orchestrated AI Cloud Architecture!

---

## 🧹 Part 3: Clean Up
To avoid incurring Google Cloud charges after the workshop, make sure to delete your resources. You can run the automated cleanup script:
```bash
make gcp-cleanup GCP_PROJECT=$GCP_PROJECT REGION=$REGION
```

Now, we deploy the services in topological order (bottom-up), dynamically passing endpoints via environment variables.

#### **A. Deploy TRIZ MCP Server (Public Tooling)**
Deploy the Python-based TRIZ toolset to Cloud Run, allocated with 2GiB of memory to handle AI model loading:
```bash
make deploy-mcp GCP_PROJECT=$GCP_PROJECT REGION=$REGION
```

#### **B. Deploy ADK Agent (Public Brain)**
Deploy the Google ADK Python Agent. The Makefile will automatically query the URL of your newly deployed TRIZ MCP server on-the-fly and inject it as an environment variable. It also activates Vertex AI mode natively:
```bash
make deploy-agent GCP_PROJECT=$GCP_PROJECT REGION=$REGION
```

#### **C. Deploy NestJS Backend (Public API)**
Deploy the backend API. It establishes a secure connection to Cloud SQL PostgreSQL using direct socket routing, connects to the ADK Agent, and automatically runs `npx prisma db push` on startup to generate the database schema:
```bash
make deploy-backend GCP_PROJECT=$GCP_PROJECT REGION=$REGION DB_PASSWORD="yourpassword"
```

#### **D. Deploy Angular Frontend (Public UI)**
Finally, deploy our static Angular application to Cloud Run. The Makefile will fetch your backend URL and inject it dynamically into the Nginx container at boot time:
```bash
make deploy-frontend GCP_PROJECT=$GCP_PROJECT REGION=$REGION
```

---

### Step 7: Verify Live Active Deployments
Run the following target to print out the active, live production URLs of all deployed services:
```bash
make show-urls GCP_PROJECT=$GCP_PROJECT REGION=$REGION
```

Open the Frontend URL in your browser, verify your backend endpoint connection via the ⚙️ Settings gear, and submit your technical contradictions to see the live end-to-end, multi-tier AI cloud architecture in action! 🚀

---

## 💻 Part 2: Local Quickstart via Docker Compose (Optional)

If you prefer to run or test the entire 5-container architecture locally before deploying to GCP, you can do so using Docker Compose.

### 1. Prerequisites
Ensure you have the following installed on your machine:
* [Docker Desktop](https://www.docker.com/products/docker-desktop/)
* [Node.js (v20+)](https://nodejs.org/)

If you or your workshop participants do not have the necessary local tooling or dependencies installed, you can set everything up automatically using the following `Makefile` targets:

*   **Install Astral `uv` Package Manager** (Auto-detects Windows, macOS, and Linux):
    ```bash
    make install-tools
    ```
*   **Install All Dependencies & Generate Prisma Client** (Installs python environment packages, Node modules, and generates client types):
    ```bash
    make install-deps
    ```

### 2. Configuration
Create a `.env` file at the root of the workspace. Copy from the template:
```bash
cp .env.example .env
```
Open `.env` and add your **`GOOGLE_API_KEY`** (get one instantly from [Google AI Studio](https://aistudio.google.com/)).

### 3. Launch Stack
Run the following command to spin up the local database, backend, frontend, ADK agent, and MCP server in parallel:
```bash
docker compose up --build
```
Once initialized, open your browser and navigate to **`http://localhost`** to interact with the dashboard!
