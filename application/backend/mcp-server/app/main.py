from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass
import threading

import uvicorn
from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings
from pytriz import TRIZStore
from starlette.middleware.cors import CORSMiddleware

from app.core.config import Config, config
from app.core.logger import setup_logging
from app.services.triz import get_store
from app.tools import register as register_tools


@dataclass
class AppContext:
    config: Config
    store: TRIZStore


# ---------------------------------------------------------------------------
# Health check ASGI middleware
# Eagerly loads the store in a background thread on startup.
# /health returns 200 only after the model is fully loaded.
# ---------------------------------------------------------------------------

def _is_store_ready() -> bool:
    """True once get_store() has been cached (model is loaded)."""
    return get_store.cache_info().currsize > 0


def _preload_store() -> None:
    """Run in a background thread to eagerly load the TRIZStore."""
    try:
        get_store()
    except Exception as exc:  # noqa: BLE001
        import logging
        logging.error("Failed to preload TRIZStore: %s", exc)


class HealthMiddleware:
    def __init__(self, app):
        self._app = app
        # Start loading immediately so the model is ready before the first request
        t = threading.Thread(target=_preload_store, daemon=True)
        t.start()

    async def __call__(self, scope, receive, send):
        if scope.get("type") == "http" and scope.get("path") == "/health":
            ready = _is_store_ready()
            status = 200 if ready else 503
            body = b'{"status":"ok"}' if ready else b'{"status":"loading"}'
            await send({
                "type": "http.response.start",
                "status": status,
                "headers": [(b"content-type", b"application/json")],
            })
            await send({"type": "http.response.body", "body": body})
        else:
            await self._app(scope, receive, send)


# ---------------------------------------------------------------------------
# FastMCP setup
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(server: FastMCP) -> AsyncIterator[AppContext]:
    setup_logging()
    store = get_store()  # already cached from background thread
    yield AppContext(config=config, store=store)


mcp = FastMCP(
    config.MCP_NAME,
    lifespan=lifespan,
    stateless_http=True,
    json_response=True,
    transport_security=TransportSecuritySettings(enable_dns_rebinding_protection=False),
)

# ---------------------------------------------------------------------------
# Register tools, resources, and prompts
# ---------------------------------------------------------------------------

register_tools(mcp)


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
    app = HealthMiddleware(app)  # outermost — intercepts /health, preloads model
    uvicorn.run(app, host=config.MCP_HOST, port=config.MCP_PORT)
