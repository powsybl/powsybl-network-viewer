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
import NadSvgPstHvdcCustomExample from './diagram-viewers/data/nad-four-substations_custom.svg';
import NadSvgPstHvdcCustomExampleMeta from './diagram-viewers/data/nad-four-substations_custom_metadata.json';
import NadSvgPstHvdcMultipleLabelsExample from './diagram-viewers/data/nad-four-substations-multiple-labels.svg';
import NadSvgPstHvdcMultipleLabelsExampleMeta from './diagram-viewers/data/nad-four-substations-multiple-labels_metadata.json';
import NadSvgMultibusVLNodesExample from './diagram-viewers/data/nad-ieee9-zeroimpedance-cdf.svg';
import NadSvgMultibusVLNodesExampleMeta from './diagram-viewers/data/nad-ieee9-zeroimpedance-cdf_metadata.json';
import NadSvgMultibusVLNodesMiddleArrowExample from './diagram-viewers/data/nad-ieee9-zeroimpedance-cdf-middle-arrow.svg';
import NadSvgMultibusVLNodesMiddleArrowExampleMeta from './diagram-viewers/data/nad-ieee9-zeroimpedance-cdf-middle-arrow_metadata.json';
import NadSvgMultibusVLNodesLimitPercentageExample from './diagram-viewers/data/nad-ieee9-zeroimpedance-cdf-limit-percentage.svg';
import NadSvgMultibusVLNodesLimitPercentageExampleMeta from './diagram-viewers/data/nad-ieee9-zeroimpedance-cdf-limit-percentage_metadata.json';
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

import {
    BranchState,
    NadViewerParametersOptions,
    NetworkAreaDiagramViewer,
    OnToggleNadHoverCallbackType,
} from '../../src';
import {
    handleNodeMove,
    handleTextNodeMove,
    handleNodeSelect,
    handleToggleNadHover,
    handleRightClick,
    handleLineBending,
} from './diagram-viewers/nad-callbacks';

/* eslint-disable @typescript-eslint/no-floating-promises */

