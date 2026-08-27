/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { commands } from 'vitest/browser';
import { afterAll, beforeAll, expect, test } from 'vitest';
import type {
    DiagramMetadata,
    NodeMetadata,
} from '../../packages/network-viewer-core/src/network-area-diagram-viewer/diagram-metadata';
import { NetworkAreaDiagramViewer } from '../../packages/network-viewer-core/src/network-area-diagram-viewer/network-area-diagram-viewer';
import { benchmarkName, metadataUrl, svgUrl } from 'virtual:nad-performance-fixture';
import './style.css';
import './zoom.css';

declare module 'vitest/browser' {
    interface BrowserCommands {
        playwrightWheel(
            selector: string,
            relativeX: number,
            relativeY: number,
            deltaY: number,
            steps: number,
            stepDelayMs: number
        ): Promise<void>;
        playwrightDrag(
            selector: string,
            relativeStartX: number,
            relativeStartY: number,
            deltaX: number,
            deltaY: number,
            steps: number,
            stepDelayMs: number
        ): Promise<void>;
        reportNadPerformance(
            name: string,
            devicePixelRatio: number,
            initialLoadMs: number,
            visibleLabelCount: number,
            rows: Array<{ interaction: string } & FrameMetrics>
        ): Promise<void>;
    }
}

type FrameMetrics = {
    durationMs: number;
    frameCount: number;
    averageFps: number;
    p95FrameMs: number;
    worstFrameMs: number;
    stutterFrameCount: number;
    longFrameCount: number;
    stutterPercent: number;
};

type SvgMetrics = {
    initialLoadMs: number;
    zoom: FrameMetrics & { inputEventCount: number };
    pan: FrameMetrics;
    moveNode: FrameMetrics;
    visibleLabelCount: number;
};

type DraggableNodeTarget = {
    node: NodeMetadata;
    relativePosition: [number, number];
};

const VIEWER_WIDTH = 900;
const VIEWER_HEIGHT = 700;
const LABEL_VIEW_WIDTH = 1000;
const LABEL_VIEW_HEIGHT = 700;
const WHEEL_DELTA_Y = -50;
const ZOOM_EVENT_COUNT = 40;
const INPUT_STEP_DELAY_MS = 16;
const VIEWER_SETTLE_MS = 100;
const MEASURED_SETTLE_FRAME_COUNT = 4;
const PAN_STEPS = 30;
const MOVE_STEPS = 30;
const MINIMUM_FRAME_SAMPLE_COUNT = 20;
const EXPECTED_FRAME_MS = 1000 / 60;
const STUTTER_FRAME_MS = EXPECTED_FRAME_MS * 1.5;
const LONG_FRAME_MS = 50;
const INITIAL_LOAD_BUDGET_MS = 20_000;

const SVG_CONTAINER_SELECTOR = '#nad-svg-benchmark';
const SVG_INTERACTION_SELECTOR = `${SVG_CONTAINER_SELECTOR} > #nad-viewer > #svg-container > svg`;

let metadata: DiagramMetadata;
let svgContent: string;
let container: HTMLDivElement | undefined;
let svgViewer: NetworkAreaDiagramViewer | undefined;

const createContainer = (): HTMLDivElement => {
    const element = document.createElement('div');
    element.id = SVG_CONTAINER_SELECTOR.slice(1);
    element.style.width = `${VIEWER_WIDTH}px`;
    element.style.height = `${VIEWER_HEIGHT}px`;
    document.body.append(element);
    return element;
};

const nextAnimationFrames = (count = 2): Promise<void> =>
    new Promise((resolve) => {
        const next = (remaining: number) => {
            if (remaining === 0) resolve();
            else requestAnimationFrame(() => next(remaining - 1));
        };
        next(count);
    });

const waitForViewerToSettle = async (): Promise<void> => {
    await new Promise((resolve) => window.setTimeout(resolve, VIEWER_SETTLE_MS));
    await nextAnimationFrames();
};

