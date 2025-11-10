import { test, expect } from '@playwright/test';

// This is one test case
test('homepage has correct title', async ({ page }) => {
  // Step 1: Go to the page
  await page.goto('https://example.com');

  // Step 2: Verify the title
  await expect(page).toHaveTitle(/Example Domain/);
});
