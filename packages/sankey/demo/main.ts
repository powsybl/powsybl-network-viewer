/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { SankeyRenderer, type LayoutState, type Orientation } from '../src/index.js';
import scenarios from './scenarios_pypowsybl.json';
const { baseline, contingency } = scenarios;

const container = document.querySelector<HTMLElement>('#svg-container')!;
const renderer = new SankeyRenderer(container, baseline);
renderer.startLayout();

function download(filename: string, content: string, mime: string): void {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: mime }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

function upload(accept: string, onLoad: (text: string) => void): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (!file) return;
        void file.text().then(onLoad);
    });
    input.click();
}

let orientation: Orientation = 'vertical';
const btnOrientation = document.getElementById('btn-orientation')!;
btnOrientation.addEventListener('click', () => {
    orientation = orientation === 'vertical' ? 'horizontal' : 'vertical';
    renderer.setOrientation(orientation);
    btnOrientation.textContent = orientation;
});

document.getElementById('btn-stop')!.addEventListener('click', () => renderer.stopLayout());
document.getElementById('btn-autoscale')!.addEventListener('click', () => renderer.autoscale());
function setActiveScenario(id: string): void {
    const btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
    const btnN1 = document.getElementById('btn-n1') as HTMLButtonElement;
    btnReset.classList.remove('btn-active');
    btnN1.classList.remove('btn-active');
    btnReset.disabled = id === 'btn-reset';
    btnN1.disabled = id === 'btn-n1';
    document.getElementById(id)!.classList.add('btn-active');
}
setActiveScenario('btn-reset');

document.getElementById('btn-n1')!.addEventListener('click', () => {
    renderer.updateScenarioFlows(contingency);
    setActiveScenario('btn-n1');
});
document.getElementById('btn-reset')!.addEventListener('click', () => {
    renderer.updateScenarioFlows(baseline);
    setActiveScenario('btn-reset');
});
document
    .getElementById('btn-export-svg')!
    .addEventListener('click', () => download('sankey.svg', renderer.exportSVG(), 'image/svg+xml'));
document
    .getElementById('btn-export-layout')!
    .addEventListener('click', () =>
        download('layout.json', JSON.stringify(renderer.exportLayout(), null, 2), 'application/json')
    );

function makeSlider(
    label: string,
    min: string,
    max: string,
    value: string,
    onInput: (v: number) => void
): HTMLInputElement {
    const row = document.createElement('div');
    row.className = 'slider-row';
    const span = document.createElement('span');
    span.textContent = label;
    row.appendChild(span);
    const input = document.createElement('input');
    input.type = 'range';
    input.min = min;
    input.max = max;
    input.value = value;
    input.step = 'any';
    input.addEventListener('input', () => onInput(Number(input.value)));
    row.appendChild(input);
    document.getElementById('sliders')?.appendChild(row);
    return input;
}

const stretchSlider = makeSlider('stretch:', '-10', '10', '1', (v) => renderer.setStretch(v));
const alignSlider = makeSlider('align:', '0', '10', '5', (v) => {
    renderer.setAlign(v);
    renderer.startLayout();
});
const repulseSlider = makeSlider('repulse:', '0', '10', '5', (v) => {
    renderer.setRepulse(v);
    renderer.startLayout();
});

document.getElementById('btn-import-layout')!.addEventListener('click', () =>
    upload('application/json', (text) => {
        try {
            const data = JSON.parse(text) as LayoutState;
            renderer.importLayout(data);
            stretchSlider.value = String(data.params.stretch);
            alignSlider.value = String(data.params.align);
            repulseSlider.value = String(data.params.repulse);
        } catch (e) {
            alert(`Failed to load layout: ${e instanceof Error ? e.message : String(e)}`);
        }
    })
);
