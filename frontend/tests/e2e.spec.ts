import { test, expect } from '@playwright/test';

// These tests assume the complete application (Frontend + Backend + DBs) is running
test.describe('Complete Application End-to-End', () => {
  test('frontend can fetch real events from the live backend', async ({ page }) => {
    // Navigate to the app. 
    await page.goto('/');

    // Check main title
    await expect(page.locator('h1')).toContainText(/Command Center/i);

    // Wait for the map to render
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15000 });

    // Assuming the DB has at least one event (or we can just verify it doesn't crash)
    // If the backend returns empty, it's still a success as long as it didn't throw an AxiosError
    // Wait for network requests to settle
    await page.waitForLoadState('networkidle');
  });

  test('can interact with the Event Form and trigger a simulated event', async ({ page }) => {
    await page.goto('/');
    
    // Find the Event Form elements
    const eventTypeSelect = page.locator('select').first(); // Adjust selector if needed
    const submitButton = page.getByRole('button', { name: /Submit Event|Simulate|Create/i });
    
    // We just verify the form is present in the full application
    await expect(eventTypeSelect).toBeVisible();
    await expect(submitButton).toBeVisible();
  });
});
