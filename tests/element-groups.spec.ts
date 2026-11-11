import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissInfoDialog } from './helpers/app';

const text = (id: string, value: string, x: number) => ({ id, type: 'text', text: value, x, y: 10, width: 100, height: 40, fontSize: 24, fontFamily: 'Arial, sans-serif' });

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await waitForAppReady(page);
  await dismissInfoDialog(page);
});

test('selects only text elements referencing the chosen exact template field', async ({ page }) => {
  const elements = [text('a', '{{CableLabel}}', 0), text('b', 'prefix {{ CableLabel }}', 110), text('c', '{{CableLabel2}}', 220), { id: 'd', type: 'barcode', barcodeData: '{{CableLabel}}', x: 0, y: 60, width: 100, height: 40 }];
  await page.locator('#import-file-input').setInputFiles({ name: 'design.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ elements, labelSize: { width: 60, height: 30 } })) });
  await page.click('#element-groups-btn');
  await expect(page.locator('#element-groups-btn')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#element-groups-list button')).toHaveCount(2);
  await page.getByRole('button', { name: '{{CableLabel}}', exact: true }).click();
  await expect(page.locator('#element-groups-dropdown')).toBeHidden();
  await expect(page.locator('#props-empty')).toContainText('2 elements selected');
  await page.click('#element-groups-btn');
  await page.getByRole('button', { name: '{{CableLabel2}}', exact: true }).click();
  await expect(page.locator('#prop-text-content')).toHaveValue('{{CableLabel2}}');
});

test('shows an empty state when no text fields exist', async ({ page }) => {
  await page.click('#element-groups-btn');
  await expect(page.locator('#element-groups-list')).toHaveText('No text fields');
});
