/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { SVG } from '@svgdotjs/svg.js';
import type { Svg } from '@svgdotjs/svg.js';
import '@svgdotjs/svg.panzoom.js';
import { branchKey, createMaxpmax, parseSfpd } from '../core/datamodel.js';
import {
    buildLayoutIndex,
    flatFromMap,
    flatToMap,
    initStackCoord,
    randomReset,
    rearrangeStackCoord,
    rearrangeStackCoordOffset,
} from '../core/layout.js';
import type { LayoutIndex, StackCoord, StackCoordOffset } from '../core/layout.js';
import { createFlowTransitionState, isTransitionDone, transitFlowsState, updateFlows } from '../core/statemanager.js';
import type { FlowTransitionState } from '../core/statemanager.js';
import type { LayoutState, Orientation, SankeyOptions, SankeyScenario, Sfpd } from '../core/types.js';
import { RafLoop } from './rafloop.js';
import { createSvgStructure, fitViewBox, updateAttributes } from './renderer.js';
import type { RenderState, SvgElements } from './renderer.js';

export class SankeyRenderer {
    private readonly svg: SVGSVGElement;
    private readonly svgDraw: Svg | undefined;
    private scenario!: SankeyScenario;
    private svgElements!: SvgElements;
    private sfpd!: Map<string, Sfpd>;
    private maxpmax!: Map<string, number>;
    private layoutIndex!: LayoutIndex;
    private scFlat!: Float64Array;
    private scFlatPrev!: Float64Array;
    private scFlatPrev2!: Float64Array;
    private scFlatDisplay!: Float64Array;
    private stFlat!: Float64Array;
    private _layoutStartTime = 0;
    private static readonly MAX_LAYOUT_MS = 2000;
    private stackCoord!: StackCoord;
    private stackCoordOffset!: StackCoordOffset;
    private ts!: FlowTransitionState;
    private stretch = 1;
    private rawAlign = 5;
    private rawRepulse = 5;
    private tanStrength = Math.pow(10, this.rawAlign - 5);
    private dRepulse = Math.pow(10, this.rawRepulse - 5);
    private isHorizontal = false;
    private readonly rafLoop: RafLoop;

    constructor(container: HTMLElement, scenario: SankeyScenario, options?: SankeyOptions) {
        this.svgDraw = SVG().addTo(container);
        this.svg = this.svgDraw.node;
        if (options?.width && options?.height) {
            this.svg.style.width = `${options.width}px`;
            this.svg.style.height = `${options.height}px`;
        } else {
            this.svg.removeAttribute('width');
            this.svg.removeAttribute('height');
            this.svg.style.width = '100%';
            this.svg.style.height = '100%';
        }
        this._init(scenario);
        let fitZoom: number;
        try {
            fitZoom = this.svgDraw.zoom();
        } catch {
            fitZoom = Number.NaN;
        }
        this.svgDraw.panZoom({
            panning: true,
            zoomFactor: 0.2,
            zoomMin: Number.isFinite(fitZoom) && fitZoom > 0 ? fitZoom * 0.1 : 0.001,
            zoomMax: Number.isFinite(fitZoom) && fitZoom > 0 ? fitZoom * 200 : 5000,
        });
        this.rafLoop = new RafLoop((dt) => this._tick(dt));
    }

    private _init(scenario: SankeyScenario): void {
        this.scenario = { ...scenario, branches: scenario.branches.map((br) => ({ ...br })) };
        const busIds = scenario.buses.map((b) => b.id);
        const flows = new Map(scenario.branches.map((br) => [branchKey(br), br.flow]));
        const states = new Map(scenario.buses.map((b) => [b.id, b.voltage_angle]));

        this.sfpd = parseSfpd(busIds, scenario.branches, flows);
        this.maxpmax = createMaxpmax(this.sfpd, flows);
        this.layoutIndex = buildLayoutIndex(busIds, this.sfpd, this.maxpmax);

        const N = this.layoutIndex.N;
        this.scFlat = new Float64Array(N);
        this.scFlatPrev = new Float64Array(N);
        this.scFlatPrev2 = new Float64Array(N);
        this.scFlatDisplay = new Float64Array(N);
        this.stFlat = new Float64Array(N);

        const { stackCoord, stackCoordOffset } = initStackCoord(busIds, scenario.branches);
        const mpmMax = Math.max(...this.maxpmax.values(), 1);
        randomReset(stackCoord, 2 * mpmMax * Math.sqrt(scenario.buses.length));
        this.stackCoord = stackCoord;
        this.stackCoordOffset = stackCoordOffset;
        flatFromMap(this.layoutIndex, stackCoord, this.scFlat);
        this.scFlatDisplay.set(this.scFlat);
        flatFromMap(this.layoutIndex, states, this.stFlat);

        rearrangeStackCoordOffset(this.stackCoordOffset, states, flows, this.stackCoord, this.sfpd, this.maxpmax);

        this.ts = createFlowTransitionState(states, flows);
        this.svgElements = createSvgStructure(this.svg, scenario);
        this._setInitialViewBox();
    }

