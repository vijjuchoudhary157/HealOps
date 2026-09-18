import { test, expect } from '@playwright/test';

const getTestEmail = () => `e2e.test.${Date.now()}@example.com`;
const TEST_PASSWORD = 'password123!';

test.describe('Authentication Flow', () => {

  test('Protected route redirects to login', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page).toHaveURL('/login');
  });

  test('User can register successfully', async ({ page }) => {
    const testEmail = getTestEmail();
    await page.goto('/login');

    // Switch to Create Workspace mode
    await page.getByRole('button', { name: 'Create Workspace' }).click();

    // Fill in registration form
    await page.getByLabel('FULL NAME').fill('E2E Test User');
    await page.getByLabel('WORK EMAIL').fill(testEmail);
    await page.getByLabel('CLUSTER PASSKEY / CIPHER').fill(TEST_PASSWORD);

    // Submit
    await page.getByRole('button', { name: 'Create Reliability Workspace' }).click();

    // Verify successful registration redirects to dashboard/tasks
    await expect(page).toHaveURL('/dashboard');
  });

  test('User can login and logout successfully', async ({ page }) => {
    const testEmail = getTestEmail();
    
    // 1. Register a user first to guarantee existence
    await page.goto('/login');
    await page.getByRole('button', { name: 'Create Workspace' }).click();
    await page.getByLabel('FULL NAME').fill('E2E Test User');
    await page.getByLabel('WORK EMAIL').fill(testEmail);
    await page.getByLabel('CLUSTER PASSKEY / CIPHER').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Create Reliability Workspace' }).click();
    await expect(page).toHaveURL('/dashboard');

    // 2. Logout
    await page.getByTitle('Sign Out').click();
    await expect(page).toHaveURL('/login');

    // 3. Login again
    await page.getByLabel('WORK EMAIL').fill(testEmail);
    await page.getByLabel('CLUSTER PASSKEY / CIPHER').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In to Cluster Console' }).click();

    await expect(page).toHaveURL('/dashboard');
  });

  test('Invalid login shows error message', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('WORK EMAIL').fill('invalid.user@example.com');
    await page.getByLabel('CLUSTER PASSKEY / CIPHER').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign In to Cluster Console' }).click();

    // Verify error message is displayed
    await expect(page.locator('.bg-error-container')).toBeVisible();
    await expect(page.locator('.bg-error-container')).toContainText('Invalid credentials');
  });

});
