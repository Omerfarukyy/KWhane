# Project Setup Instructions

This project consists of a React frontend and a Python FastAPI backend for ML calculations.

## Prerequisites

- Node.js (v18+ recommended)
- Python (v3.8+ recommended)

## Frontend Setup

The frontend is built with React, Vite, and Tailwind CSS.

1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

    The application will be available at `http://localhost:5173`.

### Environment Variables

A `.env` file is present in the `frontend` directory with Supabase configuration:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Ensure these are correctly set for your Supabase instance if needed.

## ML-python Setup

The ML backend is a Python FastAPI application.

1.  Navigate to the `ML-python` directory:
    ```bash
    cd ML-python
    ```

2.  (Optional) Create and activate a virtual environment:
    ```bash
    python -m venv venv
    # Windows
    .\venv\Scripts\activate
    # macOS/Linux
    source venv/bin/activate
    ```

3.  Install required dependencies:
    ```bash
    pip install fastapi uvicorn pydantic
    ```

4.  Start the API server:
    ```bash
    uvicorn main:app --reload
    ```

    The API will be available at `http://localhost:8000`.
    API Docs are available at `http://localhost:8000/docs`.
