# Python 3.12 slim base
FROM python:3.12-slim

# Set environment variables for non-interactive installs and unbuffered logging
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Create a non-root user with UID 1000
RUN useradd -m -u 1000 runlyuser

# Set working directory
WORKDIR /app

# Copy requirements file first for caching
COPY requirements.txt /app/

# Install dependencies as root before switching users
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . /app/

# Run as root so it can access the mapped /var/run/docker.sock

# Expose port 8000
EXPOSE 8000

# CMD to start the FastAPI application with WebSockets
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--ws", "websockets"]
