/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { NetworkAreaDiagramViewer } from '@powsybl/network-viewer-core';
import NadSvgExample from './src/diagram-viewers/data/nad-scada.svg';
import NadSvgExampleMeta from './src/diagram-viewers/data/nad-scada_metadata.json';

await fetch(NadSvgExample)
    .then((response) => response.text())
    .then((svgContent) => {
        const container = document.getElementById('svg-container-nad-issue-459');
        if (!container) {
            throw new Error('#svg-container-nad-issue-459 not found');
        }
        const nadViewer = new NetworkAreaDiagramViewer(container, svgContent, NadSvgExampleMeta, {});
        NadSvgExampleMeta?.nodes.forEach((node) => {
            const element = nadViewer.container.querySelector<SVGGraphicsElement>(`[id="${node.svgId}"]`);
            if (element) {
                nadViewer.moveNodeToCoordinates(node.equipmentId, node.x, node.y);
                // to move specific node
                if (node.equipmentId == 'vl') {
                    // nadViewer.moveNodeToCoordinates(node.equipmentId, node.x, node.y);
                }
            }
        });
    });
