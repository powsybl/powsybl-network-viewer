/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SankeyRenderer } from './sankey-renderer.js';
import type { LayoutState, SankeyScenario } from '../core/types.js';
import { busSplitResult, busSplitSmall } from '../testUtils/bus-split.test.utils.js';

// @ts-expect-error -- the ESM source ships without type declarations
vi.mock('@svgdotjs/svg.panzoom.js', () => import('@svgdotjs/svg.panzoom.js/src/svg.panzoom.js'));

const scenario: SankeyScenario = {
    buses: [
        { id: 'A', voltage_angle: 0 },
        { id: 'B', voltage_angle: -0.1 },
        { id: 'C', voltage_angle: 0 },
    ],
    branches: [
        { from_bus: 'A', to_bus: 'B', flow: 50, p_max: 100 },
        { from_bus: 'A', to_bus: 'C', flow: 30, p_max: 80 },
        { from_bus: 'B', to_bus: 'C', flow: 0, p_max: 60 },
    ],
};

function makeContainer(): HTMLDivElement {
    return document.createElement('div');
}

afterEach(() => {
    vi.useRealTimers();
});

describe('SankeyRenderer - lifecycle', () => {
    it('constructor does not throw', () => {
        expect(() => new SankeyRenderer(makeContainer(), scenario)).not.toThrow();
    });

    it('isRunning() is false before startLayout()', () => {
        const r = new SankeyRenderer(makeContainer(), scenario);
        expect(r.isRunning()).toBe(false);
    });

    it('isRunning() is true after startLayout()', () => {
        vi.useFakeTimers();
        const r = new SankeyRenderer(makeContainer(), scenario);
        r.startLayout();
        expect(r.isRunning()).toBe(true);
        r.stopLayout();
    });

    it('isRunning() is false after stopLayout()', () => {
        vi.useFakeTimers();
        const r = new SankeyRenderer(makeContainer(), scenario);
        r.startLayout();
        r.stopLayout();
        expect(r.isRunning()).toBe(false);
    });
});

describe('SankeyRenderer - convergence', () => {
    it('layout stops automatically once positions converge', () => {
        vi.useFakeTimers();
        const r = new SankeyRenderer(makeContainer(), scenario);
        r.startLayout();
        for (let i = 0; i < 60; i++) vi.advanceTimersByTime(16);
        expect(r.isRunning()).toBe(false);
    });

    it('layout stops after MAX_LAYOUT_MS if not converged', () => {
        vi.useFakeTimers();
        const r = new SankeyRenderer(makeContainer(), scenario);
        r.startLayout();
        vi.advanceTimersByTime(2001);
        expect(r.isRunning()).toBe(false);
    });
});

describe('SankeyRenderer - importLayout round-trip', () => {
    it('importLayout stops the layout loop', () => {
        vi.useFakeTimers();
        const r = new SankeyRenderer(makeContainer(), scenario);
        r.startLayout();
        expect(r.isRunning()).toBe(true);
        r.importLayout(r.exportLayout());
        expect(r.isRunning()).toBe(false);
    });

    it('importLayout then exportLayout produces same layout values', () => {
        const r = new SankeyRenderer(makeContainer(), scenario);
        const saved = r.exportLayout();
        r.setStretch(3);
        r.importLayout(saved);
        const restored = r.exportLayout();
        expect(restored.params.stretch).toBe(saved.params.stretch);
        expect(restored.params.align).toBe(saved.params.align);
        expect(restored.params.repulse).toBe(saved.params.repulse);
        for (const busId of Object.keys(saved.layout)) {
            expect(restored.layout[busId]).toBeCloseTo(saved.layout[busId], 10);
        }
    });
});

