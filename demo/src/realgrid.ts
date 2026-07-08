/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import NadRealGrid from './diagram-viewers/data/realgrid.svg';
import NadRealGridMeta from './diagram-viewers/data/realgrid_metadata.json';
import {
    handleNodeMove,
    handleTextNodeMove,
    handleNodeSelect,
    handleToggleNadHover,
    handleRightClick,
    handleLineBending,
} from './diagram-viewers/nad-callbacks';
import { NadViewerParametersOptions, NetworkAreaDiagramViewer } from '../../src';

/* eslint-disable @typescript-eslint/no-floating-promises */

const initRealGrid = () => {
    fetch(NadRealGrid)
        .then((response) => response.text())
        .then((svgContent) => {
            const nadViewerParametersOptions: NadViewerParametersOptions = {
                enableDragInteraction: true,
                addButtons: true,
                maxWidth: window.innerWidth - window.innerWidth / 40,
                onMoveNodeCallback: handleNodeMove,
                onMoveTextNodeCallback: handleTextNodeMove,
                onSelectNodeCallback: handleNodeSelect,
                onToggleHoverCallback: handleToggleNadHover,
                onRightClickCallback: handleRightClick,
                onBendLineCallback: handleLineBending,

                adaptiveTextZoom: {
                    enabled: true,
                    edgeSideLabelThreshold: 2000,
                    edgeMiddleArrowThreshold: 4000,
                    edgeMiddleLabelThreshold: 3000,
                    threshold: 6000,
                    nodeThresholds: [
                        { threshold: 6000, voltageLevels: ['nad-vl0to30', 'nad-vl30to50'] },
                        {
                            threshold: 9000,
                            voltageLevels: ['nad-vl0to30', 'nad-vl30to50', 'nad-vl50to70', 'nad-vl70to120'],
                        },
                        {
                            threshold: 12000,
                            voltageLevels: [
                                'nad-vl0to30',
                                'nad-vl30to50',
                                'nad-vl50to70',
                                'nad-vl70to120',
                                'nad-vl120to180',
                            ],
                        },
                        {
                            threshold: 20000,
                            voltageLevels: [
                                'nad-vl0to30',
                                'nad-vl30to50',
                                'nad-vl50to70',
                                'nad-vl70to120',
                                'nad-vl120to180',
                                'nad-vl180to300',
                            ],
                        },
                    ],
                    edgeThresholds: [
                        { threshold: 6000, voltageLevels: ['nad-vl0to30', 'nad-vl30to50'] },
                        {
                            threshold: 9000,
                            voltageLevels: ['nad-vl0to30', 'nad-vl30to50', 'nad-vl50to70', 'nad-vl70to120'],
                        },
                        {
                            threshold: 12000,
                            voltageLevels: [
                                'nad-vl0to30',
                                'nad-vl30to50',
                                'nad-vl50to70',
                                'nad-vl70to120',
                                'nad-vl120to180',
                            ],
                        },
                        {
                            threshold: 20000,
                            voltageLevels: [
                                'nad-vl0to30',
                                'nad-vl30to50',
                                'nad-vl50to70',
                                'nad-vl70to120',
                                'nad-vl120to180',
                                'nad-vl180to300',
                            ],
                        },
                    ],
                },
            };
            const svgContainerNadRealGrid = document.getElementById('svg-container-nad-realgrid');
            new NetworkAreaDiagramViewer(
                svgContainerNadRealGrid!,
                svgContent,
                NadRealGridMeta,
                nadViewerParametersOptions
            );
        });
};

initRealGrid();
