import Window from '../../../../src/window/Window.js';
import type Document from '../../../../src/nodes/document/Document.js';
import type HTMLElement from '../../../../src/nodes/html-element/HTMLElement.js';
import CSSComputedStyle from '../../../../src/css/declaration/computed-style/CSSComputedStyle.js';
import { beforeEach, describe, it, expect } from 'vitest';

describe('CSSComputedStyle', () => {
	let window: Window;
	let document: Document;
	let element: HTMLElement;

	beforeEach(() => {
		window = new Window();
		document = window.document;
		element = document.createElement('div');
	});

	describe('getComputedStyle()', () => {
		it('Is using a cache.', () => {
			document.body.appendChild(element);
			element.setAttribute('style', `border: 2px solid green;border-radius: 2px;font-size: 12px;`);

			const computedStyle = new CSSComputedStyle(element);
			const propertyManager = computedStyle.getComputedStyle();

			expect(propertyManager).toBe(computedStyle.getComputedStyle());
			element.setAttribute('style', `border: 2px solid green;`);

			expect(computedStyle.getComputedStyle()).not.toBe(propertyManager);
		});

		it('Parses variables correctly.', () => {
			document.body.appendChild(element);
			element.setAttribute(
				'style',
				`--bg-color: rgb(0 128 0 / 1); background-color: var(--bg-color);`
			);

			const computedStyle = new CSSComputedStyle(element);
			const propertyManager = computedStyle.getComputedStyle();

			expect(propertyManager.get('background-color')?.value).toBe('rgb(0 128 0 / 1)');
		});

		it('Parses nested variables correctly.', () => {
			document.body.appendChild(element);
			element.setAttribute(
				'style',
				`--bg-color-alpha: 1; background-color: rgb(0 128 0 / var(--bg-color-alpha, 1));`
			);

			const computedStyle = new CSSComputedStyle(element);
			const propertyManager = computedStyle.getComputedStyle();

			expect(propertyManager.get('background-color')?.value).toBe('rgb(0 128 0 / 1)');
		});

		it('Preserves var() with fallback value in a CSS property.', () => {
			document.body.appendChild(element);
			element.setAttribute('style', `width: var(--x, 10px);`);

			const computedStyle = new CSSComputedStyle(element);
			const propertyManager = computedStyle.getComputedStyle();

			expect(propertyManager.get('width')?.value).toBe('10px');
		});

		it('Preserves var() with nested fallback value (e.g. rgb()) in a CSS property.', () => {
			document.body.appendChild(element);
			element.setAttribute('style', `color: var(--primary, rgb(255, 0, 0));`);

			const computedStyle = new CSSComputedStyle(element);
			const propertyManager = computedStyle.getComputedStyle();

			expect(propertyManager.get('color')?.value).toBe('rgb(255, 0, 0)');
		});

		it('Uses fallback value for var() with for list of RGB colors in a CSS property.', () => {
			document.body.appendChild(element);
			element.setAttribute('style', `background-color: rgb(var(--my-background, 255, 255, 255));`);

			const computedStyle = new CSSComputedStyle(element);
			const propertyManager = computedStyle.getComputedStyle();

			expect(propertyManager.get('background-color')?.value).toBe('rgb(255, 255, 255)');
		});

		it('Uses variable when there is a fallback value for var() with for list of RGB colors in a CSS property.', () => {
			document.body.appendChild(element);
			element.setAttribute(
				'style',
				`--my-background: 255, 219, 0; background-color: rgb(var(--my-background, 255, 255, 255));`
			);

			const computedStyle = new CSSComputedStyle(element);
			const propertyManager = computedStyle.getComputedStyle();

			expect(propertyManager.get('background-color')?.value).toBe('rgb(255, 219, 0)');
		});

		it('Resolves every var() in a value, not only the first one.', () => {
			document.body.appendChild(element);
			element.setAttribute(
				'style',
				`--box: 20px; --gap: 2px; width: calc(5 * var(--box) + 6 * var(--gap)); height: calc(var(--gap) + var(--gap));`
			);

			const computedStyle = new CSSComputedStyle(element);
			const propertyManager = computedStyle.getComputedStyle();

			expect(propertyManager.get('width')?.value).toBe('calc(5 * 20px + 6 * 2px)');
			expect(propertyManager.get('height')?.value).toBe('calc(2px + 2px)');
		});

		it('Resolves var() with fallback after an earlier var() in a shorthand value.', () => {
			document.body.appendChild(element);
			element.setAttribute('style', `--x: 16px; margin: var(--x) var(--x, 4px) var(--y, 8px);`);

			const computedStyle = new CSSComputedStyle(element);
			const propertyManager = computedStyle.getComputedStyle();

			expect(propertyManager.get('margin-top')?.value).toBe('16px');
			expect(propertyManager.get('margin-right')?.value).toBe('16px');
			expect(propertyManager.get('margin-bottom')?.value).toBe('8px');
		});

		it('Ignores invalid CSS variable fallback value.', () => {
			document.body.appendChild(element);
			element.setAttribute('style', `width: var(--my-width, invalid);`);

			const computedStyle = new CSSComputedStyle(element);
			const propertyManager = computedStyle.getComputedStyle();

			expect(propertyManager.get('width')).toBe(null);
		});
	});

	describe('Selector matching class pre-filter', () => {
		it('Applies a rule only to elements that have the required subject class.', () => {
			document.head.appendChild(
				Object.assign(document.createElement('style'), {
					textContent: '.highlight { background-color: rgb(255, 0, 0); }'
				})
			);

			const matched = document.createElement('div');
			matched.className = 'highlight';
			const unmatched = document.createElement('div');
			document.body.appendChild(matched);
			document.body.appendChild(unmatched);

			const matchedColor = new CSSComputedStyle(matched)
				.getComputedStyle()
				.get('background-color')?.value;
			const unmatchedColor = new CSSComputedStyle(unmatched)
				.getComputedStyle()
				.get('background-color')?.value;

			expect(matchedColor).toBe('rgb(255, 0, 0)');
			expect(unmatchedColor).not.toBe(matchedColor);
		});

		it('Does not apply a rule when every selector group requires a class the element lacks.', () => {
			document.head.appendChild(
				Object.assign(document.createElement('style'), {
					textContent: '.a, .b { background-color: rgb(0, 0, 255); }'
				})
			);

			const elementNoClass = document.createElement('span');
			const elementWithClass = document.createElement('span');
			elementWithClass.className = 'b';
			document.body.appendChild(elementNoClass);
			document.body.appendChild(elementWithClass);

			const noClassColor = new CSSComputedStyle(elementNoClass)
				.getComputedStyle()
				.get('background-color')?.value;
			const withClassColor = new CSSComputedStyle(elementWithClass)
				.getComputedStyle()
				.get('background-color')?.value;

			expect(withClassColor).toBe('rgb(0, 0, 255)');
			expect(noClassColor).not.toBe(withClassColor);
		});

		it('Lets matches() evaluate ancestors when the subject class is present.', () => {
			document.head.appendChild(
				Object.assign(document.createElement('style'), {
					textContent: '.container .item { color: rgb(1, 2, 3); }'
				})
			);

			const inside = document.createElement('div');
			inside.className = 'item';
			const container = document.createElement('div');
			container.className = 'container';
			container.appendChild(inside);
			document.body.appendChild(container);

			const outside = document.createElement('div');
			outside.className = 'item';
			document.body.appendChild(outside);

			const insideColor = new CSSComputedStyle(inside).getComputedStyle().get('color')?.value;
			const outsideColor = new CSSComputedStyle(outside).getComputedStyle().get('color')?.value;

			expect(insideColor).toBe('rgb(1, 2, 3)');
			expect(outsideColor).not.toBe(insideColor);
		});

		it('Applies rules whose subject compound has no class requirement.', () => {
			document.head.appendChild(
				Object.assign(document.createElement('style'), {
					textContent: 'div { border-bottom-width: 3px; }'
				})
			);

			const child = document.createElement('div');
			document.body.appendChild(child);

			const borderBottomWidth = new CSSComputedStyle(child)
				.getComputedStyle()
				.get('border-bottom-width')?.value;

			expect(borderBottomWidth).toBe('3px');
		});

		it('Handles pseudo-class arguments like :not() without false positives.', () => {
			document.head.appendChild(
				Object.assign(document.createElement('style'), {
					textContent: 'div:not(.excluded) { margin-left: 7px; }'
				})
			);

			const included = document.createElement('div');
			const excluded = document.createElement('div');
			excluded.className = 'excluded';
			document.body.appendChild(included);
			document.body.appendChild(excluded);

			const includedMargin = new CSSComputedStyle(included)
				.getComputedStyle()
				.get('margin-left')?.value;
			const excludedMargin = new CSSComputedStyle(excluded)
				.getComputedStyle()
				.get('margin-left')?.value;

			expect(includedMargin).toBe('7px');
			expect(excludedMargin).not.toBe('7px');
		});
	});
});