const percentile = (values: number[], ratio: number): number => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((left, right) => left - right);
    return sorted[Math.min(Math.ceil(sorted.length * ratio) - 1, sorted.length - 1)];
};

const round = (value: number): number => Math.round(value * 10) / 10;

const startFrameSampler = async (): Promise<() => FrameMetrics> => {
    const intervals: number[] = [];
    let previousTimestamp = await new Promise<number>((resolve) => requestAnimationFrame(resolve));
    let animationFrame = 0;
    const sample = (timestamp: number) => {
        intervals.push(timestamp - previousTimestamp);
        previousTimestamp = timestamp;
        animationFrame = requestAnimationFrame(sample);
    };
    animationFrame = requestAnimationFrame(sample);

    return () => {
        cancelAnimationFrame(animationFrame);
        const durationMs = intervals.reduce((sum, interval) => sum + interval, 0);
        const stutterFrameCount = intervals.filter((interval) => interval > STUTTER_FRAME_MS).length;
        return {
            durationMs: round(durationMs),
            frameCount: intervals.length,
            averageFps: round((intervals.length * 1000) / Math.max(durationMs, 0.001)),
            p95FrameMs: round(percentile(intervals, 0.95)),
            worstFrameMs: round(Math.max(...intervals, 0)),
            stutterFrameCount,
            longFrameCount: intervals.filter((interval) => interval > LONG_FRAME_MS).length,
            stutterPercent: round((stutterFrameCount * 100) / Math.max(intervals.length, 1)),
        };
    };
};

const measureInteraction = async (interaction: () => Promise<void>): Promise<FrameMetrics> => {
    const stopFrameSampler = await startFrameSampler();
    await interaction();
    // Capture the debounced final rendering work without adding a fixed idle
    // period that would dilute the interaction's frame-pacing metrics.
    await nextAnimationFrames(MEASURED_SETTLE_FRAME_COUNT);
    return stopFrameSampler();
};

const getBenchmarkNode = (viewer: NetworkAreaDiagramViewer): NodeMetadata => {
    const incidentEdges = new Map<string, number>();
    for (const edge of metadata.edges) {
        incidentEdges.set(edge.node1, (incidentEdges.get(edge.node1) ?? 0) + 1);
        incidentEdges.set(edge.node2, (incidentEdges.get(edge.node2) ?? 0) + 1);
    }
    const renderedNodes = metadata.nodes.filter((node) => {
        if (node.invisible) return false;
        const element = viewer.svgDiv.querySelector<SVGGraphicsElement>(`[id="${CSS.escape(node.svgId)}"]`);
        const bounds = element?.getBoundingClientRect();
        return bounds !== undefined && bounds.width > 0 && bounds.height > 0;
    });
    if (renderedNodes.length === 0) throw new Error('The NAD metadata contains no node rendered in the SVG');
    return renderedNodes.reduce((mostConnected, node) =>
        (incidentEdges.get(node.svgId) ?? 0) > (incidentEdges.get(mostConnected.svgId) ?? 0) ? node : mostConnected
    );
};

const getRelativeNodePosition = (viewer: NetworkAreaDiagramViewer, node: NodeMetadata): [number, number] => {
    const svg = container?.querySelector<SVGSVGElement>('svg');
    const nodeElement = viewer.svgDiv.querySelector<SVGGraphicsElement>(`[id="${CSS.escape(node.svgId)}"]`);
    if (!svg || !nodeElement) throw new Error(`Cannot locate SVG node "${node.equipmentId}"`);
    const svgBounds = svg.getBoundingClientRect();
    const nodeBounds = nodeElement.getBoundingClientRect();
    return [
        (nodeBounds.left + nodeBounds.width / 2 - svgBounds.left) / svgBounds.width,
        (nodeBounds.top + nodeBounds.height / 2 - svgBounds.top) / svgBounds.height,
    ];
};

