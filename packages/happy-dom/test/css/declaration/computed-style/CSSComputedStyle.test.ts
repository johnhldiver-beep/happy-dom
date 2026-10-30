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

	describe('Overflow shorthand and cross-axis computed values', () => {
		const getOverflow = (cssText: string): [string, string] => {
			document.body.appendChild(element);
			element.setAttribute('style', cssText);

			const computedStyle = new CSSComputedStyle(element);
			const propertyManager = computedStyle.getComputedStyle();

			return [
				propertyManager.get('overflow-x')?.value || '',
				propertyManager.get('overflow-y')?.value || ''
			];
		};

		it('Expands the overflow shorthand to both axis longhands.', () => {
			expect(getOverflow('overflow: auto')).toEqual(['auto', 'auto']);
			expect(getOverflow('overflow: hidden auto')).toEqual(['hidden', 'auto']);
			expect(getOverflow('overflow: visible')).toEqual(['visible', 'visible']);
			expect(getOverflow('overflow: clip')).toEqual(['clip', 'clip']);
		});

		it('Computes visible as auto on the other axis when one axis is neither visible nor clip.', () => {
			expect(getOverflow('overflow-x: hidden')).toEqual(['hidden', 'auto']);
			expect(getOverflow('overflow-y: scroll')).toEqual(['auto', 'scroll']);
			expect(getOverflow('overflow-x: visible; overflow-y: hidden')).toEqual(['auto', 'hidden']);
			expect(getOverflow('overflow-x: visible; overflow-y: auto')).toEqual(['auto', 'auto']);
			expect(getOverflow('overflow-x: auto; overflow-y: visible')).toEqual(['auto', 'auto']);
			expect(getOverflow('overflow-x: scroll; overflow-y: visible')).toEqual(['scroll', 'auto']);
		});

		it('Computes clip as hidden on the other axis when one axis is neither visible nor clip.', () => {
			expect(getOverflow('overflow-x: clip; overflow-y: scroll')).toEqual(['hidden', 'scroll']);
			expect(getOverflow('overflow-x: scroll; overflow-y: clip')).toEqual(['scroll', 'hidden']);
		});

		it('Does not convert a visible or clip axis when both axes are visible or clip.', () => {
			expect(getOverflow('overflow-x: visible; overflow-y: clip')).toEqual(['visible', 'clip']);
			expect(getOverflow('overflow-x: clip; overflow-y: visible')).toEqual(['clip', 'visible']);
		});

		it('Applies the cross-axis rules through Window.getComputedStyle().', () => {
			document.body.appendChild(element);
			element.style.cssText = 'overflow: clip scroll';

			const style = window.getComputedStyle(element);

			expect(style.overflowX).toBe('hidden');
			expect(style.overflowY).toBe('scroll');
		});
	});
});
