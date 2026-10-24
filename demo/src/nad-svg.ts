/**
 * Copyright (c) 2026, RTE (https://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { type DiagramMetadata, NetworkAreaDiagramViewer } from '../../packages/network-viewer-core/src';
import {
    handleLineBending,
    handleNodeMove,
    handleNodeSelect,
    handleRightClick,
    handleTextNodeMove,
    handleToggleNadHover,
} from './diagram-viewers/nad-callbacks';

type ResourceLoader = () => Promise<string>;

type NadSvgDemo = {
    id: string;
    title: string;
    description: string;
    order: number;
    loadSvgUrl: ResourceLoader;
    loadMetadataUrl: ResourceLoader;
};

const demoDetails: Record<string, { title: string; description: string; order: number }> = {
    'nad-eurostag-tutorial-example1': {
        title: 'Eurostag tutorial — basic',
        description: 'Basic network with parallel and inverted branches.',
        order: 10,
    },
    'nad-ieee9-zeroimpedance-cdf': {
        title: 'IEEE 9 — zero impedance and multiple buses',
        description: 'Partial network around VL3 with bus rings and zero-impedance branches.',
        order: 20,
    },
    'nad-ieee9-zeroimpedance-cdf-middle-arrow': {
        title: 'IEEE 9 — middle arrows',
        description: 'Solved partial network with active power, current and middle branch information.',
        order: 30,
    },
    'nad-ieee9-zeroimpedance-cdf-limit-percentage': {
        title: 'IEEE 9 — permanent limit percentage',
        description: 'Solved partial network with permanent and temporary current limits.',
        order: 40,
    },
    'nad-ieee14cdf-solved': {
        title: 'IEEE 14 — solved network',
        description: 'Complete solved IEEE 14 network.',
        order: 50,
    },
    'nad-ieee300cdf-VL9006': {
        title: 'IEEE 300 — partial network with injections',
        description: 'Depth-one view around VL9006, including injection symbols.',
        order: 60,
    },
    'nad-four-substations': {
        title: 'Four substations — PST and HVDC',
        description: 'Phase-shifting transformer, three-winding transformer and HVDC links.',
        order: 70,
    },
    'nad-four-substations-multiple-labels': {
        title: 'Four substations — multiple labels',
        description: 'Double arrows and multiple electrical values on each branch.',
        order: 80,
    },
    'nad-four-substations_custom': {
        title: 'Four substations — custom labels and styles',
        description: 'Server-side style overrides and custom voltage-level legends.',
        order: 90,
    },
    'nad-scada': {
        title: 'SCADA — 3WT, boundary line and unknown bus',
        description: 'Three-winding transformer, boundary equipment and an unknown-bus ring.',
        order: 100,
    },
    'nad-double-arrows-with-middle-values': {
        title: 'Components — double arrows and middle values',
        description: 'SVC, VSC, shunt compensator and dangling-line network with double arrows.',
        order: 110,
    },
    'nad-edge-info-components': {
        title: 'Edge information components',
        description: 'FLASH, LOCK and unknown component symbols in edge information labels.',
        order: 120,
    },
    case1354pegase: {
        title: 'PEGASE 1354 — large network',
        description: 'Complete MATPOWER PEGASE case used to exercise SVG rendering and level of detail.',
        order: 130,
    },
    bent_lines: {
        title: 'Bent lines',
        description: 'Network containing manually bent branch paths.',
        order: 140,
    },
};

const svgLoaders = import.meta.glob<string>('./diagram-viewers/data/*.svg', {
    import: 'default',
    query: '?url',
});
const metadataLoaders = import.meta.glob<string>('./diagram-viewers/data/*_metadata.json', {
    import: 'default',
    query: '?url',
});

const getId = (path: string): string => path.slice(path.lastIndexOf('/') + 1, -'.svg'.length);

const getGeneratedTitle = (id: string): string =>
    id
        .replace(/^nad-/, '')
        .replaceAll(/[-_]+/g, ' ')
        .replaceAll(/\b(bp|cdf|hvdc|ieee|nad|pst|rte|scada|svg|vl)\b/gi, (value) => value.toUpperCase())
        .replace(/^./, (value) => value.toUpperCase());

const demos: NadSvgDemo[] = Object.entries(svgLoaders)
    .flatMap(([svgPath, loadSvgUrl]) => {
        const metadataPath = svgPath.replace(/\.svg$/, '_metadata.json');
        const loadMetadataUrl = metadataLoaders[metadataPath];
        if (!loadMetadataUrl) return [];
        const id = getId(svgPath);
        const details = demoDetails[id];
        return [
            {
                id,
                title: details?.title ?? getGeneratedTitle(id),
                description: details?.description ?? 'Procedurally generated or locally supplied SVG NAD.',
                order: details?.order ?? 1_000,
                loadSvgUrl,
                loadMetadataUrl,
            },
        ];
    })
    .sort((left, right) => left.order - right.order || left.title.localeCompare(right.title));

const select = document.getElementById('nad-svg-select') as HTMLSelectElement;
const previousButton = document.getElementById('nad-svg-previous') as HTMLButtonElement;
const nextButton = document.getElementById('nad-svg-next') as HTMLButtonElement;
const svgLink = document.getElementById('nad-svg-link') as HTMLAnchorElement;
const metadataLink = document.getElementById('nad-svg-metadata-link') as HTMLAnchorElement;
const title = document.getElementById('nad-svg-title') as HTMLHeadingElement;
const description = document.getElementById('nad-svg-description') as HTMLParagraphElement;
const stats = document.getElementById('nad-svg-stats') as HTMLParagraphElement;
const errorBox = document.getElementById('nad-svg-error') as HTMLDivElement;
const container = document.getElementById('nad-svg-gallery-viewer') as HTMLDivElement;

let viewer: NetworkAreaDiagramViewer | undefined;
let selectedIndex = 0;
let loadRevision = 0;
let loadAbortController: AbortController | undefined;

for (const [index, demo] of demos.entries()) {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = demo.title;
    select.append(option);
}

const showError = (error: unknown) => {
    errorBox.textContent = error instanceof Error ? error.message : String(error);
    errorBox.hidden = false;
};

const updateNavigation = () => {
    select.value = String(selectedIndex);
    previousButton.disabled = selectedIndex === 0;
    nextButton.disabled = selectedIndex === demos.length - 1;
};

const updateUrl = (demo: NadSvgDemo) => {
    const url = new URL(window.location.href);
    url.searchParams.set('demo', demo.id);
    history.replaceState(null, '', url);
};

const fetchResource = async (url: string, resourceName: string, signal: AbortSignal): Promise<Response> => {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`Unable to load ${resourceName}: HTTP ${response.status}`);
    return response;
};

const formatStats = (metadata: DiagramMetadata): string =>
    `${metadata.nodes.length.toLocaleString()} voltage levels · ` +
    `${metadata.busNodes.length.toLocaleString()} buses · ` +
    `${metadata.edges.length.toLocaleString()} branches · ` +
    `${metadata.textNodes.length.toLocaleString()} labels`;

const loadDemo = async (index: number) => {
    if (demos.length === 0) {
        showError('No SVG and metadata pair was found in the NAD data directory.');
        return;
    }

    selectedIndex = Math.max(0, Math.min(demos.length - 1, index));
    const revision = ++loadRevision;
    loadAbortController?.abort();
    loadAbortController = new AbortController();
    const { signal } = loadAbortController;
    const demo = demos[selectedIndex];

    updateNavigation();
    updateUrl(demo);
    viewer?.debounceToggleHoverCallback.cancel();
    viewer = undefined;
    container.replaceChildren();
    container.dataset.loading = 'true';
    errorBox.hidden = true;
    title.textContent = demo.title;
    description.textContent = demo.description;
    stats.textContent = 'Loading SVG and metadata…';
    svgLink.removeAttribute('href');
    metadataLink.removeAttribute('href');

    try {
        const [svgUrl, metadataUrl] = await Promise.all([demo.loadSvgUrl(), demo.loadMetadataUrl()]);
        const [svgContent, metadata] = await Promise.all([
            fetchResource(svgUrl, 'SVG', signal).then((response) => response.text()),
            fetchResource(metadataUrl, 'SVG metadata', signal).then((response) => response.json()),
        ]);
        if (revision !== loadRevision) return;

        svgLink.href = svgUrl;
        metadataLink.href = metadataUrl;
        const viewerWidth = Math.max(320, container.clientWidth);
        const viewerHeight = Math.max(500, container.clientHeight);
        viewer = new NetworkAreaDiagramViewer(container, svgContent, metadata as DiagramMetadata, {
            enableDragInteraction: true,
            enableLevelOfDetail: true,
            addButtons: true,
            minWidth: viewerWidth,
            minHeight: viewerHeight,
            maxWidth: viewerWidth,
            maxHeight: viewerHeight,
            onMoveNodeCallback: handleNodeMove,
            onMoveTextNodeCallback: handleTextNodeMove,
            onSelectNodeCallback: handleNodeSelect,
            onToggleHoverCallback: handleToggleNadHover,
            onRightClickCallback: handleRightClick,
            onBendLineCallback: handleLineBending,
            adaptiveTextZoom: { enabled: true, threshold: 3000 },
        });
        stats.textContent = formatStats(metadata as DiagramMetadata);
    } catch (error) {
        if (revision !== loadRevision || signal.aborted) return;
        stats.textContent = 'SVG viewer unavailable';
        showError(error);
    } finally {
        if (revision === loadRevision) delete container.dataset.loading;
    }
};

select.addEventListener('change', () => void loadDemo(Number(select.value)));
previousButton.addEventListener('click', () => void loadDemo(selectedIndex - 1));
nextButton.addEventListener('click', () => void loadDemo(selectedIndex + 1));
window.addEventListener(
    'beforeunload',
    () => {
        viewer?.debounceToggleHoverCallback.cancel();
        loadAbortController?.abort();
    },
    { once: true }
);

const requestedDemo = new URLSearchParams(window.location.search).get('demo');
const requestedIndex = requestedDemo ? demos.findIndex((demo) => demo.id === requestedDemo) : 0;
void loadDemo(Math.max(0, requestedIndex));
