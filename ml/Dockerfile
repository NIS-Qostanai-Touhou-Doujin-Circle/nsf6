# syntax=docker/dockerfile:1

# Lightweight Python base; TensorFlow, scikit-learn, numpy, pandas wheels are prebuilt.
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
	PYTHONUNBUFFERED=1 \
	PIP_DISABLE_PIP_VERSION_CHECK=1 \
	PIP_NO_CACHE_DIR=1 \
	TF_CPP_MIN_LOG_LEVEL=2

WORKDIR /app

# System deps: libgomp is required at runtime by scikit-learn (OpenMP)
RUN apt-get update && apt-get install -y --no-install-recommends \
	libgomp1 \
	&& rm -rf /var/lib/apt/lists/*

# Install Python deps first for better layer caching
COPY requirements.txt /app/requirements.txt
RUN python -m pip install --upgrade pip && \
	pip install -r requirements.txt

# Copy application code and model artifacts
COPY server.py /app/server.py
COPY models /app/models

# Use a non-root user for security
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Simple healthcheck hitting the root endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
	CMD ["python", "-c", "import sys,urllib.request,socket; socket.setdefaulttimeout(3); sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/').status==200 else 1)"]

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]

