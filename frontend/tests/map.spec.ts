import { test, expect } from '@playwright/test';

test.describe('Map Integration Tests', () => {
  test('handles 500 error gracefully without crashing app', async ({ page }) => {
    // Mock the events API call to return 500 error
    await page.route('**/api/v1/events/', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({
          status: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': '*' }
        });
      } else {
        await route.fulfill({ status: 500, json: { error: 'Internal Server Error' }, headers: { 'Access-Control-Allow-Origin': '*' } });
      }
    });
    
    await page.goto('/');

    // Ensure the page doesn't crash completely (white screen of death)
    await expect(page.locator('h1')).toContainText(/Command Center/i);
    // The map itself should still be visible even if data fails to load
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 });
  });

  test('map renders correctly without data', async ({ page }) => {
    // Mock the events API call to return empty array
    await page.route('**/api/v1/events/', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({
          status: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': '*' }
        });
      } else {
        await route.fulfill({ json: [], headers: { 'Access-Control-Allow-Origin': '*' } });
      }
    });
    
    await page.goto('/');

    // Map container should still render
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 });
    
    // No markers should be present
    const markers = page.locator('.leaflet-marker-icon');
    await expect(markers).toHaveCount(0);
  });
});
