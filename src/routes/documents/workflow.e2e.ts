import { test, expect } from '@playwright/test';

test.describe('Workflow E2E Happy Path', () => {
	test('should go through the entire author -> reviewer -> admin -> viewer cycle', async ({ page }) => {
		// 1. Visit login page and log in as Alice (Author)
		await page.goto('/login');
		await page.selectOption('select[name="userId"]', { label: 'Alice (Author) (AUTHOR)' });
		await page.click('button[type="submit"]');

		// Verify redirected to documents dashboard
		await expect(page).toHaveURL('/documents');
		await expect(page.locator('h1')).toContainText('Document Workspace');

		// 2. Create new draft
		await page.click('a:has-text("Create New Draft")');
		await expect(page).toHaveURL('/documents/new');

		const title = `E2E Test Doc - ${Date.now()}`;
		await page.fill('input[name="title"]', title);
		await page.fill('textarea[name="body"]', 'This is the initial draft body for E2E testing.');
		await page.click('button:has-text("Save Draft")');

		// Should redirect to detail view
		await expect(page).toHaveURL(/\/documents\/[a-f0-9-]+/);
		await expect(page.locator('.version-tag')).toContainText('Version 1');
		await expect(page.locator('.status-badge-row .badge')).toContainText('draft');

		// 3. Edit draft
		await page.click('button:has-text("Edit Content")');
		await page.fill('textarea[name="body"]', 'This is the UPDATED draft body for E2E testing.');
		await page.click('button:has-text("Save Changes")');

		await expect(page.locator('.version-tag')).toContainText('Version 2');
		await expect(page.locator('.document-body')).toContainText('UPDATED draft body');

		// 4. Submit for review
		await page.click('button:has-text("Submit for Review")');
		await expect(page.locator('.status-badge-row .badge')).toContainText('submitted');
		await expect(page.locator('.version-tag')).toContainText('Version 3');

		// Get document details page URL
		const docUrl = page.url();

		// 5. Switch to Bob (Reviewer) using the layout simulation dropdown
		await page.selectOption('select.switcher-select', { label: 'Bob (Reviewer) (REVIEWER)' });
		await page.waitForURL(docUrl); // Loader should run and update page state

		// 6. Approve the document
		await page.click('button:has-text("Approve Document")');
		await expect(page.locator('.status-badge-row .badge')).toContainText('approved');
		await expect(page.locator('.version-tag')).toContainText('Version 4');

		// 7. Switch to Admin to publish the document
		await page.selectOption('select.switcher-select', { label: 'Admin (Administrator) (ADMIN)' });
		await page.waitForURL(docUrl);

		// Publish approved document
		await page.click('button:has-text("Publish Document")');
		await expect(page.locator('.status-badge-row .badge')).toContainText('published');
		await expect(page.locator('.version-tag')).toContainText('Version 5');

		// 8. Switch to Viewer to verify read-only access
		await page.selectOption('select.switcher-select', { label: 'Viewer (Viewer) (VIEWER)' });
		await page.waitForURL(docUrl);

		await expect(page.locator('.document-body')).toContainText('UPDATED draft body');
		// Verify viewer cannot see any workflow action buttons
		await expect(page.locator('button:has-text("Edit Content")')).toHaveCount(0);
		await expect(page.locator('button:has-text("Submit")')).toHaveCount(0);
		await expect(page.locator('button:has-text("Approve")')).toHaveCount(0);

		// 9. Verify history logs
		const timeline = page.locator('.timeline');
		await expect(timeline).toContainText('create');
		await expect(timeline).toContainText('edit');
		await expect(timeline).toContainText('submit');
		await expect(timeline).toContainText('approve');
		await expect(timeline).toContainText('publish');
	});
});
