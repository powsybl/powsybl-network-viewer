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
                maxWidth: 2000,
                onMoveNodeCallback: handleNodeMove,
                onMoveTextNodeCallback: handleTextNodeMove,
                onSelectNodeCallback: handleNodeSelect,
                onToggleHoverCallback: handleToggleNadHover,
                onRightClickCallback: handleRightClick,
                onBendLineCallback: handleLineBending,

                adaptiveTextZoom: {
                    enabled: true,
                    edgeSideLabelThreshold: 2000,
                    edgeMiddleArrowThreshold: 5000,
                    edgeMiddleLabelThreshold: 3000,
                    threshold: 9000,
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
