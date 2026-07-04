# pyrefly: ignore [missing-import]
import os
from google.adk import Agent
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPConnectionParams
from problem_solver.schemas import AlternativeSpecialistOutput

# Re-use the dedicated GMA MCP server URL (separate from TRIZ MCP)
gma_mcp_url = os.environ.get("GMA_MCP_SERVER_URL", "http://localhost:8001/mcp")

connection_params = StreamableHTTPConnectionParams(
    url=gma_mcp_url,
    use_mtls=False,
)

alternative_solver = Agent(
    model="gemini-2.5-flash",
    name="alternative_solver",
    description="Specialist in First Principles design, standard engineering patterns, conventional design methodologies, and General Morphological Analysis (GMA).",
    instruction=(
        "You are BuildWithAI's General Engineering and First Principles specialist.\n\n"
        "Your task is to analyze the user's problem statement using First Principles and conventional engineering design practices (do NOT use TRIZ).\n\n"
        "## Morphological Analysis (GMA) Step\n"
        "Before proposing solutions, determine if the problem is a **complex multi-parameter design problem** "
        "(e.g., involving material choices, barrier types, transport methods, or any combination of independent design dimensions). "
        "If so, you MUST first perform a General Morphological Analysis:\n"
        "1. Identify the key design dimensions (parameters) and their feasible variants.\n"
        "2. Identify pairs of variants that are mutually incompatible (Cross-Consistency Assessment rules).\n"
        "3. Call the `analyze_morphology` tool with the structured dimensions and incompatibilities.\n"
        "4. Use the returned list of valid candidate configurations as the foundation for your recommendations.\n\n"
        "If the problem is simple (single-parameter or straightforward), skip the GMA step and proceed directly.\n\n"
        "## Solution Generation\n"
        "Depending on the domain of the problem:\n"
        "- If it is a software/digital problem: Propose exactly the 3 best standard architectural recommendations "
        "(e.g., caching, indexing, queueing, thread-pools).\n"
        "- If it is a physical/mechanical/material problem: Propose exactly the 3 best standard design or material "
        "science patterns (e.g., standard composite materials, traditional recycling loops, physical reinforcement structure).\n\n"
        "When GMA was used, each of the 3 recommendations MUST reference a specific valid candidate configuration "
        "from the solver output and explain why that configuration is optimal.\n\n"
        "Once you have completed generating the 3 recommendations, describe them clearly in markdown format and transfer control "
        "back to the root orchestrator by calling `transfer_to_agent` with `agent_name='root_agent'`."
    ),
    tools=[
        McpToolset(connection_params=connection_params)
    ],
)
