/**
 * Copyright (c) 2022, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import NadSvgMultibusVLNodes14Example from './diagram-viewers/data/nad-ieee14cdf-solved.svg';
import NadSvgMultibusVLNodes14ExampleMeta from './diagram-viewers/data/nad-ieee14cdf-solved_metadata.json';
import { NadViewerParametersOptions, NetworkAreaDiagramViewer } from '@powsybl/network-viewer-core';

/* eslint-disable @typescript-eslint/no-floating-promises */

const initSyncedViewers = () => {
    fetch(NadSvgMultibusVLNodes14Example)
        .then((response) => response.text())
        .then((svgContent) => {
            const nadViewerParametersOptions: NadViewerParametersOptions = {
                enableDragInteraction: true,
                enableLevelOfDetail: true,
                addButtons: true,
                maxHeight: 400,
                maxWidth: 400,
            };

            const v1 = new NetworkAreaDiagramViewer(
                document.getElementById('svg-container-nad-synced-1')!,
                svgContent,
                NadSvgMultibusVLNodes14ExampleMeta,
                nadViewerParametersOptions
            );
            const v2 = new NetworkAreaDiagramViewer(
                document.getElementById('svg-container-nad-synced-2')!,
                svgContent,
                NadSvgMultibusVLNodes14ExampleMeta,
                nadViewerParametersOptions
            );
            const v3 = new NetworkAreaDiagramViewer(
                document.getElementById('svg-container-nad-synced-3')!,
                svgContent,
                NadSvgMultibusVLNodes14ExampleMeta,
                nadViewerParametersOptions
            );

            // Establish synchronization
            v1.coupleWith([v2, v3]);
            v2.coupleWith([v1, v3]);
            v3.coupleWith([v1, v2]);

            // Apply randomized branch states
            const edges = NadSvgMultibusVLNodes14ExampleMeta.edges || [];
            const branchIds = edges.map((edge: any) => edge.equipmentId);

            const getRandomBranchStates = (ids: string[]) => {
                return JSON.stringify(
                    ids.map((id) => ({
                        branchId: id,
                        value1: Math.floor(Math.random() * 2000) - 1000,
                        value2: Math.floor(Math.random() * 2000) - 1000,
                    }))
                );
            };

            v1.setJsonBranchStates(getRandomBranchStates(branchIds));
            const branchStatesV2: any[] = JSON.parse(getRandomBranchStates(branchIds));
            branchStatesV2.forEach((bs) => {
                if (bs.branchId === 'L9-10-1') {
                    bs.connectedBus1 = 'VL4_1';
                }
                if (bs.branchId === 'L4-5-1') {
                    bs.connectedBus1 = 'VL4_1';
                }
            });
            v2.setJsonBranchStates(JSON.stringify(branchStatesV2));

            const branchStatesV3: any[] = JSON.parse(getRandomBranchStates(branchIds));
            branchStatesV3.forEach((bs) => {
                if (bs.branchId === 'L6-11-1') {
                    bs.connectedBus1 = 'VL5_0';
                }
                if (bs.branchId === 'L6-12-1') {
                    bs.connectedBus1 = 'VL5_0';
                }
                if (bs.branchId === 'L6-13-1') {
                    bs.connectedBus1 = 'VL5_0';
                }
                if (bs.branchId === 'T5-6-1') {
                    bs.connectedBus2 = 'VL5_0';
                }
            });
            v3.setJsonBranchStates(JSON.stringify(branchStatesV3));
        });
};

initSyncedViewers();
