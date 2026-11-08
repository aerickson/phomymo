import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissInfoDialog } from './helpers/app';

async function importDesign(page, mixed = false) {
  const base = { type: 'text', width: 100, height: 40, y: 10, rotation: 0, groupId: 'g', fontFamily: 'Arial, sans-serif', fontSize: 24, color: 'black', fontWeight: 'normal', align: 'left' };
  const elements = [
    { ...base, id: 'a', x: 10, text: 'One' },
    { ...base, id: 'b', x: 130, text: 'Two', fontSize: 32 },
  ];
  if (mixed) elements[1] = { ...elements[1], type: 'shape', shapeType: 'rectangle' } as any;
  await page.locator('#import-file-input').setInputFiles({ name: 'design.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ elements, labelSize: { width: 40, height: 30 } })) });
  await page.click('#elements-btn');
  await page.locator('[data-element-id="a"]').click();
}
async function exported(page) {
  await page.click('#export-btn');
  const download = page.waitForEvent('download');
  await page.click('#export-json-btn');
  const file = await download;
  const stream = await file.createReadStream();
  let data = '';
  for await (const chunk of stream) data += chunk.toString();
  return JSON.parse(data).elements;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await waitForAppReady(page);
  await dismissInfoDialog(page);
});

test('shared text formatting preserves content and positions and can be undone', async ({ page }) => {
  await importDesign(page);
  await expect(page.locator('#props-text')).toBeVisible();
  await expect(page.locator('#props-text-content')).toBeHidden();
  await expect(page.locator('#props-transform')).toBeHidden();
  await expect(page.locator('#prop-font-size')).toHaveValue('');
  await page.locator('#prop-font-family').selectOption('Roboto, sans-serif');
  await page.locator('#prop-font-size').fill('42');
  await page.locator('#prop-font-size').blur();
  await page.click('#style-bold');
  await page.click('.align-btn[data-align="right"]');
  let elements = await exported(page);
  expect(elements.map(e => [e.text, e.x, e.fontFamily, e.fontSize, e.fontWeight, e.align])).toEqual([
    ['One', 10, 'Roboto, sans-serif', 42, 'bold', 'right'],
    ['Two', 130, 'Roboto, sans-serif', 42, 'bold', 'right'],
  ]);
  await page.keyboard.press('ControlOrMeta+z');
  elements = await exported(page);
  expect(elements.map(e => e.align)).toEqual(['left', 'left']);
});

test('mixed element selections keep the existing empty properties panel', async ({ page }) => {
  await importDesign(page, true);
  await expect(page.locator('#props-content')).toBeHidden();
  await expect(page.locator('#props-empty')).toContainText('2 elements selected');
});
