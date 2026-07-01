/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { bandColor, branchKey, loadRatio } from '../core/datamodel.js';
import { bandPath, overloadBandPath, trianglePath } from '../core/geometry.js';
import type { StackCoord, StackCoordOffset } from '../core/layout.js';
import type { BusRecord, SankeyScenario } from '../core/types.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const LABEL_GAP_STACK_FRACTION = 0.1;
const LABEL_GAP_STATE_FRACTION = 0.01;

function n(v: number): string {
    return String(Number.parseFloat(v.toPrecision(10)));
}

export interface SvgElements {
    diagramGroup: SVGGElement;
    bands: SVGPathElement[];
    overloadBands: SVGPathElement[];
    pins: SVGLineElement[];
    markers: SVGPathElement[];
    labels: SVGTextElement[];
    branchKeys: string[];
    pMaxValues: number[];
}

export interface RenderState {
    states: Map<string, number>;
    flows: Map<string, number>;
    stackCoord: StackCoord;
    stackCoordOffset: StackCoordOffset;
    stretch: number;
    isHorizontal: boolean;
}

function el<T extends SVGElement>(tag: string): T {
    return document.createElementNS(SVG_NS, tag) as T;
}

// create all SVG elements for a scenario
export function createSvgStructure(svg: SVGSVGElement, scenario: SankeyScenario): SvgElements {
    const g = el<SVGGElement>('g');
    svg.appendChild(g);

    const bands: SVGPathElement[] = [];
    const overloadBands: SVGPathElement[] = [];
    const branchKeys: string[] = [];
    const pMaxValues: number[] = [];

    for (const br of scenario.branches) {
        const band = el<SVGPathElement>('path');
        band.setAttribute('class', 'band');
        band.setAttribute('fill-opacity', '0.7');
        g.appendChild(band);
        bands.push(band);

        const overload = el<SVGPathElement>('path');
        overload.setAttribute('class', 'overload-band');
        overload.setAttribute('fill', 'red');
        overload.setAttribute('fill-opacity', '0.5');
        overload.setAttribute('visibility', 'hidden');
        g.appendChild(overload);
        overloadBands.push(overload);

        branchKeys.push(branchKey(br));
        pMaxValues.push(br.p_max);
    }

    const pins: SVGLineElement[] = [];
    const markers: SVGPathElement[] = [];
    const labels: SVGTextElement[] = [];

    for (const bus of scenario.buses) {
        const pin = el<SVGLineElement>('line');
        pin.setAttribute('class', 'pin');
        pin.setAttribute('stroke', 'black');
        pin.setAttribute('stroke-width', '4');
        pin.setAttribute('vector-effect', 'non-scaling-stroke');
        g.appendChild(pin);
        pins.push(pin);

        const marker = el<SVGPathElement>('path');
        marker.setAttribute('class', 'marker');
        marker.setAttribute('fill', 'steelblue');
        marker.setAttribute('fill-opacity', '0.8');
        g.appendChild(marker);
        markers.push(marker);

        const label = el<SVGTextElement>('text');
        label.setAttribute('class', 'label');
        label.textContent = bus.label ?? bus.id;
        g.appendChild(label);
        labels.push(label);
    }

    return { diagramGroup: g, bands, overloadBands, pins, markers, labels, branchKeys, pMaxValues };
}

interface BusFrameContext {
    sMin: number;
    sMax: number;
    ux: number;
    uy: number;
    triangleWidth: number;
    injection: Map<string, number>;
}

function updateBusElement(
    pin: SVGLineElement,
    marker: SVGPathElement,
    label: SVGTextElement,
    bus: BusRecord,
    state: RenderState,
    maxpmax: Map<string, number>,
    ctx: BusFrameContext
): void {
    const { states, stackCoord, stretch, isHorizontal } = state;
    const { sMin, sMax, ux, uy, triangleWidth, injection } = ctx;
    const x = states.get(bus.id) ?? 0;
    const sc = (stackCoord.get(bus.id) ?? 0) * stretch;
    const mpm = maxpmax.get(bus.id) ?? 0;
    const yLo = sc - mpm / 2;
    const yHi = sc + mpm / 2;

    if (isHorizontal) {
        pin.setAttribute('x1', String(-x));
        pin.setAttribute('x2', String(-x));
        pin.setAttribute('y1', String(yLo));
        pin.setAttribute('y2', String(yHi));
    } else {
        pin.setAttribute('x1', String(yLo));
        pin.setAttribute('x2', String(yHi));
        pin.setAttribute('y1', String(-x));
        pin.setAttribute('y2', String(-x));
    }
    const labelGapStack = mpm * LABEL_GAP_STACK_FRACTION;
    const labelGapState = Math.max(1e-6, sMax - sMin) * LABEL_GAP_STATE_FRACTION;
    const lx = isHorizontal ? -x + labelGapState : yLo - labelGapStack;
    const ly = isHorizontal ? yLo - labelGapStack : -x - labelGapState;
    label.setAttribute('transform', `translate(${n(lx)} ${n(ly)}) scale(${n(ux)} ${n(uy)})`);

    const netInj = injection.get(bus.id) ?? 0;
    const absInj = Math.abs(netInj);
    if (absInj > 0) {
        const tw = triangleWidth;
        const markerX = netInj > 0 ? x : x + tw;
        const markerW = isHorizontal ? tw : -tw;
        marker.setAttribute('d', trianglePath(markerX, yHi - absInj, yHi, markerW, isHorizontal));
    } else {
        marker.setAttribute('d', '');
    }
}

