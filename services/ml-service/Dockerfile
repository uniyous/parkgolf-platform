FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash app

# Change ownership
RUN chown -R app:app /app

USER app

# Expose port
EXPOSE 3016

# Start the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3016"]