import os
from google.adk import Agent
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPConnectionParams

# Fetch the URL of the TRIZ MCP Server (defaults to localhost:8000 for local dev)
mcp_url = os.environ.get("MCP_SERVER_URL", "http://localhost:8000/mcp")

# Define the connection parameters for Streamable HTTP transport
connection_params = StreamableHTTPConnectionParams(
    url=mcp_url,
    use_mtls=False,
)

triz_solver = Agent(
    model="gemini-2.5-flash",
    name="triz_solver",
    description="Specialist in identifying technical contradictions and querying the TRIZ matrix for inventive principles.",
    instruction=(
        "You are BuildWithAI's TRIZ specialist.\n\n"
        "Your task is to identify the user's contradiction, perform semantic parameter searches if needed, "
        "query the contradiction matrix using the browse_contradiction_matrix tool, and generate "
        "exactly the 3 best inventive software recommendations based on those principles.\n\n"
        "Be highly specific and refer to the specific TRIZ principle names and numbers in your response.\n\n"
        "Once you have completed generating the 3 recommendations, you MUST output your recommendations as text and transfer control back to the root orchestrator by calling `transfer_to_agent` with `agent_name='root_agent'`."
    ),
    tools=[
        McpToolset(connection_params=connection_params)
    ]
)