export function updateAttributes(
    elements: SvgElements,
    scenario: SankeyScenario,
    state: RenderState,
    maxpmax: Map<string, number>
): void {
    const { bands, overloadBands, pins, markers, labels, branchKeys, pMaxValues } = elements;
    const { states, flows, stackCoord, stackCoordOffset, stretch, isHorizontal } = state;

    const injection = new Map<string, number>();
    for (const bus of scenario.buses) injection.set(bus.id, 0);
    for (let i = 0; i < scenario.branches.length; i++) {
        const br = scenario.branches[i];
        const flow = flows.get(branchKeys[i]) ?? 0;
        injection.set(br.from_bus, (injection.get(br.from_bus) ?? 0) - flow);
        injection.set(br.to_bus, (injection.get(br.to_bus) ?? 0) + flow);
    }

    const stateVals = [...states.values()];
    const sMin = Math.min(...stateVals);
    const sMax = Math.max(...stateVals);
    const triangleWidth = Math.max(1e-6, sMax - sMin) / 100;

    const svgEl = elements.diagramGroup.ownerSVGElement!;
    const vb = svgEl.viewBox.baseVal;
    const svgW = Math.max(1, svgEl.clientWidth);
    const svgH = Math.max(1, svgEl.clientHeight);
    const ux = vb.width / svgW;
    const uy = vb.height / svgH;

    // Update branches
    for (let i = 0; i < scenario.branches.length; i++) {
        const br = scenario.branches[i];
        const flow = flows.get(branchKeys[i]) ?? 0;
        const absFlow = flow < 0 ? -flow : flow;
        const pMax = pMaxValues[i];

        const x1 = states.get(br.from_bus) ?? 0;
        const x2 = states.get(br.to_bus) ?? 0;
        const y1 =
            (stackCoord.get(br.from_bus) ?? 0) * stretch + (stackCoordOffset.get(br.from_bus)?.get(br.to_bus) ?? 0);
        const y2 =
            (stackCoord.get(br.to_bus) ?? 0) * stretch + (stackCoordOffset.get(br.to_bus)?.get(br.from_bus) ?? 0);

        bands[i].setAttribute('d', bandPath(x1, x2, y1, y2, absFlow, isHorizontal));
        bands[i].setAttribute('fill', bandColor(loadRatio(absFlow, pMax)));
        if (br.outage) {
            bands[i].setAttribute('stroke', 'black');
            bands[i].setAttribute('stroke-width', '2');
            bands[i].setAttribute('vector-effect', 'non-scaling-stroke');
        } else {
            bands[i].setAttribute('stroke', 'none');
        }

        const overloadPath = overloadBandPath(x1, x2, y1, y2, absFlow, pMax, isHorizontal);
        if (overloadPath === null) {
            overloadBands[i].setAttribute('visibility', 'hidden');
        } else {
            overloadBands[i].setAttribute('d', overloadPath);
            overloadBands[i].setAttribute('visibility', 'visible');
        }
    }

    // Update buses
    const ctx: BusFrameContext = { sMin, sMax, ux, uy, triangleWidth, injection };
    for (let i = 0; i < scenario.buses.length; i++) {
        updateBusElement(pins[i], markers[i], labels[i], scenario.buses[i], state, maxpmax, ctx);
    }
}

export function fitViewBox(
    svg: SVGSVGElement,
    scenario: SankeyScenario,
    state: RenderState,
    maxpmax: Map<string, number>
): void {
    const { states, stackCoord, stretch, isHorizontal } = state;

    let xMin = Infinity;
    let xMax = -Infinity;
    let yMin = Infinity;
    let yMax = -Infinity;

    for (const bus of scenario.buses) {
        const x = states.get(bus.id) ?? 0;
        const sc = (stackCoord.get(bus.id) ?? 0) * stretch;
        const mpm = maxpmax.get(bus.id) ?? 0;
        xMin = Math.min(x, xMin);
        xMax = Math.max(x, xMax);
        const lo = sc - mpm / 2;
        const hi = sc + mpm / 2;
        yMin = Math.min(lo, yMin);
        yMax = Math.max(hi, yMax);
    }

    if (!Number.isFinite(xMin)) {
        xMin = -1;
        xMax = 1;
    }
    if (!Number.isFinite(yMin)) {
        yMin = -1;
        yMax = 1;
    }

    const xPad = Math.max(1e-6, xMax - xMin) * 0.05;
    const yPad = Math.max(1e-6, yMax - yMin) * 0.1;

    const vbY = yMin - yPad;
    const vbW = xMax - xMin + 2 * xPad;
    const vbH = yMax - yMin + 2 * yPad;

    if (isHorizontal) {
        svg.setAttribute('viewBox', `${-xMax - xPad} ${vbY} ${vbW} ${vbH}`);
    } else {
        const svgXMin = yMin - yPad;
        const svgYMin = -xMax - xPad;
        const svgW = yMax - yMin + 2 * yPad;
        const svgH = xMax - xMin + 2 * xPad;
        svg.setAttribute('viewBox', `${svgXMin} ${svgYMin} ${svgW} ${svgH}`);
    }
    svg.setAttribute('preserveAspectRatio', 'none');
}
