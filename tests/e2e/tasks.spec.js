import { test, expect } from '@playwright/test';

const getTestEmail = () => `e2e.test.${Date.now()}@example.com`;
const TEST_PASSWORD = 'password123!';

test.describe('Task Management', () => {

  test.beforeEach(async ({ page }) => {
    // Register and login a fresh user for task tests to avoid interference
    const testEmail = getTestEmail();
    await page.goto('/login');
    await page.getByRole('button', { name: 'Create Workspace' }).click();
    await page.getByLabel('FULL NAME').fill('E2E Test User');
    await page.getByLabel('WORK EMAIL').fill(testEmail);
    await page.getByLabel('CLUSTER PASSKEY / CIPHER').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Create Reliability Workspace' }).click();
    await expect(page).toHaveURL('/dashboard');
    await page.goto('/tasks');
  });

  test('Create, Verify, Complete, and Delete a task', async ({ page }) => {
    const taskTitle = `E2E Task ${Date.now()}`;
    const taskDesc = 'This is an end-to-end test task description.';

    // 1. Verify the Tasks page renders
    await expect(page.locator('h1', { hasText: 'Task Management' })).toBeVisible();

    // 2. Create a task using the modal
    await page.getByRole('button', { name: 'Create New Task' }).click();
    await expect(page.getByRole('heading', { name: 'Create New Task' })).toBeVisible();
    
    // Fill the form
    await page.getByLabel('Task Title').fill(taskTitle);
    await page.getByLabel('Description').fill(taskDesc);
    await page.getByLabel('Priority').selectOption('high');
    
    // Submit
    await page.getByRole('button', { name: 'Create Task' }).click();
    
    // 3. Verify the new task appears in the UI
    await expect(page.getByText(taskTitle)).toBeVisible();
    await expect(page.getByText(taskDesc)).toBeVisible();
    
    // 4. Reload the page and verify persistence
    await page.reload();
    await expect(page.getByText(taskTitle)).toBeVisible();
    await expect(page.getByText(taskDesc)).toBeVisible();
    
    // Find the row containing our task
    const taskRow = page.locator('tr', { hasText: taskTitle });
    
    // Verify initial status is pending
    await expect(taskRow).toContainText(/pending/i);
    
    // 5. Complete the task
    await taskRow.getByTitle('Complete').click();
    
    // Verify the status changes to completed
    await expect(taskRow).toContainText(/completed/i);
    
    // 6. Delete the task
    await taskRow.getByTitle('Delete').click();
    
    // Verify the task disappears
    await expect(page.getByText(taskTitle)).not.toBeVisible();
  });

  test('Validation: Cannot create a task without required fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Create New Task' }).click();
    
    // Try to submit without filling in required fields
    // Because HTML5 validation blocks the submit event, the modal will stay open
    await page.getByRole('button', { name: 'Create Task' }).click();
    
    // The modal should still be visible because the form didn't submit
    await expect(page.getByRole('heading', { name: 'Create New Task' })).toBeVisible();
  });

});
