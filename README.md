# HealOps DevOps Management Dashboard

HealOps is a DevOps Management Dashboard providing a centralized interface for monitoring, task management, and operations.

## Continuous Integration
This project uses GitHub Actions for Continuous Integration. The pipeline automatically runs when code is pushed or a pull request is created on the `main` branch. 

The CI pipeline guarantees application integrity by executing the following validation stages:
1. **Backend Tests**: Jest validates the backend unit behavior and database integrations.
2. **API Tests**: Newman validates the external API contracts using our Postman collections.
3. **E2E Tests**: Playwright validates the entire browser workflow and UI behavior on an automated Chromium instance.
4. **Production Build**: Vite builds the frontend application to ensure it compiles without errors.

The pipeline runs entirely in isolated, secure containers with ephemeral PostgreSQL databases, without requiring any real infrastructure secrets.
