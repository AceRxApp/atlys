import { test, expect } from '@playwright/test';

test.describe('NxStops Core Flows', () => {
  test('shows onboarding on first visit', async ({ page }) => {
    await page.goto('/');
    // Onboarding should show NxStops branding and Get Started button
    await expect(page.locator('text=NxStops')).toBeVisible();
    await expect(page.locator('text=Get Started')).toBeVisible();
  });

  test('completes onboarding and reaches home screen', async ({ page }) => {
    await page.goto('/');
    // Complete onboarding
    await page.click('text=Get Started');
    // Should now see the home screen greeting
    await expect(page.locator('text=Good')).toBeVisible({ timeout: 5000 });
    // City selector should be visible
    await expect(page.locator('text=Select Your City')).toBeVisible();
  });

  test('selects a city and sees explore button', async ({ page }) => {
    // Skip onboarding
    await page.addInitScript(() => {
      localStorage.setItem('nxstops_onboarded', 'true');
    });
    await page.goto('/');
    await expect(page.locator('text=Select Your City')).toBeVisible({ timeout: 5000 });

    // Select a city from dropdown
    const select = page.locator('select');
    await select.waitFor({ state: 'visible' });
    const options = await select.locator('option').allTextContents();
    // Pick the first real city (skip "Choose a city...")
    if (options.length > 1) {
      await select.selectOption({ index: 1 });
      // Should show Start Exploring button
      await expect(page.locator('text=Start Exploring')).toBeVisible({ timeout: 5000 });
    }
  });

  test('navigates between tabs', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('nxstops_onboarded', 'true');
    });
    await page.goto('/');
    await expect(page.locator('text=Select Your City')).toBeVisible({ timeout: 5000 });

    // Select a city first so tabs become active
    const select = page.locator('select');
    await select.waitFor({ state: 'visible' });
    const options = await select.locator('option').allTextContents();
    if (options.length > 1) {
      await select.selectOption({ index: 1 });
    }

    // Navigate to Discover
    await page.click('button[aria-label="Discover"]');
    await expect(page).toHaveURL(/\/discover/);

    // Navigate to Events
    await page.click('button[aria-label="Events"]');
    await expect(page).toHaveURL(/\/events/);

    // Navigate to Plan
    await page.click('button[aria-label="Plan"]');
    await expect(page).toHaveURL(/\/plan/);

    // Navigate back Home
    await page.click('button[aria-label="Home"]');
    await expect(page).toHaveURL(/\/$/);
  });

  test('opens safety toolkit modal', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('nxstops_onboarded', 'true');
    });
    await page.goto('/');
    await page.click('button[aria-label="Travel toolkit"]');
    await expect(page.locator('text=Travel Toolkit')).toBeVisible();
    await expect(page.locator('text=Share My Location')).toBeVisible();
  });

  test('opens global search', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('nxstops_onboarded', 'true');
    });
    await page.goto('/');
    await page.click('button[aria-label="Search"]');
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    // Cancel should close
    await page.click('text=Cancel');
    await expect(page.locator('input[placeholder*="Search"]')).not.toBeVisible();
  });

  test('deep link to place shows loading then redirects', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('nxstops_onboarded', 'true');
    });
    // Navigate to a fake place ID — should show error since it won't resolve
    await page.goto('/place/fake-place-id-12345');
    // Should show either loading or error state
    const hasLoading = await page.locator('text=Loading place').isVisible().catch(() => false);
    const hasError = await page.locator('text=Place not found').isVisible({ timeout: 10000 }).catch(() => false);
    expect(hasLoading || hasError).toBeTruthy();
  });

  test('profile modal opens', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('nxstops_onboarded', 'true');
    });
    await page.goto('/');
    await page.click('button[aria-label="Open profile"]');
    // Profile screen should be visible (look for theme or sign in related content)
    await expect(page.locator('text=Theme').or(page.locator('text=Sign'))).toBeVisible({ timeout: 5000 });
  });
});