describe('SankeyRenderer - updateScenarioFlows', () => {
    it('does not throw', () => {
        const r = new SankeyRenderer(makeContainer(), scenario);
        expect(() => r.updateScenarioFlows(scenario)).not.toThrow();
    });

    it('SVG still contains bus labels after flow update', () => {
        const container = makeContainer();
        const r = new SankeyRenderer(container, scenario);
        r.updateScenarioFlows(scenario);
        const labels = Array.from(container.querySelectorAll('text')).map((el) => el.textContent);
        expect(labels).toContain('A');
    });

    it('throws on bus topology mismatch (incoming has bus not in current)', () => {
        const r = new SankeyRenderer(makeContainer(), scenario);
        const mismatch: SankeyScenario = {
            buses: [
                { id: 'A', voltage_angle: 0 },
                { id: 'B', voltage_angle: -0.1 },
                { id: 'D', voltage_angle: 0.05 },
            ],
            branches: scenario.branches,
        };
        expect(() => r.updateScenarioFlows(mismatch)).toThrow(/topology mismatch/);
    });

    it('throws on branch topology mismatch (incoming is missing a branch)', () => {
        const r = new SankeyRenderer(makeContainer(), scenario);
        const mismatch: SankeyScenario = {
            buses: scenario.buses,
            branches: [
                { from_bus: 'A', to_bus: 'B', flow: 50, p_max: 100 },
                { from_bus: 'A', to_bus: 'C', flow: 30, p_max: 80 },
            ],
        };
        expect(() => r.updateScenarioFlows(mismatch)).toThrow(/topology mismatch/);
    });

    it('does not throw on same topology with different flows and angles', () => {
        const r = new SankeyRenderer(makeContainer(), scenario);
        const sameTopology: SankeyScenario = {
            buses: [
                { id: 'A', voltage_angle: 0.01 },
                { id: 'B', voltage_angle: -0.12 },
                { id: 'C', voltage_angle: 0.005 },
            ],
            branches: [
                { from_bus: 'A', to_bus: 'B', flow: 75, p_max: 100 },
                { from_bus: 'A', to_bus: 'C', flow: 45, p_max: 80 },
                { from_bus: 'B', to_bus: 'C', flow: 15, p_max: 60 },
            ],
        };
        expect(() => r.updateScenarioFlows(sameTopology)).not.toThrow();
    });
});

