/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { NetworkAreaDiagramViewer } from '../../src';
import svgContent from './diagram-viewers/data/nad_style_origin_example1.svg?raw';
import metadata from './diagram-viewers/data/nad_style_origin_example1_metadata.json';
import svgContent2 from './diagram-viewers/data/nad_style_origin_example2.svg?raw';
import metadata2 from './diagram-viewers/data/nad_style_origin_example2_metadata.json';

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
        maxWidth: 700,
        maxHeight: 500,
    });
}

// ###############################
// EXAMPLE 1
// ###############################
const containerExample1 = document.getElementById('svg-container-nad-custom-style-example1');
if (!containerExample1) {
    throw new Error('#svg-container-nad-custom-style-example1 not found');
}
const containerExample1Customization = document.getElementById('svg-container-nad-custom-style-example1-result');
if (!containerExample1Customization) {
    throw new Error('#svg-container-nad-custom-style-example1-result not found');
}
const zoomLebels = [0, 1000, 2200, 2500, 3000, 4000, 9000, 12000, 20000];
setupNad(containerExample1, svgContent, metadata, true, zoomLebels);
const nadViewerExample1Customization: NetworkAreaDiagramViewer = setupNad(
    containerExample1Customization,
    svgContent,
    metadata,
    true,
    zoomLebels
);
const customStyleProvider: NadStyleProvider = {
    getBusNodeStyle: () => {
        return { fill: 'green' };
    },
};
nadViewerExample1Customization.setStyle(customStyleProvider);

const customStyleProvider2: NadStyleProvider = {
    getBusNodeStyle: (equipmentId) => {
        if (equipmentId == 'VL1_10') return { fill: 'red', edge: 'black', edgeWidth: '4px' };
        if (equipmentId == 'VL2_30') return { fill: 'green' };
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
                stroke: 'red',
                strokeWidth: '5px',
                strokeDasharray: '4 4',
            },
            side3: {
                stroke: 'green',
                strokeWidth: '5px',
                strokeDasharray: '4 4',
            },
        };
    },
};
nadViewerExample1Customization.setStyle(customStyleProvider2);
// ###############################
// EXAMPLE 2
// ###############################
const containerExample2 = document.getElementById('svg-container-nad-custom-style-example2');
if (!containerExample2) {
    throw new Error('#svg-container-nad-custom-style-example2 not found');
}
const containerExample2Customization = document.getElementById('svg-container-nad-custom-style-example2-result');
if (!containerExample2Customization) {
    throw new Error('#svg-container-nad-custom-style-example2-result not found');
}
setupNad(containerExample2, svgContent2, metadata2, true, zoomLebels);
const nadViewerExample2Customization: NetworkAreaDiagramViewer = setupNad(
    containerExample2Customization,
    svgContent2,
    metadata2,
    true,
    zoomLebels
);

const customStyleProvider3: NadStyleProvider = {
    ...customStyleProvider2,
    getInjectionStyle: () => {
        return {
            stroke: 'blue',
            strokeWidth: '5px',
        };
    },
};
nadViewerExample2Customization.setStyle(customStyleProvider3);
