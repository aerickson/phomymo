import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissInfoDialog, screenshot } from './helpers/app';
import path from 'path';
import fs from 'fs';

const CH = '04-templates-batch';

test.describe.serial('Templates and Batch Printing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await waitForAppReady(page);
    await dismissInfoDialog(page);
  });

  test('create text with template field', async ({ page }) => {
    await page.click('#add-text');
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    await page.locator('#prop-text-content').fill('{{Name}} - ${{Price}}');
    await page.locator('#prop-text-content').dispatchEvent('input');
    await page.waitForTimeout(500);

    await expect(page.locator('#template-toolbar-btn')).toBeVisible({ timeout: 5000 });

    await screenshot(page, CH, 1, 'template-field-in-text');
  });

  test('open template panel', async ({ page }) => {
    // Add element with template fields
    await page.click('#add-text');
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await page.locator('#prop-text-content').fill('{{Name}} - ${{Price}}');
    await page.locator('#prop-text-content').dispatchEvent('input');
    await page.waitForTimeout(500);

    await page.click('#template-toolbar-btn');
    await expect(page.locator('#template-panel')).toBeVisible();

    await screenshot(page, CH, 2, 'template-panel-open');
  });

  test('import CSV data', async ({ page }) => {
    // Setup: add template field and open data dialog
    await page.click('#add-text');
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await page.locator('#prop-text-content').fill('{{Name}} - ${{Price}}');
    await page.locator('#prop-text-content').dispatchEvent('input');
    await page.waitForTimeout(500);

    await page.click('#template-toolbar-btn');
    await expect(page.locator('#template-panel')).toBeVisible();

    await page.click('#template-manage-data');
    await expect(page.locator('#template-data-dialog')).toBeVisible();
    await screenshot(page, CH, 3, 'template-data-dialog-empty');

    // Import CSV
    const csvPath = path.join(__dirname, 'fixtures', 'sample.csv');
    await page.locator('#template-csv-input').setInputFiles(csvPath);
    await page.waitForTimeout(500);

    // Verify data loaded
    const rows = page.locator('#template-data-body tr');
    await expect(rows).not.toHaveCount(0);

    await screenshot(page, CH, 4, 'csv-data-imported');
  });

  test('preview labels', async ({ page }) => {
    // Full setup: template field + CSV data + preview
    await page.click('#add-text');
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await page.locator('#prop-text-content').fill('{{Name}} - ${{Price}}');
    await page.locator('#prop-text-content').dispatchEvent('input');
    await page.waitForTimeout(500);

    await page.click('#template-toolbar-btn');
    await page.click('#template-manage-data');
    await expect(page.locator('#template-data-dialog')).toBeVisible();

    const csvPath = path.join(__dirname, 'fixtures', 'sample.csv');
    await page.locator('#template-csv-input').setInputFiles(csvPath);
    await page.waitForTimeout(500);

    await page.click('#template-preview-btn');
    await expect(page.locator('#preview-dialog')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000); // Wait for previews to render

    await screenshot(page, CH, 5, 'preview-grid');
  });
  test('share outline visibility between grid and full preview', async ({ page }) => {
    const design = JSON.parse(fs.readFileSync(path.join(__dirname, '../templates/cable-tag-4850-52-4.02x1.89.json'), 'utf8'));
    design.templateData = [{ CableLabel: 'TEST' }, { CableLabel: 'NEXT' }];
    await page.locator('#import-file-input').setInputFiles({ name: 'design.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(design)) });
    await expect(page.locator('#template-toolbar-btn')).toBeVisible();
    await page.click('#template-toolbar-btn');
    await page.click('#template-quick-preview');
    const gridCheckbox = page.locator('#preview-cutlines');
    const thumbnail = page.locator('#preview-grid .preview-canvas').first();
    await expect(thumbnail).toBeVisible();
    const gridWithout = await thumbnail.evaluate((el: HTMLCanvasElement) => el.toDataURL());
    await gridCheckbox.check();
    expect(await thumbnail.evaluate((el: HTMLCanvasElement) => el.toDataURL())).not.toBe(gridWithout);
    await page.locator('.preview-thumbnail').first().click();
    const checkbox = page.locator('#full-preview-cutlines');
    await expect(checkbox).toBeChecked();
    await checkbox.uncheck();
    await expect(gridCheckbox).not.toBeChecked();
    const canvas = page.locator('#full-preview-canvas');
    const without = await canvas.evaluate((el: HTMLCanvasElement) => el.toDataURL());
    await checkbox.check();
    await expect(gridCheckbox).toBeChecked();
    const withOutlines = await canvas.evaluate((el: HTMLCanvasElement) => el.toDataURL());
    expect(withOutlines).not.toBe(without);
    await page.click('#full-preview-next');
    await expect(checkbox).toBeChecked();
    await page.click('#full-preview-prev');
    await checkbox.uncheck();
    expect(await canvas.evaluate((el: HTMLCanvasElement) => el.toDataURL())).toBe(without);
    await page.click('#full-preview-close');
    await expect(gridCheckbox).not.toBeChecked();
    expect(await thumbnail.evaluate((el: HTMLCanvasElement) => el.toDataURL())).toBe(gridWithout);
  });

});