const addNadToDemo = () => {
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
            const nadViewer = new NetworkAreaDiagramViewer(
                document.getElementById('svg-container-nad')!,
                svgContent,
                NadSvgExampleMeta,
                nadViewerParametersOptions
            );

            // add range slider to update branch labels
            const branchLabelsSlider = document.createElement('input');
            branchLabelsSlider.type = 'range';
            branchLabelsSlider.min = '1';
            branchLabelsSlider.max = '20';
            branchLabelsSlider.value = '1';
            branchLabelsSlider.step = 'any';
            branchLabelsSlider.style.width = '97%';
            branchLabelsSlider.style.display = 'flex';
            branchLabelsSlider.style.justifyContent = 'space-between';
            branchLabelsSlider.style.padding = '0 5px';
            branchLabelsSlider.addEventListener('input', () => {
                const branchStates =
                    '[{"branchId": "NGEN_NHV1", "value1": ' +
                    (627 - +branchLabelsSlider.value * 20) +
                    ', "value2": ' +
                    (-626 + +branchLabelsSlider.value * 20) +
                    '}, {"branchId": "NHV1_NHV2_1", "value1": ' +
                    (+branchLabelsSlider.value < 10 ? 322 - +branchLabelsSlider.value * 20 : 0) +
                    ', "value2": ' +
                    (+branchLabelsSlider.value < 10 ? -320 + +branchLabelsSlider.value * 20 : 0) +
                    ', "connected1": ' +
                    (+branchLabelsSlider.value < 10) +
                    ', "connected2": ' +
                    (+branchLabelsSlider.value < 10) +
                    '}, {"branchId": "NHV1_NHV2_2", "value1": ' +
                    (322 - +branchLabelsSlider.value * 20) +
                    ', "value2": ' +
                    (-320 + +branchLabelsSlider.value * 20) +
                    '}, {"branchId": "NHV2_NLOAD", "value1": ' +
                    (-620 + +branchLabelsSlider.value * 20) +
                    ', "value2": ' +
                    (621 - +branchLabelsSlider.value * 20) +
                    '}]';
                nadViewer.setJsonBranchStates(branchStates);
            });

            document.getElementById('svg-container-nad')?.appendChild(branchLabelsSlider);
        });

    fetch(NadSvgExample)
        .then((response) => response.text())
        .then((svgContent) => {
            const nadViewerParametersOptions: NadViewerParametersOptions = {
                onMoveNodeCallback: handleNodeMove,
                onMoveTextNodeCallback: handleTextNodeMove,
                onSelectNodeCallback: handleNodeSelect,
                onToggleHoverCallback: handleToggleNadHover,
                onRightClickCallback: handleRightClick,
                onBendLineCallback: handleLineBending,
            };
            new NetworkAreaDiagramViewer(
                document.getElementById('svg-container-nad-no-moving')!,
                svgContent,
                NadSvgExampleMeta,
                nadViewerParametersOptions
            );
        });

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
            const nadViewer = new NetworkAreaDiagramViewer(
                document.getElementById('svg-container-nad-multibus-vlnodes')!,
                svgContent,
                NadSvgMultibusVLNodesExampleMeta,
                nadViewerParametersOptions
            );

            // add button to update branch labels
            const branchLabels =
                '[{"branchId": "L9-8-0", "value1": 609, "value2": -611,"connectedBus1":"VL3_0","connectedBus2":"VL2_0"}, {"branchId": "L7-5-0", "value1": 609, "value2": -611}]';
            const updateFlowsTextArea = document.createElement('textarea');
            updateFlowsTextArea.rows = 2;
            updateFlowsTextArea.cols = 65;
            updateFlowsTextArea.value = branchLabels;
            const br = document.createElement('br');
            const updateFlowsButton = document.createElement('button');
            updateFlowsButton.innerHTML = 'Update Branch Labels';
            updateFlowsButton.addEventListener('click', () => {
                const branchStatesArray: BranchState[] = JSON.parse(updateFlowsTextArea.value);
                nadViewer.setBranchStates(branchStatesArray);
            });
            const updateFlowsDiv = document.createElement('div');
            updateFlowsDiv.appendChild(updateFlowsTextArea);
            updateFlowsDiv.appendChild(br);
            updateFlowsDiv.appendChild(updateFlowsButton);
            document.getElementById('svg-container-nad-multibus-vlnodes')?.appendChild(updateFlowsDiv);

            // add range slider to update voltageLevel states
            const voltageLevelSlider = document.createElement('input');
            voltageLevelSlider.type = 'range';
            voltageLevelSlider.min = '1';
            voltageLevelSlider.max = '20';
            voltageLevelSlider.value = '1';
            voltageLevelSlider.step = 'any';
            voltageLevelSlider.style.width = '97%';
            voltageLevelSlider.style.display = 'flex';
            voltageLevelSlider.style.justifyContent = 'space-between';
            voltageLevelSlider.style.padding = '0 5px';

            // Create slider event listener
            voltageLevelSlider.addEventListener('input', (e) => {
                const target = e.target as HTMLInputElement;
                const factor = parseFloat(target.value) / 100;
                const angleFactor = 2 - factor;

                const voltageLevelStates = `[{
                    "voltageLevelId": "VL1",
                    "busValue": [
                        { "busId": "VL1_0", "voltage": ${104 * factor}, "angle": ${0} },
                        { "busId": "VL1_1", "voltage": ${102.5 * factor}, "angle": ${-2.2 * angleFactor} }
                    ]
                }, {
                    "voltageLevelId": "VL2",
                    "busValue": [
                        { "busId": "VL2_0", "voltage": ${102.5 * factor}, "angle": ${9.3 * angleFactor} },
                        { "busId": "VL2_1", "voltage": ${101.5 * factor}, "angle": ${0.7 * angleFactor} },
                        { "busId": "VL2_2", "voltage": ${102.5 * factor}, "angle": ${3.7 * angleFactor} }
                    ]
                }]`;

                nadViewer.setJsonVoltageLevelStates(voltageLevelStates);
            });
            document.getElementById('svg-container-nad-multibus-vlnodes')?.appendChild(voltageLevelSlider);
        });

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
                initialViewBox: {
                    x: -250.0,
                    y: -450.0,
                    width: 1100,
                    height: 1100,
                },
            };
            new NetworkAreaDiagramViewer(
                document.getElementById('svg-container-nad-partial-network-custom-view-box')!,
                svgContent,
                NadSvgPartialNetworkExampleMeta,
                nadViewerParametersOptions
            );
        });

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
            const svgContainerNadPegase = document.getElementById('svg-container-nad-pegase-network');
            new NetworkAreaDiagramViewer(
                svgContainerNadPegase!,
                svgContent,
                NadSvgPegaseNetworkExampleMeta,
                nadViewerParametersOptions
            );
        });

    fetch(NadSvgPegaseNetworkExample)
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

                adaptiveTextZoom: {
                    enabled: true,
                    threshold: 3000,
                },
            };
            const svgContainerNadPegase = document.getElementById('svg-container-nad-pegase-network-adaptive-zoom');
            new NetworkAreaDiagramViewer(
                svgContainerNadPegase!,
                svgContent,
                NadSvgPegaseNetworkExampleMeta,
                nadViewerParametersOptions
            );
        });

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

                adaptiveTextZoom: { enabled: true, threshold: 850 },
            };
            new NetworkAreaDiagramViewer(
                document.getElementById('svg-container-nad-partial-network-adaptive-zoom')!,
                svgContent,
                NadSvgMultibusVLNodesExampleMeta,
                nadViewerParametersOptions
            );
        });

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

                adaptiveTextZoom: { enabled: true, threshold: 850 },
            };
            new NetworkAreaDiagramViewer(
                document.getElementById('svg-container-nad-multibus-vlnodes-middle-arrow')!,
                svgContent,
                NadSvgMultibusVLNodesMiddleArrowExampleMeta,
                nadViewerParametersOptions
            );
        });

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

                adaptiveTextZoom: {
                    enabled: true,
                    edgeSideLabelThreshold: 1000,
                    edgeMiddleArrowThreshold: 2000,
                    edgeMiddleLabelThreshold: 1500,
                    threshold: 2500,
                },
            };
            new NetworkAreaDiagramViewer(
                document.getElementById('svg-container-nad-multibus-vlnodes-adaptive-thresholds')!,
                svgContent,
                structuredClone(NadSvgMultibusVLNodesMiddleArrowExampleMeta),
                nadViewerParametersOptions
            );
        });

    fetch(NadSvgMultibusVLNodesLimitPercentageExample)
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

                adaptiveTextZoom: { enabled: true, threshold: 3000 },
            };
            const nadViewer = new NetworkAreaDiagramViewer(
                document.getElementById('svg-container-nad-multibus-vlnodes-limit-percentage')!,
                svgContent,
                NadSvgMultibusVLNodesLimitPercentageExampleMeta,
                nadViewerParametersOptions
            );

            nadViewer.moveNodeToCoordinates('VL5', -100, -50);
        });

    fetch(NadSvgMultibusVLNodes14Example)
        .then((response) => response.text())
        .then((svgContent) => {
            function getRandomColor() {
                const letters = '0123456789ABCDEF';
                let color = '#';
                for (let i = 0; i < 6; i++) {
                    color += letters[Math.floor(Math.random() * 16)];
                }
                return color + 'aa';
            }

            const defaultHoverPositionPrecision: number = 10;

            const showHoveredEquipmentId: OnToggleNadHoverCallbackType = (
                hovered,
                mousePosition,
                equipmentId,
                equipmentType
            ) => {
                const hoverDiv = document.getElementById('hoverVisualizer');
                if (hoverDiv) {
                    hoverDiv.textContent = hovered ? 'Hovering over ' + equipmentId : 'No hover at the moment';
                }

                document.getElementById('hoverPopup')?.remove();
                if (hovered) {
                    const hoverPopup = document.createElement('div');
                    hoverPopup.id = 'hoverPopup';
                    hoverPopup.style.display = 'block';
                    hoverPopup.style.position = 'fixed';
                    hoverPopup.style.left = (mousePosition?.x || 0) + 'px';
                    hoverPopup.style.top = (mousePosition?.y || 0) + 'px';
                    hoverPopup.style.backgroundColor = '#eeeeeeaa';
                    hoverPopup.style.margin = '10px';
                    hoverPopup.style.padding = '5px';
                    hoverPopup.style.border = 'solid 1px #ddd';
                    hoverPopup.style.borderRadius = '5px';
                    hoverPopup.textContent = 'Hover ' + equipmentId;
                    const randomColor = document.createElement('div');
                    randomColor.style.backgroundColor = getRandomColor();
                    randomColor.innerHTML = '&nbsp;';
                    hoverPopup.appendChild(randomColor);
                    document.getElementById('svg-container-nad-hoverCallback')?.appendChild(hoverPopup);
                }

                handleToggleNadHover(hovered, mousePosition, equipmentId, equipmentType);
            };

            const nadViewerParametersOptions: NadViewerParametersOptions = {
                enableDragInteraction: true,
                enableLevelOfDetail: true,
                addButtons: true,
                onMoveNodeCallback: handleNodeMove,
                onMoveTextNodeCallback: handleTextNodeMove,
                onSelectNodeCallback: handleNodeSelect,
                onToggleHoverCallback: showHoveredEquipmentId,
                onBendLineCallback: handleLineBending,
                onRightClickCallback: handleRightClick,
                hoverPositionPrecision: defaultHoverPositionPrecision,
            };

            const nadViewer = new NetworkAreaDiagramViewer(
                document.getElementById('svg-container-nad-hoverCallback')!,
                svgContent,
                NadSvgMultibusVLNodes14ExampleMeta,
                nadViewerParametersOptions
            );

            // add range slider to update hover position precision
            const hoverSliderDiv = document.createElement('div');
            hoverSliderDiv.id = 'hoverSliderDiv';
            hoverSliderDiv.style.display = 'flex';
            hoverSliderDiv.style.justifyContent = 'space-between';
            document.getElementById('svg-container-nad-hoverCallback')?.appendChild(hoverSliderDiv);

            const hoverSlider = document.createElement('input');
            hoverSlider.id = 'hoverSlider';
            hoverSlider.type = 'range';
            hoverSlider.min = '0';
            hoverSlider.max = '50';
            hoverSlider.value = defaultHoverPositionPrecision.toString();
            hoverSlider.step = '1';
            hoverSlider.style.display = 'flex';
            hoverSlider.style.flexGrow = '1';
            hoverSlider.style.padding = '0 5px';

            // Create slider event listener
            hoverSlider.addEventListener('input', (e) => {
                const target = e.target as HTMLInputElement;
                nadViewer.hoverPositionPrecision = Number(target.value);
                const hoverSliderValueDisplay = document.getElementById('hoverSliderValueDisplay');
                if (hoverSliderValueDisplay) {
                    hoverSliderValueDisplay.textContent = target.value;
                }
            });
            hoverSliderDiv.appendChild(hoverSlider);

            const hoverSliderValueDisplay = document.createElement('span');
            hoverSliderValueDisplay.id = 'hoverSliderValueDisplay';
            hoverSliderValueDisplay.textContent = defaultHoverPositionPrecision.toString();
            hoverSliderValueDisplay.style.width = '20px';
            hoverSliderValueDisplay.style.padding = '0 5px';
            hoverSliderDiv.appendChild(hoverSliderValueDisplay);

            const hoverVisualizer = document.createElement('div');
            hoverVisualizer.id = 'hoverVisualizer';
            hoverVisualizer.textContent = 'No hover at the moment';
            document.getElementById('svg-container-nad-hoverCallback')?.appendChild(hoverVisualizer);
        });

    fetch(NadSvgPstHvdcCustomExample)
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
                document.getElementById('svg-container-nad-pst-hvdc-custom')!,
                svgContent,
                NadSvgPstHvdcCustomExampleMeta,
                nadViewerParametersOptions
            );
        });

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
};

addNadToDemo();
