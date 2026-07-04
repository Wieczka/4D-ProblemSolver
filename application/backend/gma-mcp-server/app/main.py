import uvicorn
from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings
from starlette.middleware.cors import CORSMiddleware

from app.core.config import config
from app.core.logger import setup_logging
from app.tools.gma import analyze_morphology

setup_logging()

mcp = FastMCP(
    config.MCP_NAME,
    stateless_http=True,
    json_response=True,
    transport_security=TransportSecuritySettings(enable_dns_rebinding_protection=False),
)

# ---------------------------------------------------------------------------
# Register GMA tool
# ---------------------------------------------------------------------------

mcp.tool()(analyze_morphology)

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app = mcp.streamable_http_app()
    app = CORSMiddleware(
        app,
        allow_origins=["*"],
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["*"],
        expose_headers=["Mcp-Session-Id"],
    )
    uvicorn.run(app, host=config.MCP_HOST, port=config.MCP_PORT)
