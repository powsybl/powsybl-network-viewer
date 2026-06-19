/*
 * Copyright (c) 2026, RTE (https://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import NadSvgExample from './diagram-viewers/data/nad-eurostag-tutorial-example1.svg';
import NadSvgExampleMeta from './diagram-viewers/data/nad-eurostag-tutorial-example1_metadata.json';
import NadSvgPstHvdcExample from './diagram-viewers/data/nad-four-substations.svg';
import NadSvgPstHvdcExampleMeta from './diagram-viewers/data/nad-four-substations_metadata.json';
import NadSvgPstHvdcMultipleLabelsExample from './diagram-viewers/data/nad-four-substations-multiple-labels.svg';
import NadSvgPstHvdcMultipleLabelsExampleMeta from './diagram-viewers/data/nad-four-substations-multiple-labels_metadata.json';
import NadSvgMultibusVLNodesExample from './diagram-viewers/data/nad-ieee9-zeroimpedance-cdf.svg';
import NadSvgMultibusVLNodesExampleMeta from './diagram-viewers/data/nad-ieee9-zeroimpedance-cdf_metadata.json';
import NadSvgMultibusVLNodesMiddleArrowExample from './diagram-viewers/data/nad-ieee9-zeroimpedance-cdf-middle-arrow.svg';
import NadSvgMultibusVLNodesMiddleArrowExampleMeta from './diagram-viewers/data/nad-ieee9-zeroimpedance-cdf-middle-arrow_metadata.json';
import NadSvgMultibusVLNodes14Example from './diagram-viewers/data/nad-ieee14cdf-solved.svg';
import NadSvgMultibusVLNodes14ExampleMeta from './diagram-viewers/data/nad-ieee14cdf-solved_metadata.json';
import NadSvgThreeWTBoundaryLineUnknownBusExample from './diagram-viewers/data/nad-scada.svg';
import NadSvgThreeWTBoundaryLineUnknownBusExampleMeta from './diagram-viewers/data/nad-scada_metadata.json';
import NadSvgPartialNetworkExample from './diagram-viewers/data/nad-ieee300cdf-VL9006.svg';
import NadSvgPartialNetworkExampleMeta from './diagram-viewers/data/nad-ieee300cdf-VL9006_metadata.json';
import NadSvgPegaseNetworkExample from './diagram-viewers/data/case1354pegase.svg';
import NadSvgPegaseNetworkExampleMeta from './diagram-viewers/data/case1354pegase_metadata.json';
import NadSvgDoubleArrowsExample from './diagram-viewers/data/nad-double-arrows-with-middle-values.svg';
import NadSvgDoubleArrowsExampleMeta from './diagram-viewers/data/nad-double-arrows-with-middle-values_metadata.json';
import NadSvgComponentsExample from './diagram-viewers/data/nad-edge-info-components.svg';
import NadSvgComponentsExampleMeta from './diagram-viewers/data/nad-edge-info-components_metadata.json';

import { NadViewerParametersOptions, NetworkAreaDiagramViewer } from '../../src';
import {
    handleNodeMove,
    handleTextNodeMove,
    handleNodeSelect,
    handleToggleNadHover,
    handleRightClick,
    handleLineBending,
} from './diagram-viewers/nad-callbacks';

/* eslint-disable @typescript-eslint/no-floating-promises */

