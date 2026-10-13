# Start from the official Python 3.13 image. "slim" leaves out extras we do not need.
FROM python:3.13-slim

# Do not write .pyc files, and print logs straight away so they show up on Railway.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# All following commands run inside /app in the container.
WORKDIR /app

# Copy only the requirements first and install them. Docker caches this step,
# so dependencies are only reinstalled when requirements.txt changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the API code (.dockerignore controls what is left out).
COPY . .

# Create a normal user and run as it, so the app does not run as root.
RUN useradd --create-home appuser
USER appuser

# Documents the default port. Railway sets PORT itself.
EXPOSE 8000

# Start the API. The shell fills in $PORT (8000 if not set), and "exec" makes
# uvicorn the main process so it receives stop signals and shuts down cleanly.
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
