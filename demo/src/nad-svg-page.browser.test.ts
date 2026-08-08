/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { afterEach, expect, test } from 'vitest';

const waitForElement = async (selector: string): Promise<Element> => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
        const element = document.querySelector(selector);
        if (element) return element;
        await new Promise<void>((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`Unable to find ${selector}`);
};

const waitForLoadedStats = async (): Promise<string> => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
        const value = document.getElementById('nad-svg-stats')?.textContent ?? '';
        if (value.includes('voltage levels')) return value;
        await new Promise<void>((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('The selected SVG NAD did not finish loading');
};

afterEach(() => {
    window.dispatchEvent(new Event('beforeunload'));
    document.body.replaceChildren();
});

test('loads and replaces one interactive SVG NAD at a time', async () => {
    history.replaceState(null, '', `${window.location.pathname}?demo=nad-eurostag-tutorial-example1`);
    document.body.innerHTML = `
        <select id="nad-svg-select"></select>
        <button id="nad-svg-previous"></button>
        <button id="nad-svg-next"></button>
        <a id="nad-svg-link"></a>
        <a id="nad-svg-metadata-link"></a>
        <h2 id="nad-svg-title"></h2>
        <p id="nad-svg-description"></p>
        <p id="nad-svg-stats"></p>
        <div id="nad-svg-error" hidden></div>
        <div id="nad-svg-gallery-viewer" style="width: 900px; height: 700px"></div>
    `;

    await import('./nad-svg');
    const firstSvg = await waitForElement('#nad-svg-gallery-viewer svg');
    const firstStats = await waitForLoadedStats();
    expect(firstSvg.getAttribute('width')).toBe('900');
    expect(firstStats).toContain('branches');
    expect(document.querySelectorAll('#nad-svg-gallery-viewer > #nad-viewer')).toHaveLength(1);
    expect(document.getElementById('nad-svg-link')?.getAttribute('href')).toBeTruthy();
    expect(document.getElementById('nad-svg-metadata-link')?.getAttribute('href')).toBeTruthy();

    const select = document.getElementById('nad-svg-select') as HTMLSelectElement;
    expect(select.options.length).toBeGreaterThan(1);
    select.value = '1';
    select.dispatchEvent(new Event('change'));

    const secondSvg = await waitForElement('#nad-svg-gallery-viewer svg');
    await waitForLoadedStats();
    expect(secondSvg).not.toBe(firstSvg);
    expect(document.querySelectorAll('#nad-svg-gallery-viewer > #nad-viewer')).toHaveLength(1);
    expect(document.getElementById('nad-svg-title')?.textContent).toBe('IEEE 9 — zero impedance and multiple buses');
});
