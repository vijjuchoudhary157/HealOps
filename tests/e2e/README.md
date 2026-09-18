# HealOps Playwright E2E Tests

This directory contains end-to-end browser tests for the HealOps application using [Playwright](https://playwright.dev/).

## What is E2E testing in HealOps
These tests launch a real headless Chromium browser and interact with the HealOps React application exactly as a real user would—typing into inputs, clicking buttons, and reading the DOM to verify state. They connect to the real backend and database.

## Scenarios Covered
- **Authentication**: Registration (with dynamic unique emails), Login, Logout, invalid login handling, and protected route redirection.
- **Task Management**: Creating a task, verifying it persists after a page reload, marking it as complete, and deleting it through the UI modal and table.
- **Form Validation**: Asserts that required fields prevent task creation submission.

## Prerequisites & How to Start
Because these tests run against your local dev environment, both the frontend and backend must be running.

**Start the Backend (Port 5000):**
```bash
cd backend
npm run dev
```

**Start the Frontend (Port 5173):**
```bash
npm run dev
```

## How to run Playwright
From the project root directory, run the npm script:

**Headless Mode (Standard):**
```bash
npm run test:e2e
```

**UI Mode (Interactive Debugging):**
```bash
npm run test:e2e:ui
```

## Test Reports
If a test fails, Playwright will automatically capture a screenshot and trace (on retry). 
HTML reports are generated in the `playwright-report/` directory and can be viewed using:
```bash
npx playwright show-report
```
