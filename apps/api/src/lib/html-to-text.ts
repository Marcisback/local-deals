import { parse } from 'node-html-parser';

const REMOVED_SELECTORS = [
  'script',
  'style',
  'noscript',
  'nav',
  'template',
  'svg',
  'canvas',
  '[aria-hidden="true"]'
];

export function extractUsefulTextFromHtml(html: string, maxLength: number) {
  const root = parse(html);

  for (const selector of REMOVED_SELECTORS) {
    for (const element of root.querySelectorAll(selector)) {
      element.remove();
    }
  }

  const contentRoot = root.querySelector('main') ?? root.querySelector('body') ?? root;
  const normalized = contentRoot.structuredText
    .split(/\r?\n/)
    .map((line) => line.replace(/[\s\u00a0]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');

  return normalized.slice(0, maxLength).trim();
}
