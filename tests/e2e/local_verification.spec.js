import { test, expect } from '@playwright/test';

const getTestEmail = () => `e2e.verify.${Date.now()}.${Math.floor(Math.random() * 10000)}@healops.io`;
const TEST_PASSWORD = 'password123!';

test.describe('Local End-to-End Application & Phase 9C Verification', () => {

  test('Full Walkthrough: Auth, Dashboard, Tasks, Incidents, AI Analysis & Failure Cases', async ({ page, request }) => {
    test.setTimeout(60000);

    // -----------------------------------------------------------------
    // 1. LOGIN & AUTHENTICATION
    // -----------------------------------------------------------------
    const testEmail = getTestEmail();
    await page.goto('/login');
    await expect(page).toHaveURL('/login');

    // Register fresh user
    await page.getByRole('button', { name: 'Create Workspace' }).click();
    await page.getByLabel('FULL NAME').fill('SRE Verification User');
    await page.getByLabel('WORK EMAIL').fill(testEmail);
    await page.getByLabel('CLUSTER PASSKEY / CIPHER').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Create Reliability Workspace' }).click();

    // -----------------------------------------------------------------
    // 2. DASHBOARD LOADS CORRECTLY WITH LOCAL ENVIRONMENT INDICATORS
    // -----------------------------------------------------------------
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1', { hasText: 'Cluster Overview' })).toBeVisible();

    // Verify local compose environment indicators (not hardcoded prod / k8s)
    await expect(page.getByText('LOCAL COMPOSE')).toBeVisible();
    await expect(page.getByText('Backend & DB Healthy')).toBeVisible();
    await expect(page.getByText('Verified (/ready)')).toBeVisible();

    // Verify HealOps logo is present and loaded
    const logo = page.locator('img[alt="HealOps Logo"]');
    await expect(logo).toBeVisible();

    await page.screenshot({ path: 'test-results/01-dashboard.png' });

    // -----------------------------------------------------------------
    // 3. TASK CREATION, EDITING, AND DELETION
    // -----------------------------------------------------------------
    await page.goto('/tasks');
    await expect(page.locator('h1', { hasText: 'Task Management' })).toBeVisible();

    const taskTitle = `Verification Task ${Date.now()}`;
    const taskDesc = 'Verification of task lifecycle in Phase 9C local verification';

    await page.getByRole('button', { name: 'Create New Task' }).click();
    await page.getByLabel('Task Title').fill(taskTitle);
    await page.getByLabel('Description').fill(taskDesc);
    await page.getByLabel('Priority').selectOption('high');
    await page.getByRole('button', { name: 'Create Task' }).click();

    // Verify created
    await expect(page.getByText(taskTitle)).toBeVisible();

    // Complete task
    const taskRow = page.locator('tr', { hasText: taskTitle });
    await taskRow.getByTitle('Complete').click();
    await expect(taskRow).toContainText(/completed/i);

    // Delete task
    await taskRow.getByTitle('Delete').click();
    await expect(page.getByText(taskTitle)).not.toBeVisible();
    await page.screenshot({ path: 'test-results/02-tasks.png' });

    // -----------------------------------------------------------------
    // 4. INGEST REAL INCIDENT & VERIFY INCIDENTS PAGE
    // -----------------------------------------------------------------
    const synthFingerprint = 'fp-local-verify-fixed-e2e';
    const webhookRes = await request.post('http://localhost:5000/api/incidents/webhook', {
      headers: {
        Authorization: 'Bearer your_alertmanager_webhook_token_here',
        'Content-Type': 'application/json'
      },
      data: {
        alerts: [{
          status: 'firing',
          fingerprint: synthFingerprint,
          labels: {
            alertname: 'HighContainerMemoryUsage',
            severity: 'critical',
            component: 'backend',
            pod: 'healops-backend-docker',
            container: 'backend',
            namespace: 'healops'
          },
          annotations: {
            summary: 'Container memory working set approaching 85% limit in healops-backend',
            description: 'Container backend working set memory is 142MiB approaching allocated limit 150MiB.'
          },
          startsAt: new Date().toISOString()
        }]
      }
    });
    expect(webhookRes.ok()).toBeTruthy();

    await page.goto('/incidents');
    await expect(page.locator('h1', { hasText: 'Incident Management' })).toBeVisible();

    // Search or find our incident row
    await page.getByPlaceholder('Search alerts or summary...').fill('HighContainerMemoryUsage');
    await page.keyboard.press('Enter');

    const incidentRow = page.locator('tr', { hasText: 'HighContainerMemoryUsage' }).first();
    await expect(incidentRow).toBeVisible();
    await page.screenshot({ path: 'test-results/03-incidents.png' });

    // -----------------------------------------------------------------
    // 5. INCIDENT DETAILS AND TIMELINE DISPLAY
    // -----------------------------------------------------------------
    await incidentRow.locator('button', { hasText: 'timeline' }).click();
    await expect(page.getByRole('heading', { name: 'HighContainerMemoryUsage' })).toBeVisible();
    await expect(page.getByText('Incident Audit & Event Timeline')).toBeVisible();
    await expect(page.getByText('Alert started firing: Container memory working set').first()).toBeVisible();
    await page.screenshot({ path: 'test-results/04-incident-modal.png' });

    // -----------------------------------------------------------------
    // 6. TRIGGER ROOT CAUSE ANALYSIS FROM MODAL
    // -----------------------------------------------------------------
    const rcaButton = page.getByRole('button', { name: 'Root Cause Analysis' });
    await expect(rcaButton).toBeVisible();
    await rcaButton.click();

    // Navigates to AI Analysis page with incidentId param
    await expect(page).toHaveURL(/\/ai-analysis\?incidentId=\d+/);
    await expect(page.locator('h1', { hasText: 'Incident Diagnostics' })).toBeVisible();

    // Click Run Diagnostics / Regenerate
    const runDiagnosticsBtn = page.getByRole('button', { name: /Run Diagnostics|Regenerate Analysis/i });
    await expect(runDiagnosticsBtn).toBeVisible();
    await runDiagnosticsBtn.click();

    // -----------------------------------------------------------------
    // 7. VERIFY ANALYSIS RESULTS DISPLAYED CORRECTLY
    // -----------------------------------------------------------------
    // Wait for analysis result to display
    await expect(page.getByText('Primary RCA Vector')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Container memory working set approaching cgroup limit in pod healops-backend-docker')).toBeVisible();

    // 8. EVIDENCE, CONFIDENCE, RECOMMENDED ACTIONS, AND ANALYSIS TYPE VISIBLE
    await expect(page.getByText('Diagnostic Confidence')).toBeVisible();
    await expect(page.getByText('Rule-Based Diagnostic (rule-based-engine)')).toBeVisible();
    await expect(page.getByText('0 Telemetry Corroborations')).toBeVisible();
    await expect(page.getByText('Probable Cause & Fault Domain')).toBeVisible();
    await expect(page.getByText('Correlated Prometheus Signals')).toBeVisible();
    await expect(page.getByText('Recommended Corrective Actions')).toBeVisible();
    await expect(page.getByText('Increase Container Memory Limit')).toBeVisible();
    await expect(page.getByText('Stream Large Payloads & Limit Heap Buffers')).toBeVisible();

    await page.screenshot({ path: 'test-results/05-ai-analysis-result.png', fullPage: true });

    // -----------------------------------------------------------------
    // 9. REGENERATING AN ANALYSIS CREATES A NEW PERSISTED RECORD & VERIFY REFRESH PERSISTENCE
    // -----------------------------------------------------------------
    const regenBtn = page.getByRole('button', { name: 'Regenerate Analysis' });
    await expect(regenBtn).toBeVisible();
    await regenBtn.click();

    await expect(page.getByText('Primary RCA Vector')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Stored in PostgreSQL')).toBeVisible();

    // Verify persistence across browser refresh (Issue 5)
    await page.reload();
    await expect(page.getByText('Primary RCA Vector')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Stored in PostgreSQL')).toBeVisible();
    await expect(page.getByText('0 Telemetry Corroborations')).toBeVisible();

    // -----------------------------------------------------------------
    // 10. FAILURE CASES
    // -----------------------------------------------------------------
    // Failure Case A: Non-existent incident ID (999999)
    await page.goto('/ai-analysis?incidentId=999999');
    await expect(page.getByText(/Incident with ID 999999 not found|Failed to retrieve analysis/i)).toBeVisible();

    await page.screenshot({ path: 'test-results/06-ai-analysis-error.png' });

    console.log('[E2E SUCCESS] All application features and failure cases verified successfully!');
  });
});
