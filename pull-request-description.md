# Pull Request Description

## Title
feat: build inventory and sales management system foundation

## Summary
This pull request merges the current branch into `main` and adds the dashboard foundation for the Inventory & Sales Management System. It provides the dashboard API and database configuration, along with a responsive Next.js dashboard for viewing key business metrics and sales trends.

## Backend Changes
- Set up the Express server with CORS, JSON parsing, health checks, and error handling.
- Add a feature-based dashboard module with API routes and service/controller layers.
- Add database connection configuration and environment variable support.
- Document the API and database setup.

## Frontend Changes
- Build the responsive dashboard layout with shared header and sidebar navigation.
- Display summary cards for sales, revenue, products, low stock, customers, and pending orders.
- Visualize daily sales in a chart.
- Fetch dashboard metrics from the backend and show loading and error states.
- Create reusable dashboard components for metric cards and the sales chart.

## Validation
- Start the backend and frontend using their documented development commands.
- Confirm the backend health check responds successfully.
- Open the frontend and verify that the main pages render at desktop and mobile widths.
- Confirm the dashboard handles successful API responses and displays its loading or error state when appropriate.

## Notes
This pull request focuses on the dashboard. Other application pages and workflows are outside its scope.
