FROM python:3.11-slim

# Create a non-root user for security
RUN useradd --create-home --shell /bin/sh appuser

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY app.py .
COPY templates/ templates/
COPY static/ static/

# Create a data directory for the persistent encryption key
RUN mkdir -p /data && chown appuser:appuser /data /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 5000

# Environment variables (override as needed)
ENV ENCRYPTION_KEY_PATH=/data/encryption.key \
    FLASK_DEBUG=false \
    PORT=5000

# Run the application
CMD ["python", "app.py"]