    private _setInitialViewBox(): void {
        const { states, isHorizontal } = this._buildRenderState();
        const mpmMax = Math.max(...this.maxpmax.values(), 1);
        const stackExt = mpmMax * Math.sqrt(this.scenario.buses.length);

        const stateVals = [...states.values()];
        const sMin = Math.min(...stateVals);
        const sMax = Math.max(...stateVals);
        const sPad = Math.max(1e-6, sMax - sMin) * 0.05;
        const stPad = stackExt * 0.1;

        this.svg.setAttribute('preserveAspectRatio', 'none');
        if (isHorizontal) {
            this.svg.setAttribute(
                'viewBox',
                `${-sMax - sPad} ${-stackExt - stPad} ${sMax - sMin + 2 * sPad} ${2 * stackExt + 2 * stPad}`
            );
        } else {
            this.svg.setAttribute(
                'viewBox',
                `${-stackExt - stPad} ${-sMax - sPad} ${2 * stackExt + 2 * stPad} ${sMax - sMin + 2 * sPad}`
            );
        }
    }

    private _buildRenderState(): RenderState {
        return {
            states: this.ts.currentStates,
            flows: this.ts.currentFlows,
            stackCoord: this.stackCoord,
            stackCoordOffset: this.stackCoordOffset,
            stretch: this.stretch,
            isHorizontal: this.isHorizontal,
        };
    }

    private _tick(dt: number): void {
        transitFlowsState(this.ts);
        flatFromMap(this.layoutIndex, this.ts.currentStates, this.stFlat);

        this.scFlatPrev2.set(this.scFlatPrev);
        this.scFlatPrev.set(this.scFlat);

        rearrangeStackCoord(
            this.layoutIndex,
            this.scFlat,
            this.stFlat,
            this.ts.currentFlows,
            this.tanStrength,
            this.dRepulse
        );

        const emaTimeConstantMs = 120;
        const emaWeight = 1 - Math.exp(-dt / emaTimeConstantMs);
        for (let i = 0; i < this.layoutIndex.N; i++) {
            this.scFlatDisplay[i] += (this.scFlat[i] - this.scFlatDisplay[i]) * emaWeight;
        }

        const mpmMax = Math.max(...this.maxpmax.values(), 1);
        const eps = mpmMax * 1e-4;
        let maxDelta = 0;
        for (let i = 0; i < this.layoutIndex.N; i++) {
            const d = Math.abs(this.scFlat[i] - this.scFlatPrev2[i]);
            if (d > maxDelta) maxDelta = d;
        }
        const elapsed = Date.now() - this._layoutStartTime;
        const converged = maxDelta < eps || elapsed >= SankeyRenderer.MAX_LAYOUT_MS;
        if (converged && isTransitionDone(this.ts)) {
            for (let i = 0; i < this.layoutIndex.N; i++) {
                this.scFlat[i] = (this.scFlat[i] + this.scFlatPrev[i]) * 0.5;
            }
            this.scFlatDisplay.set(this.scFlat);
            this.rafLoop.stop();
        }

        flatToMap(this.layoutIndex, this.scFlatDisplay, this.stackCoord);
        rearrangeStackCoordOffset(
            this.stackCoordOffset,
            this.ts.currentStates,
            this.ts.currentFlows,
            this.stackCoord,
            this.sfpd,
            this.maxpmax
        );
        updateAttributes(this.svgElements, this.scenario, this._buildRenderState(), this.maxpmax);
    }

    update(scenario: SankeyScenario): void {
        this.svgElements.diagramGroup.remove();
        this._init(scenario);
    }

