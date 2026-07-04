FROM python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV PYTHONUNBUFFERED=1
ENV UV_PYTHON_DOWNLOADS=0

WORKDIR /app

RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project

COPY pyproject.toml uv.lock ./
COPY problem_solver/ /app/problem_solver/

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked

EXPOSE 8081

# Dynamically resolve Cloud Run's injected PORT, falling back to 8081 locally
CMD ["sh", "-c", "uv run adk api_server problem_solver --port ${PORT:-8081} --host 0.0.0.0"]
