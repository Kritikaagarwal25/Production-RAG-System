#!/bin/bash

# Function to kill processes on a port
kill_port() {
    local port=$1
    local pids=$(lsof -ti :$port)
    if [ ! -z "$pids" ]; then
        echo "🛑 Killing existing processes on port $port..."
        echo "$pids" | xargs kill -9
    fi
}

# Kill any existing processes
kill_port 8000
kill_port 8080

echo "🚀 Starting DocuQuery AI..."

# Ensure a virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "📥 Installing dependencies (this may take a minute)..."
pip install --upgrade pip setuptools wheel --quiet
if pip install -r requirements.txt; then
    echo "✅ Dependencies installed successfully."
else
    echo "❌ Failed to install dependencies. Please check your internet connection or requirements.txt."
    exit 1
fi

# Start the Backend (FastAPI)
echo "📡 Starting Backend on http://localhost:8000..."
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 > backend.log 2>&1 &
BACKEND_PID=$!

# Wait and verify backend
echo "⏳ Waiting for backend to initialize..."
sleep 5
if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ Backend is running (PID: $BACKEND_PID)."
else
    echo "❌ Backend failed to start. Last 10 lines of backend.log:"
    tail -n 10 backend.log
    exit 1
fi

# Start the Frontend
echo "🖥️ Starting Frontend on http://localhost:8080..."
echo "----------------------------------------------------"
echo "✅ DocuQuery AI is LIVE! | http://localhost:8080"
echo "----------------------------------------------------"
echo "--- Press Ctrl+C to stop both servers ---"
cd frontend && python3 -m http.server 8080