const getDraggableNodeTarget = (viewer: NetworkAreaDiagramViewer, preferredNode: NodeMetadata): DraggableNodeTarget => {
    const viewBox = viewer.getViewBox()!;
    const visibleNodes = viewer.diagramMetadata!.nodes.filter(
        ({ x, y, invisible }) =>
            !invisible &&
            x >= viewBox.x &&
            x <= viewBox.x + viewBox.width &&
            y >= viewBox.y &&
            y <= viewBox.y + viewBox.height
    );
    const candidates = [preferredNode, ...visibleNodes.filter(({ svgId }) => svgId !== preferredNode.svgId)];
    const relativePositions: Array<[number, number]> = [
        [0.5, 0.5],
        [0.3, 0.5],
        [0.7, 0.5],
        [0.5, 0.3],
        [0.5, 0.7],
    ];
    for (const node of candidates) {
        const element = viewer.svgDiv.querySelector<SVGGraphicsElement>(`[id="${CSS.escape(node.svgId)}"]`);
        const bounds = element?.getBoundingClientRect();
        if (!element || !bounds || bounds.width === 0 || bounds.height === 0) continue;
        for (const relativePosition of relativePositions) {
            const hitElement = document.elementFromPoint(
                bounds.left + bounds.width * relativePosition[0],
                bounds.top + bounds.height * relativePosition[1]
            );
            if (hitElement && element.contains(hitElement)) return { node, relativePosition };
        }
    }
    throw new Error('Cannot find a visible SVG node that can receive a real pointer drag');
};

const zoomWithPlaywright = async (relativePosition: [number, number]): Promise<SvgMetrics['zoom']> => ({
    ...(await measureInteraction(() =>
        commands.playwrightWheel(
            SVG_INTERACTION_SELECTOR,
            relativePosition[0],
            relativePosition[1],
            WHEEL_DELTA_Y,
            ZOOM_EVENT_COUNT,
            INPUT_STEP_DELAY_MS
        )
    )),
    inputEventCount: ZOOM_EVENT_COUNT,
});

const panWithPlaywright = (): Promise<FrameMetrics> =>
    measureInteraction(() =>
        commands.playwrightDrag(SVG_INTERACTION_SELECTOR, 0.15, 0.15, 300, 160, PAN_STEPS, INPUT_STEP_DELAY_MS)
    );

const moveNodeWithPlaywright = ({ node, relativePosition }: DraggableNodeTarget): Promise<FrameMetrics> =>
    measureInteraction(() =>
        commands.playwrightDrag(
            `${SVG_CONTAINER_SELECTOR} [id="${CSS.escape(node.svgId)}"]`,
            relativePosition[0],
            relativePosition[1],
            70,
            35,
            MOVE_STEPS,
            INPUT_STEP_DELAY_MS
        )
    );

const assertFrameMetrics = (metrics: FrameMetrics): void => {
    expect(metrics.durationMs).toBeGreaterThan(0);
    expect(metrics.frameCount).toBeGreaterThanOrEqual(MINIMUM_FRAME_SAMPLE_COUNT);
    expect(metrics.averageFps).toBeGreaterThan(0);
    expect(metrics.p95FrameMs).toBeGreaterThan(0);
    expect(metrics.worstFrameMs).toBeGreaterThan(0);
};

beforeAll(async () => {
    // Transfer and parse the potentially very large fixture before measuring
    // viewer construction and its naturally scheduled initial frames.
    const [svgResponse, metadataResponse] = await Promise.all([fetch(svgUrl), fetch(metadataUrl)]);
    expect(svgResponse.ok).toBe(true);
    expect(metadataResponse.ok).toBe(true);
    const [loadedSvg, loadedMetadata] = await Promise.all([svgResponse.text(), metadataResponse.json()]);
    svgContent = loadedSvg;
    metadata = loadedMetadata as DiagramMetadata;
}, 60_000);

afterAll(() => {
    svgViewer?.debounceToggleHoverCallback.cancel();
    container?.remove();
});

