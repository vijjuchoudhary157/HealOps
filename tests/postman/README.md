# HealOps API Tests

This folder contains the automated API test collection for HealOps using Postman and Newman.

## What is covered
The test collection validates the following API endpoints and flows:
1. **System Health & Readiness**: `GET /health`, `GET /ready`
2. **Authentication Flow**: 
   - `POST /api/auth/register` (generates a dynamic unique email per run)
   - `POST /api/auth/login` (authenticates and extracts the JWT token)
3. **Task Management Lifecycle**:
   - `GET /api/tasks` (Initial fetch, validates JWT authorization)
   - `POST /api/tasks` (Creates a new test task)
   - `PATCH /api/tasks/:id/status` (Updates task to 'completed')
   - `DELETE /api/tasks/:id` (Deletes the test task)
   - `GET /api/tasks` (Final fetch to ensure deletion)

## How to start the backend
Before running these tests, the backend must be running on `http://localhost:5000`.

To start the backend in development mode:
```bash
cd backend
npm run db:init # (If tables are not created yet)
npm run dev
```

## How to run the Newman tests
Run the npm script from the project root directory:
```bash
npm run test:api
```
This script executes `newman` using the included `HealOps_API.postman_collection.json` against the `HealOps_Local.postman_environment.json` variables.

## What the test flow does
1. It verifies basic system endpoints are up.
2. It dynamically registers a new user with a timestamped email, then logs in to receive a JWT.
3. Using this token, it runs through the full CRUD lifecycle of a task (Read, Create, Update Status, Delete, Read again).
4. Assertions validate HTTP status codes, response JSON structures, and expected data mutations on the backend.
