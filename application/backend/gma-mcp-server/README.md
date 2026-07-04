# GMA MCP Server

General Morphological Analysis (GMA) MCP Server implementing a Zwicky Box CSP Solver with Cross-Consistency Assessment (CCA).

## Running locally

```bash
uv run python app/main.py
```

The server starts on `http://localhost:8001/mcp` by default.

## Testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector
```

Connect to `http://localhost:8001/mcp` and invoke `analyze_morphology`.