describe('SankeyRenderer - updateTopology', () => {
    it('does not throw on a bus-split scenario', () => {
        const r = new SankeyRenderer(makeContainer(), busSplitSmall);
        expect(() => r.updateTopology(busSplitResult)).not.toThrow();
    });

    it('bus-split with inherited_positions: new buses start near the predecessor stack position, distinct from each other', () => {
        const r = new SankeyRenderer(makeContainer(), busSplitSmall);
        const savedLayout = r.exportLayout();
        const predPos = savedLayout.layout['A'];

        r.updateTopology(busSplitResult);
        const afterLayout = r.exportLayout();

        expect(Math.abs(afterLayout.layout['A1'] - predPos)).toBeLessThan(1);
        expect(Math.abs(afterLayout.layout['A2'] - predPos)).toBeLessThan(1);
        expect(afterLayout.layout['A1']).not.toBe(afterLayout.layout['A2']);
    });

    it('bus-split without inherited_positions: new bus stack positions ≈ 0 (within jitter)', () => {
        const r = new SankeyRenderer(makeContainer(), busSplitSmall);
        const noInherit: SankeyScenario = { ...busSplitResult };
        delete noInherit.inherited_positions;

        r.updateTopology(noInherit);
        const { layout } = r.exportLayout();

        expect(Math.abs(layout['A1'])).toBeLessThan(0.1);
        expect(Math.abs(layout['A2'])).toBeLessThan(0.1);
    });

    it('bus-split: persisting bus stack position unchanged after updateTopology', () => {
        const r = new SankeyRenderer(makeContainer(), busSplitSmall);
        const preSplitLayout = r.exportLayout();
        const persistingPos_B = preSplitLayout.layout['B'];

        r.updateTopology(busSplitResult);
        const postSplitLayout = r.exportLayout();

        expect(postSplitLayout.layout['B']).toBeCloseTo(persistingPos_B, 10);
    });

    it('bus-merge: removed bus labels absent from DOM', () => {
        const c = makeContainer();
        const r2 = new SankeyRenderer(c, busSplitResult);
        r2.updateTopology(busSplitSmall);

        const labels = Array.from(c.querySelectorAll('text')).map((el) => el.textContent);
        expect(labels).not.toContain('A1');
        expect(labels).not.toContain('A2');
        expect(labels).toContain('A');
    });

    it('branch added: band count increases', () => {
        const c = makeContainer();
        const r = new SankeyRenderer(c, busSplitSmall);
        const bandsBefore = c.querySelectorAll('.band').length;

        r.updateTopology(busSplitResult);
        const bandsAfter = c.querySelectorAll('.band').length;

        expect(bandsAfter).toBeGreaterThan(bandsBefore);
        expect(bandsAfter).toBe(bandsBefore + 1);
    });

    it('branch removed: band count decreases (merge scenario removes coupler)', () => {
        const c = makeContainer();
        const r = new SankeyRenderer(c, busSplitResult);
        const bandsBefore = c.querySelectorAll('.band').length;

        r.updateTopology(busSplitSmall);
        const bandsAfter = c.querySelectorAll('.band').length;

        expect(bandsAfter).toBeLessThan(bandsBefore);
        expect(bandsAfter).toBe(bandsBefore - 1);
    });

    it('updateTopology during in-progress transition: transition is snapped to target', () => {
        vi.useFakeTimers();
        const r = new SankeyRenderer(makeContainer(), busSplitSmall);
        const flowUpdate: SankeyScenario = {
            ...busSplitSmall,
            branches: busSplitSmall.branches.map((br) => ({ ...br, flow: br.flow * 2 })),
        };
        r.updateScenarioFlows(flowUpdate);
        vi.advanceTimersByTime(16);

        expect(() => r.updateTopology(busSplitResult)).not.toThrow();
        expect(r.isRunning()).toBe(true);
        r.stopLayout();
        vi.useRealTimers();
    });

    it('N-way split (3 buses from 1 predecessor): all have distinct stack positions', () => {
        const nwaySplit: SankeyScenario = {
            buses: [
                { id: 'A1', voltage_angle: 0.0 },
                { id: 'A2', voltage_angle: 0.001 },
                { id: 'A3', voltage_angle: -0.001 },
                { id: 'B', voltage_angle: 0.1 },
            ],
            branches: [
                { from_bus: 'A1', to_bus: 'B', flow: 100, p_max: 200, id: 'L-AB' },
                { from_bus: 'A2', to_bus: 'B', flow: 50, p_max: 150, id: 'L-A2B' },
                { from_bus: 'A3', to_bus: 'B', flow: 30, p_max: 100, id: 'L-A3B' },
            ],
            inherited_positions: { A1: 'A', A2: 'A', A3: 'A' },
        };
        const preSplitScenario: SankeyScenario = {
            buses: [
                { id: 'A', voltage_angle: 0 },
                { id: 'B', voltage_angle: 0.1 },
            ],
            branches: [{ from_bus: 'A', to_bus: 'B', flow: 100, p_max: 200, id: 'L-AB' }],
        };
        const r = new SankeyRenderer(makeContainer(), preSplitScenario);
        r.updateTopology(nwaySplit);
        const { layout } = r.exportLayout();

        expect(layout['A1']).not.toBe(layout['A2']);
        expect(layout['A1']).not.toBe(layout['A3']);
        expect(layout['A2']).not.toBe(layout['A3']);
    });

    it('exportLayout / importLayout round-trip after updateTopology preserves persisting bus positions', () => {
        const r = new SankeyRenderer(makeContainer(), busSplitSmall);
        r.updateTopology(busSplitResult);
        const saved = r.exportLayout();

        r.setStretch(3);
        r.importLayout(saved);
        const restored = r.exportLayout();

        for (const busId of ['B', 'C', 'D']) {
            expect(restored.layout[busId]).toBeCloseTo(saved.layout[busId], 10);
        }
    });

    it('exportLayout stale-ID check: no old bus IDs, no missing new bus IDs', () => {
        const r = new SankeyRenderer(makeContainer(), busSplitSmall);
        r.updateTopology(busSplitResult);
        const layoutKeys = Object.keys(r.exportLayout().layout).sort();
        const expectedKeys = busSplitResult.buses.map((b) => b.id).sort();
        expect(layoutKeys).toEqual(expectedKeys);
    });

    it('updateTopology with NaN-angle bus excludes it and does not throw', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const withNaN: SankeyScenario = {
            ...busSplitResult,
            buses: [...busSplitResult.buses, { id: 'NAN_BUS', voltage_angle: NaN }],
        };
        const r = new SankeyRenderer(makeContainer(), busSplitSmall);
        expect(() => r.updateTopology(withNaN)).not.toThrow();
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('NAN_BUS'));
        const layoutKeys = Object.keys(r.exportLayout().layout);
        expect(layoutKeys).not.toContain('NAN_BUS');
        warnSpy.mockRestore();
    });
});

