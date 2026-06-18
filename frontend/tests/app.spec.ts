import { test, expect } from '@playwright/test';

test.describe('Frontend Layout & Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the events API call to return dummy data so tests don't rely on the backend
    await page.route('**/api/events', async (route) => {
      const json = [
        {
          id: 1,
          event_type: 'Accident',
          zone: 'Downtown',
          predicted_severity: 8.5,
          predicted_resolution_time_mins: 45,
          location: 'POINT(77.5946 12.9716)',
          status: 'Active',
          start_datetime: new Date().toISOString()
        }
      ];
      await route.fulfill({ json });
    });
    
    // We assume the Next.js API proxy routes to backend, but we mock the proxy too if needed.
    // The lib/api.ts seems to use relative paths if it's next.js API routes, or absolute to 8000.
    // We'll catch all common API patterns.
    await page.route('**/api/v1/events/', async (route) => {
       // Also intercept this if it goes to localhost:8000
       const json = [
        {
          id: 1,
          event_type: 'Accident',
          zone: 'Downtown',
          predicted_severity: 8.5,
          predicted_resolution_time_mins: 45,
          location: 'POINT(77.5946 12.9716)',
          status: 'Active',
          start_datetime: new Date().toISOString()
        }
      ];
      // Need to handle CORS preflight for Axios
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': '*',
          }
        });
      } else {
        await route.fulfill({
          json,
          headers: { 'Access-Control-Allow-Origin': '*' }
        });
      }
    });

    await page.goto('/');
  });

  test('main layout components load correctly', async ({ page }) => {
    // Check main title
    await expect(page.locator('h1')).toContainText(/Command Center/i);

    // Sidebar navigation check
    await expect(page.locator('nav').first()).toBeVisible();

    // The API mock should allow the loading spinner to disappear and render components
    // Map should render
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 });
  });

  test('map renders markers from mocked API', async ({ page }) => {
    // Check if the Map container is visible
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 });

    // Since we mocked an event at Downtown, Leaflet should render a marker icon
    // Leaflet markers usually have the class .leaflet-marker-icon
    const markers = page.locator('.leaflet-marker-icon');
    
    // We should have at least 1 marker based on our mock data
    await expect(markers.first()).toBeVisible({ timeout: 10000 });
  });
});