test(`benchmarks ${benchmarkName} SVG frame pacing during real Playwright interactions`, async ({ annotate }) => {
    expect(metadata.nodes.length).toBeGreaterThan(0);
    container = createContainer();
    await nextAnimationFrames();

    const startedAt = performance.now();
    svgViewer = new NetworkAreaDiagramViewer(container, svgContent, structuredClone(metadata), {
        enableDragInteraction: true,
        enableLevelOfDetail: true,
        minWidth: VIEWER_WIDTH,
        minHeight: VIEWER_HEIGHT,
        maxWidth: VIEWER_WIDTH,
        maxHeight: VIEWER_HEIGHT,
        adaptiveTextZoom: { enabled: true, threshold: 3000 },
    });
    await nextAnimationFrames();
    const initialLoadMs = performance.now() - startedAt;

    const rootSvg = container.querySelector<SVGSVGElement>('svg');
    expect(svgViewer.svgDraw?.node).toBe(rootSvg);
    expect(svgViewer.innerSvg).toBeTruthy();
    expect(typeof svgViewer.svgDraw?.panZoom).toBe('function');

    const benchmarkNode = getBenchmarkNode(svgViewer);
    const viewBoxBeforeZoom = svgViewer.getViewBox()!;
    const zoom = await zoomWithPlaywright(getRelativeNodePosition(svgViewer, benchmarkNode));
    expect(svgViewer.getViewBox()!.width).toBeLessThan(viewBoxBeforeZoom.width);

    const viewBoxBeforePan = svgViewer.getViewBox()!;
    const pan = await panWithPlaywright();
    const viewBoxAfterPan = svgViewer.getViewBox()!;
    expect(Math.hypot(viewBoxAfterPan.x - viewBoxBeforePan.x, viewBoxAfterPan.y - viewBoxBeforePan.y)).toBeGreaterThan(
        0
    );

    svgViewer.setViewBox({
        x: benchmarkNode.x - LABEL_VIEW_WIDTH / 2,
        y: benchmarkNode.y - LABEL_VIEW_HEIGHT / 2,
        width: LABEL_VIEW_WIDTH,
        height: LABEL_VIEW_HEIGHT,
    });
    svgViewer.checkAndUpdateLevelOfDetail();
    await waitForViewerToSettle();
    const draggableNodeTarget = getDraggableNodeTarget(svgViewer, benchmarkNode);
    const nodeBeforeMove = svgViewer.diagramMetadata!.nodes.find(
        ({ svgId }) => svgId === draggableNodeTarget.node.svgId
    )!;
    const positionBeforeMove = { x: nodeBeforeMove.x, y: nodeBeforeMove.y };
    const moveNode = await moveNodeWithPlaywright(draggableNodeTarget);
    const nodeAfterMove = svgViewer.diagramMetadata!.nodes.find(
        ({ svgId }) => svgId === draggableNodeTarget.node.svgId
    )!;
    expect(Math.hypot(nodeAfterMove.x - positionBeforeMove.x, nodeAfterMove.y - positionBeforeMove.y)).toBeGreaterThan(
        0
    );

    const metrics: SvgMetrics = {
        initialLoadMs: round(initialLoadMs),
        zoom,
        pan,
        moveNode,
        visibleLabelCount: container.querySelectorAll('g.nad-text-nodes > *, g.nad-edge-infos > *').length,
    };
    const benchmarkEnvironment = {
        userAgent: navigator.userAgent,
        devicePixelRatio: window.devicePixelRatio,
    };
    const benchmarkRows = (['zoom', 'pan', 'moveNode'] as const).map((interaction) => ({
        renderer: 'SVG',
        interaction,
        ...metrics[interaction],
    }));
    await commands.reportNadPerformance(
        benchmarkName,
        benchmarkEnvironment.devicePixelRatio,
        metrics.initialLoadMs,
        metrics.visibleLabelCount,
        benchmarkRows
    );
    await annotate(JSON.stringify({ benchmarkName, benchmarkEnvironment, metrics }, undefined, 2), 'benchmark');

    expect(metrics.initialLoadMs).toBeLessThan(INITIAL_LOAD_BUDGET_MS);
    expect(metrics.visibleLabelCount).toBeGreaterThan(0);
    for (const row of benchmarkRows) assertFrameMetrics(row);
}, 180_000);
