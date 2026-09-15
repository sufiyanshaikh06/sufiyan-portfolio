import { test, expect } from '@playwright/test';

test.describe('Phase 3 Browser Exit Gate: Network & JS Isolation', () => {
  test('confirms zero browser-time Supabase database or Storage requests during hydration and interaction', async ({ page }) => {
    const recordedRequests: string[] = [];

    page.on('request', (request) => {
      recordedRequests.push(request.url());
    });

    // 1. Visit homepage
    const homeResponse = await page.goto('/');
    expect(homeResponse?.status()).toBe(200);

    // Wait for network idle to ensure any potential client-side fetch would have triggered
    await page.waitForLoadState('networkidle');

    // 2. Click through to Integrum case study
    const ctaLink = page.getByRole('link', { name: /explore integrum case study/i });
    await expect(ctaLink).toBeVisible();
    await ctaLink.click();

    await expect(page).toHaveURL('/projects/integrum');
    await page.waitForLoadState('networkidle');

    // 3. Inspect all recorded network requests
    const forbiddenPatterns = [
      '54321',
      'supabase.co',
      '/rest/v1',
      '/storage/v1',
    ];

    for (const reqUrl of recordedRequests) {
      for (const pattern of forbiddenPatterns) {
        expect(
          reqUrl.includes(pattern),
          `Forbidden runtime request detected: ${reqUrl} matched pattern: ${pattern}`
        ).toBe(false);
      }
    }
  });

  test('confirms full portfolio navigation and semantic content remain functional with JavaScript disabled', async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
    });
    const page = await context.newPage();

    // 1. Visit homepage with JS disabled
    const homeResponse = await page.goto('/');
    expect(homeResponse?.status()).toBe(200);

    // Initial HTML checks
    await expect(page.getByRole('heading', { level: 1, name: /sufiyan shaikh/i })).toBeVisible();
    await expect(page.getByText('Computer Science Student | Building Intelligent Software')).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: /integrum/i })).toBeVisible();

    // 2. Navigate to Integrum with JS disabled
    const ctaLink = page.getByRole('link', { name: /explore integrum case study/i });
    await ctaLink.click();

    await expect(page).toHaveURL('/projects/integrum');
    await expect(page.getByRole('heading', { level: 1, name: /integrum/i })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: /overview/i })).toBeVisible();

    // 3. Navigate back to home with JS disabled
    const backLink = page.getByRole('link', { name: /return to portfolio overview/i });
    await backLink.click();

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { level: 1, name: /sufiyan shaikh/i })).toBeVisible();

    await context.close();
  });

  const viewports = [
    { width: 320, height: 568, name: '320px (Mobile SE)' },
    { width: 390, height: 844, name: '390px (Mobile Standard)' },
    { width: 768, height: 1024, name: '768px (Tablet)' },
    { width: 1024, height: 768, name: '1024px (Small Desktop)' },
    { width: 1440, height: 900, name: '1440px (Large Desktop)' },
  ];

  for (const vp of viewports) {
    test(`confirms no horizontal overflow on homepage at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');

      const isOverflown = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      expect(isOverflown, `Horizontal overflow detected at viewport ${vp.name}`).toBe(false);
    });

    test(`confirms no horizontal overflow on Integrum case study at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/projects/integrum');

      const isOverflown = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      expect(isOverflown, `Horizontal overflow detected on case study at viewport ${vp.name}`).toBe(false);
    });
  }
});