const addCreatedNadToDemo = () => {
    fetch(NadSvgExample)
        .then((response) => response.text())
        .then((svgContent) => {
            const nadViewerParametersOptions: NadViewerParametersOptions = {
                enableDragInteraction: true,
                addButtons: true,
                onMoveNodeCallback: handleNodeMove,
                onMoveTextNodeCallback: handleTextNodeMove,
                onSelectNodeCallback: handleNodeSelect,
                onToggleHoverCallback: handleToggleNadHover,
                onRightClickCallback: handleRightClick,
                onBendLineCallback: handleLineBending,
            };
            new NetworkAreaDiagramViewer(
                document.getElementById('svg-container-nad-eurostag')!,
                svgContent,
                NadSvgExampleMeta,
                nadViewerParametersOptions
            );
        });

    const nadViewerParametersOptions: NadViewerParametersOptions = {
        onMoveNodeCallback: handleNodeMove,
        onMoveTextNodeCallback: handleTextNodeMove,
        onSelectNodeCallback: handleNodeSelect,
        onToggleHoverCallback: handleToggleNadHover,
        onRightClickCallback: handleRightClick,
        onBendLineCallback: handleLineBending,
        createSvgFromMetadata: true,
    };
    new NetworkAreaDiagramViewer(
        document.getElementById('svg-container-nad-eurostag-c')!,
        '',
        NadSvgExampleMeta,
        nadViewerParametersOptions
    );

    fetch(NadSvgMultibusVLNodesExample)
        .then((response) => response.text())
        .then((svgContent) => {
            const nadViewerParametersOptions: NadViewerParametersOptions = {
                enableDragInteraction: true,
                addButtons: true,
                onMoveNodeCallback: handleNodeMove,
                onMoveTextNodeCallback: handleTextNodeMove,
                onSelectNodeCallback: handleNodeSelect,
                onToggleHoverCallback: handleToggleNadHover,
                onRightClickCallback: handleRightClick,
                onBendLineCallback: handleLineBending,
            };
            new NetworkAreaDiagramViewer(
                document.getElementById('svg-container-nad-multibus-vlnodes')!,
                svgContent,
                NadSvgMultibusVLNodesExampleMeta,
                nadViewerParametersOptions
            );
        });

    new NetworkAreaDiagramViewer(
        document.getElementById('svg-container-nad-multibus-vlnodes-c')!,
        '',
        NadSvgMultibusVLNodesExampleMeta,
        nadViewerParametersOptions
    );

    fetch(NadSvgMultibusVLNodes14Example)
        .then((response) => response.text())
        .then((svgContent) => {
            const nadViewerParametersOptions: NadViewerParametersOptions = {
                enableDragInteraction: true,
                addButtons: true,
                onMoveNodeCallback: handleNodeMove,
                onMoveTextNodeCallback: handleTextNodeMove,
                onSelectNodeCallback: handleNodeSelect,
                onToggleHoverCallback: handleToggleNadHover,
                onRightClickCallback: handleRightClick,
                onBendLineCallback: handleLineBending,
            };
            new NetworkAreaDiagramViewer(
                document.getElementById('svg-container-nad-multibus-vlnodes14')!,
                svgContent,
                NadSvgMultibusVLNodes14ExampleMeta,
                nadViewerParametersOptions
            );
        });

    new NetworkAreaDiagramViewer(
        document.getElementById('svg-container-nad-multibus-vlnodes14-c')!,
        '',
        NadSvgMultibusVLNodes14ExampleMeta,
        nadViewerParametersOptions
    );

    fetch(NadSvgPstHvdcExample)
        .then((response) => response.text())
        .then((svgContent) => {
            const nadViewerParametersOptions: NadViewerParametersOptions = {
                enableDragInteraction: true,
                addButtons: true,
                onMoveNodeCallback: handleNodeMove,
                onMoveTextNodeCallback: handleTextNodeMove,
                onSelectNodeCallback: handleNodeSelect,
                onToggleHoverCallback: handleToggleNadHover,
                onRightClickCallback: handleRightClick,
                onBendLineCallback: handleLineBending,
            };
            new NetworkAreaDiagramViewer(
                document.getElementById('svg-container-nad-pst-hvdc')!,
                svgContent,
                NadSvgPstHvdcExampleMeta,
                nadViewerParametersOptions
            );
        });

    new NetworkAreaDiagramViewer(
        document.getElementById('svg-container-nad-pst-hvdc-c')!,
        '',
        NadSvgPstHvdcExampleMeta,
        nadViewerParametersOptions
    );

    fetch(NadSvgThreeWTBoundaryLineUnknownBusExample)
        .then((response) => response.text())
        .then((svgContent) => {
            const nadViewerParametersOptions: NadViewerParametersOptions = {
                enableDragInteraction: true,
                addButtons: true,
                onMoveNodeCallback: handleNodeMove,
                onMoveTextNodeCallback: handleTextNodeMove,
                onSelectNodeCallback: handleNodeSelect,
                onToggleHoverCallback: handleToggleNadHover,
                onRightClickCallback: handleRightClick,
                onBendLineCallback: handleLineBending,
            };
            new NetworkAreaDiagramViewer(
                document.getElementById('svg-container-nad-threewt-dl-ub')!,
                svgContent,
                NadSvgThreeWTBoundaryLineUnknownBusExampleMeta,
                nadViewerParametersOptions
            );
        });

    new NetworkAreaDiagramViewer(
        document.getElementById('svg-container-nad-threewt-dl-ub-c')!,
        '',
        NadSvgThreeWTBoundaryLineUnknownBusExampleMeta,
        nadViewerParametersOptions
    );

    fetch(NadSvgPartialNetworkExample)
        .then((response) => response.text())
        .then((svgContent) => {
            const nadViewerParametersOptions: NadViewerParametersOptions = {
                enableDragInteraction: true,
                addButtons: true,
                onMoveNodeCallback: handleNodeMove,
                onMoveTextNodeCallback: handleTextNodeMove,
                onSelectNodeCallback: handleNodeSelect,
                onToggleHoverCallback: handleToggleNadHover,
                onRightClickCallback: handleRightClick,
                onBendLineCallback: handleLineBending,
            };
            new NetworkAreaDiagramViewer(
                document.getElementById('svg-container-nad-partial-network')!,
                svgContent,
                NadSvgPartialNetworkExampleMeta,
                nadViewerParametersOptions
            );
        });

    new NetworkAreaDiagramViewer(
        document.getElementById('svg-container-nad-partial-network-c')!,
        '',
        NadSvgPartialNetworkExampleMeta,
        nadViewerParametersOptions
    );

    fetch(NadSvgMultibusVLNodesMiddleArrowExample)
        .then((response) => response.text())
        .then((svgContent) => {
            const nadViewerParametersOptions: NadViewerParametersOptions = {
                enableDragInteraction: true,
                addButtons: true,
                onMoveNodeCallback: handleNodeMove,
                onMoveTextNodeCallback: handleTextNodeMove,
                onSelectNodeCallback: handleNodeSelect,
                onToggleHoverCallback: handleToggleNadHover,
                onRightClickCallback: handleRightClick,
                onBendLineCallback: handleLineBending,

                adaptiveTextZoom: { enabled: true, threshold: 1880 },
            };
            new NetworkAreaDiagramViewer(
                document.getElementById('svg-container-nad-multibus-vlnodes-middle-arrow')!,
                svgContent,
                NadSvgMultibusVLNodesMiddleArrowExampleMeta,
                nadViewerParametersOptions
            );
        });

    new NetworkAreaDiagramViewer(
        document.getElementById('svg-container-nad-multibus-vlnodes-middle-arrow-c')!,
        '',
        NadSvgMultibusVLNodesMiddleArrowExampleMeta,
        nadViewerParametersOptions
    );

    fetch(NadSvgPstHvdcMultipleLabelsExample)
        .then((response) => response.text())
        .then((svgContent) => {
            const nadViewerParametersOptions: NadViewerParametersOptions = {
                enableDragInteraction: true,
                addButtons: true,
                onMoveNodeCallback: handleNodeMove,
                onMoveTextNodeCallback: handleTextNodeMove,
                onSelectNodeCallback: handleNodeSelect,
                onToggleHoverCallback: handleToggleNadHover,
                onRightClickCallback: handleRightClick,
                onBendLineCallback: handleLineBending,
                adaptiveTextZoom: { enabled: true, threshold: 1500 },
            };
            new NetworkAreaDiagramViewer(
                document.getElementById('svg-container-nad-pst-hvdc-multiple-labels')!,
                svgContent,
                NadSvgPstHvdcMultipleLabelsExampleMeta,
                nadViewerParametersOptions
            );
        });

    new NetworkAreaDiagramViewer(
        document.getElementById('svg-container-nad-pst-hvdc-multiple-labels-c')!,
        '',
        NadSvgPstHvdcMultipleLabelsExampleMeta,
        nadViewerParametersOptions
    );

    fetch(NadSvgDoubleArrowsExample)
        .then((response) => response.text())
        .then((svgContent) => {
            const nadViewerParametersOptions: NadViewerParametersOptions = {
                enableDragInteraction: true,
                addButtons: true,
                onMoveNodeCallback: handleNodeMove,
                onMoveTextNodeCallback: handleTextNodeMove,
                onSelectNodeCallback: handleNodeSelect,
                onToggleHoverCallback: handleToggleNadHover,
                onRightClickCallback: handleRightClick,
                onBendLineCallback: handleLineBending,
                adaptiveTextZoom: { enabled: true, threshold: 1100 },
            };
            new NetworkAreaDiagramViewer(
                document.getElementById('svg-container-nad-double-arrows')!,
                svgContent,
                NadSvgDoubleArrowsExampleMeta,
                nadViewerParametersOptions
            );
        });

    new NetworkAreaDiagramViewer(
        document.getElementById('svg-container-nad-double-arrows-c')!,
        '',
        NadSvgDoubleArrowsExampleMeta,
        nadViewerParametersOptions
    );

    fetch(NadSvgComponentsExample)
        .then((response) => response.text())
        .then((svgContent) => {
            const nadViewerParametersOptions: NadViewerParametersOptions = {
                enableDragInteraction: true,
                addButtons: true,
                onMoveNodeCallback: handleNodeMove,
                onMoveTextNodeCallback: handleTextNodeMove,
                onSelectNodeCallback: handleNodeSelect,
                onToggleHoverCallback: handleToggleNadHover,
                onRightClickCallback: handleRightClick,
                onBendLineCallback: handleLineBending,
                adaptiveTextZoom: { enabled: true, threshold: 1100 },
            };
            new NetworkAreaDiagramViewer(
                document.getElementById('svg-container-nad-components')!,
                svgContent,
                NadSvgComponentsExampleMeta,
                nadViewerParametersOptions
            );
        });

    new NetworkAreaDiagramViewer(
        document.getElementById('svg-container-nad-components-c')!,
        '',
        NadSvgComponentsExampleMeta,
        nadViewerParametersOptions
    );

    fetch(NadSvgPegaseNetworkExample)
        .then((response) => response.text())
        .then((svgContent) => {
            const nadViewerParametersOptions: NadViewerParametersOptions = {
                enableDragInteraction: true,
                enableLevelOfDetail: true,
                zoomLevels: [0, 1000, 2200, 2500, 3000, 4000, 9000, 12000, 20000],
                addButtons: true,
                onMoveNodeCallback: handleNodeMove,
                onMoveTextNodeCallback: handleTextNodeMove,
                onSelectNodeCallback: handleNodeSelect,
                onToggleHoverCallback: handleToggleNadHover,
                onRightClickCallback: handleRightClick,
                onBendLineCallback: handleLineBending,
            };
            new NetworkAreaDiagramViewer(
                document.getElementById('svg-container-nad-pegase-network')!,
                svgContent,
                NadSvgPegaseNetworkExampleMeta,
                nadViewerParametersOptions
            );
        });

    const nadViewerParametersOptionsPegase: NadViewerParametersOptions = {
        minWidth: 1000,
        minHeight: 1200,
        onMoveNodeCallback: handleNodeMove,
        onMoveTextNodeCallback: handleTextNodeMove,
        onSelectNodeCallback: handleNodeSelect,
        onToggleHoverCallback: handleToggleNadHover,
        onRightClickCallback: handleRightClick,
        onBendLineCallback: handleLineBending,
        createSvgFromMetadata: true,
    };
    new NetworkAreaDiagramViewer(
        document.getElementById('svg-container-nad-pegase-network-c')!,
        '',
        NadSvgPegaseNetworkExampleMeta,
        nadViewerParametersOptionsPegase
    );
};

addCreatedNadToDemo();
