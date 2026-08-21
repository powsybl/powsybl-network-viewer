/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { NetworkAreaDiagramViewer } from '../../src';
import svgContent from './diagram-viewers/data/nad_custom_style.svg?raw';
import metadata from './diagram-viewers/data/nad_custom_style_metadata.json';
import {
    handleNodeMove,
    handleNodeSelect,
    handleRightClick,
    handleTextNodeMove,
    handleToggleNadHover,
} from './diagram-viewers/nad-callbacks.ts';
import { NadStyleProvider } from '@powsybl/network-viewer-core';

export function setupNad(
    container: HTMLElement,
    svgContent: string,
    metadata: any,
    enableLevelOfDetail: boolean,
    zoomLevels: number[]
): NetworkAreaDiagramViewer {
    return new NetworkAreaDiagramViewer(container, svgContent, metadata, {
        enableDragInteraction: true,
        addButtons: true,
        onMoveNodeCallback: handleNodeMove,
        onMoveTextNodeCallback: handleTextNodeMove,
        onSelectNodeCallback: handleNodeSelect,
        onToggleHoverCallback: handleToggleNadHover,
        onRightClickCallback: handleRightClick,
        enableLevelOfDetail: enableLevelOfDetail,
        zoomLevels: zoomLevels,
    });
}

const container = document.getElementById('svg-container-nad-custom-style');
if (!container) {
    throw new Error('#svg-container-nad-custom-style not found');
}
const zoomLebels = [0, 1000, 2200, 2500, 3000, 4000, 9000, 12000, 20000];
const nadViewer: NetworkAreaDiagramViewer = setupNad(container, svgContent, metadata, true, zoomLebels);
const customStyleProvider: NadStyleProvider = {
    getBusNodeStyle: () => {
        return { fill: 'green' };
    },
};
nadViewer.setStyle(customStyleProvider);

const customStyleProvider2: NadStyleProvider = {
    getBusNodeStyle: (equipmentId) => {
        if (equipmentId == 'VL1_10') return { fill: 'green' };
        if (equipmentId == 'VL2_30') return { fill: 'red' };
        return {};
    },
    getBranchStyle: () => {
        return {
            side1: {
                stroke: 'red',
                strokeWidth: '5px',
            },
            side2: {
                stroke: 'green',
                strokeWidth: '5px',
                strokeDasharray: '4 4',
            },
        };
    },
    getThreeWtStyle: () => {
        return {
            side1: {
                stroke: 'red',
                strokeWidth: '5px',
            },
            side2: {
                stroke: 'green',
                strokeWidth: '5px',
                strokeDasharray: '4 4',
            },
            side3: {
                stroke: 'blue',
                strokeWidth: '5px',
                strokeDasharray: '4 4',
            },
        };
    },
};
nadViewer.setStyle(customStyleProvider2);
