/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { SankeyRenderer, type LayoutState, type Orientation, type SankeyScenario } from '../src/index.js';

import scenariosVl4 from './scenarios_nway_vl4_pypowsybl.json';
import scenariosMerge from './scenarios_merge_demo_pypowsybl.json';
import scenariosContingencyOnly from './scenarios_pypowsybl.json';

interface ScenarioSet {
    baseline: SankeyScenario;
    contingency?: SankeyScenario;
    topology_change?: SankeyScenario;
}

const SCENARIOS: { label: string; data: ScenarioSet }[] = [
    { label: 'IEEE14 Split (VL4)', data: scenariosVl4 as ScenarioSet },
    { label: 'IEEE14 Merge (VL5)', data: scenariosMerge as ScenarioSet },
    { label: 'IEEE14 and contingency', data: scenariosContingencyOnly as ScenarioSet },
];

let { baseline, contingency, topology_change } = SCENARIOS[0].data;

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
    const btnTopology = document.getElementById('btn-topology-change') as HTMLButtonElement | null;
    btnReset.classList.remove('btn-active');
    btnN1.classList.remove('btn-active');
    if (btnTopology) btnTopology.classList.remove('btn-active');
    btnReset.disabled = id === 'btn-reset';
    btnN1.disabled = id === 'btn-n1';
    if (btnTopology) btnTopology.disabled = id === 'btn-topology-change';
    document.getElementById(id)!.classList.add('btn-active');
}
setActiveScenario('btn-reset');

let topologyChanged = false;

const btnTopology = document.getElementById('btn-topology-change') as HTMLButtonElement;
btnTopology.style.display = topology_change ? '' : 'none';
btnTopology.addEventListener('click', () => {
    if (!topology_change) return;
    renderer.updateTopology(topology_change);
    topologyChanged = true;
    setActiveScenario('btn-topology-change');
});

document.getElementById('btn-n1')!.addEventListener('click', () => {
    if (!contingency) return;
    if (topologyChanged) {
        renderer.updateTopology(contingency);
        topologyChanged = false;
    } else {
        renderer.updateScenarioFlows(contingency);
    }
    setActiveScenario('btn-n1');
});
document.getElementById('btn-reset')!.addEventListener('click', () => {
    if (topologyChanged) {
        renderer.updateTopology(baseline);
        topologyChanged = false;
    } else {
        renderer.updateScenarioFlows(baseline);
    }
    setActiveScenario('btn-reset');
});

const scenarioSelect = document.getElementById('scenario-select') as HTMLSelectElement;
SCENARIOS.forEach((s, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = s.label;
    scenarioSelect.appendChild(opt);
});
scenarioSelect.value = '0';

function loadScenario(index: number): void {
    ({ baseline, contingency, topology_change } = SCENARIOS[index].data);
    topologyChanged = false;
    renderer.update(baseline);
    renderer.startLayout();
    btnTopology.style.display = topology_change ? '' : 'none';
    setActiveScenario('btn-reset');
}

scenarioSelect.addEventListener('change', () => loadScenario(Number(scenarioSelect.value)));
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