    updateScenarioFlows(scenario: SankeyScenario): void {
        const flows = new Map(scenario.branches.map((br) => [branchKey(br), br.flow]));
        const states = new Map(scenario.buses.map((b) => [b.id, b.voltage_angle]));

        const branchMeta = new Map(scenario.branches.map((br) => [branchKey(br), br]));
        for (let i = 0; i < this.scenario.branches.length; i++) {
            const key = this.svgElements.branchKeys[i];
            const newBr = branchMeta.get(key);
            if (newBr) {
                this.scenario.branches[i].outage = newBr.outage;
                this.scenario.branches[i].p_max = newBr.p_max;
                this.svgElements.pMaxValues[i] = newBr.p_max;
            } else {
                this.scenario.branches[i].outage = true;
            }
        }

        const busIds = this.scenario.buses.map((b) => b.id);
        this.sfpd = parseSfpd(busIds, this.scenario.branches, flows);
        this.maxpmax = createMaxpmax(this.sfpd, flows);
        for (let i = 0; i < this.layoutIndex.N; i++) {
            this.layoutIndex.mpmFlat[i] = this.maxpmax.get(this.layoutIndex.busArr[i]) ?? 0;
        }

        updateFlows(this.ts, states, flows);
        this.startLayout();
    }

    setOrientation(o: Orientation): void {
        this.isHorizontal = o === 'horizontal';
        this._setInitialViewBox();
        updateAttributes(this.svgElements, this.scenario, this._buildRenderState(), this.maxpmax);
    }

    setStretch(v: number): void {
        this.stretch = v;
        updateAttributes(this.svgElements, this.scenario, this._buildRenderState(), this.maxpmax);
    }

    setAlign(v: number): void {
        this.rawAlign = v;
        this.tanStrength = Math.pow(10, v - 5);
        updateAttributes(this.svgElements, this.scenario, this._buildRenderState(), this.maxpmax);
    }

    setRepulse(v: number): void {
        this.rawRepulse = v;
        this.dRepulse = Math.pow(10, v - 5);
        updateAttributes(this.svgElements, this.scenario, this._buildRenderState(), this.maxpmax);
    }

    startLayout(): void {
        this._layoutStartTime = Date.now();
        this.rafLoop.start();
    }

    stopLayout(): void {
        this.rafLoop.stop();
    }

    isRunning(): boolean {
        return this.rafLoop.isRunning();
    }

    exportLayout(): LayoutState {
        flatToMap(this.layoutIndex, this.scFlat, this.stackCoord);
        const layout: Record<string, number> = {};
        for (const [busId, v] of this.stackCoord) layout[busId] = v;
        return {
            version: 1,
            params: { stretch: this.stretch, align: this.rawAlign, repulse: this.rawRepulse },
            layout,
        };
    }

    importLayout(data: LayoutState): void {
        this.rafLoop.stop();
        for (const [busId, v] of Object.entries(data.layout)) this.stackCoord.set(busId, v);
        flatFromMap(this.layoutIndex, this.stackCoord, this.scFlat);
        this.scFlatPrev.set(this.scFlat);
        this.scFlatPrev2.set(this.scFlat);
        this.scFlatDisplay.set(this.scFlat);
        this.stretch = data.params.stretch;
        this.rawAlign = data.params.align;
        this.tanStrength = Math.pow(10, data.params.align - 5);
        this.rawRepulse = data.params.repulse;
        this.dRepulse = Math.pow(10, data.params.repulse - 5);
        rearrangeStackCoordOffset(
            this.stackCoordOffset,
            this.ts.currentStates,
            this.ts.currentFlows,
            this.stackCoord,
            this.sfpd,
            this.maxpmax
        );
        updateAttributes(this.svgElements, this.scenario, this._buildRenderState(), this.maxpmax);
    }

    exportSVG(): string {
        return new XMLSerializer().serializeToString(this.svg);
    }

    autoscale(): void {
        const g = this.svgElements.diagramGroup;
        if (typeof g.getBBox === 'function') {
            const bbox = g.getBBox();
            if (bbox.width > 0 && bbox.height > 0) {
                const padX = bbox.width * 0.05;
                const padY = bbox.height * 0.1;
                this.svgDraw?.viewbox(bbox.x - padX, bbox.y - padY, bbox.width + 2 * padX, bbox.height + 2 * padY);
                updateAttributes(this.svgElements, this.scenario, this._buildRenderState(), this.maxpmax);
                return;
            }
        }
        flatToMap(this.layoutIndex, this.scFlat, this.stackCoord);
        fitViewBox(this.svg, this.scenario, this._buildRenderState(), this.maxpmax);
        updateAttributes(this.svgElements, this.scenario, this._buildRenderState(), this.maxpmax);
    }
}