describe('SankeyRenderer - accessibility', () => {
    const ARIA_LABEL = 'Sankey diagram of DC power flows';

    it('exposes the svg as an image with an accessible name', () => {
        const container = makeContainer();
        new SankeyRenderer(container, scenario);
        const svg = container.querySelector('svg')!;
        expect(svg.getAttribute('role')).toBe('img');
        expect(svg.getAttribute('aria-label')).toBe(ARIA_LABEL);
    });

    it('keeps role and accessible name after update() and updateTopology()', () => {
        const container = makeContainer();
        const r = new SankeyRenderer(container, busSplitSmall);
        r.updateTopology(busSplitResult);
        r.update(scenario);
        r.stopLayout();
        const svg = container.querySelector('svg')!;
        expect(svg.getAttribute('role')).toBe('img');
        expect(svg.getAttribute('aria-label')).toBe(ARIA_LABEL);
    });

    it('includes role and accessible name in exportSVG()', () => {
        const r = new SankeyRenderer(makeContainer(), scenario);
        const out = r.exportSVG();
        expect(out).toContain('role="img"');
        expect(out).toContain(`aria-label="${ARIA_LABEL}"`);
    });
});

describe('SankeyRenderer - dispose', () => {
    it('removes the <svg> from the container', () => {
        const container = makeContainer();
        const r = new SankeyRenderer(container, scenario);
        expect(container.querySelector('svg')).not.toBeNull();
        r.dispose();
        expect(container.querySelector('svg')).toBeNull();
    });

    it('stops a running layout loop', () => {
        vi.useFakeTimers();
        const r = new SankeyRenderer(makeContainer(), scenario);
        r.startLayout();
        r.dispose();
        expect(r.isRunning()).toBe(false);
    });

    it('is idempotent', () => {
        const r = new SankeyRenderer(makeContainer(), scenario);
        r.dispose();
        expect(() => r.dispose()).not.toThrow();
    });

    it('startLayout() is a no-op after dispose', () => {
        vi.useFakeTimers();
        const r = new SankeyRenderer(makeContainer(), scenario);
        r.dispose();
        r.startLayout();
        expect(r.isRunning()).toBe(false);
    });
});

describe('SankeyRenderer - importLayout validation', () => {
    it('throws on invalid data and leaves the layout unchanged', () => {
        const r = new SankeyRenderer(makeContainer(), scenario);
        const before = r.exportLayout();
        const bad = { ...before, layout: { ...before.layout, A: Number.NaN } };
        expect(() => r.importLayout(bad)).toThrow(/layout\['A'\]/);
        expect(r.exportLayout()).toEqual(before);
    });

    it('throws on an unsupported version', () => {
        const r = new SankeyRenderer(makeContainer(), scenario);
        const data = { ...r.exportLayout(), version: 2 } as unknown as LayoutState;
        expect(() => r.importLayout(data)).toThrow(/unsupported version/);
    });

    it('accepts a partial layout with unknown and missing bus IDs', () => {
        const r = new SankeyRenderer(makeContainer(), scenario);
        const before = r.exportLayout();
        r.importLayout({ ...before, layout: { A: 3, X_unknown: 7 } });
        const after = r.exportLayout();
        expect(after.layout.A).toBe(3);
        expect(after.layout.B).toBe(before.layout.B);
        expect(after.layout.C).toBe(before.layout.C);
        expect(after.layout).not.toHaveProperty('X_unknown');
    });
});
