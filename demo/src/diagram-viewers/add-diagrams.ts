/**
 * Copyright (c) 2022, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import NadSvgExample from './data/nad-eurostag-tutorial-example1.svg';
import NadSvgExampleMeta from './data/nad-eurostag-tutorial-example1_metadata.json';
import NadSvgPstHvdcExample from './data/nad-four-substations.svg';
import NadSvgPstHvdcExampleMeta from './data/nad-four-substations_metadata.json';
import NadSvgMultibusVLNodesExample from './data/nad-ieee9-zeroimpedance-cdf.svg';
import NadSvgMultibusVLNodesExampleMeta from './data/nad-ieee9-zeroimpedance-cdf_metadata.json';
import NadSvgMultibusVLNodes14Example from './data/nad-ieee14cdf-solved.svg';
import NadSvgMultibusVLNodes14ExampleMeta from './data/nad-ieee14cdf-solved_metadata.json';
import NadSvgThreeWTDanglingLineUnknownBusExample from './data/nad-scada.svg';
import NadSvgThreeWTDanglingLineUnknownBusExampleMeta from './data/nad-scada_metadata.json';
import NadSvgPartialNetworkExample from './data/nad-ieee300cdf-VL9006.svg';
import NadSvgPartialNetworkExampleMeta from './data/nad-ieee300cdf-VL9006_metadata.json';
import NadSvgPegaseNetworkExample from './data/case1354pegase.svg';
import NadSvgPegaseNetworkExampleMeta from './data/case1354pegase_metadata.json';
import SldSvgExample from './data/sld-example.svg';
import SldSvgExampleMeta from './data/sld-example_metadata.json';
import SldSvgSubExample from './data/sld-sub-example.svg';
import SldSvgSubExampleMeta from './data/sld-sub-example_metadata.json';

import {
    NetworkAreaDiagramViewer,
    SingleLineDiagramViewer,
    OnToggleSldHoverCallbackType,
    OnBreakerCallbackType,
    OnBusCallbackType,
    OnFeederCallbackType,
    OnNextVoltageCallbackType,
    OnMoveNodeCallbackType,
    OnMoveTextNodeCallbackType,
    OnSelectNodeCallbackType,
    OnToggleNadHoverCallbackType,
    BranchState,
    OnRightClickCallbackType,
} from '../../../src';

export const addNadToDemo = () => {
    fetch(NadSvgExample)
        .then((response) => response.text())
        .then((svgContent) => {
            const nadViewer = new NetworkAreaDiagramViewer(
                document.getElementById('svg-container-nad')!,
                svgContent,
                NadSvgExampleMeta,
                500,
                600,
                1000,
                1200,
                handleNodeMove,
                handleTextNodeMove,
                handleNodeSelect,
                true,
                false,
                null,
                handleToggleNadHover,
                handleRightClick,
                true
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
            new NetworkAreaDiagramViewer(
                document.getElementById('svg-container-nad-no-moving')!,
                svgContent,
                NadSvgExampleMeta,
                500,
                600,
                1000,
                1200,
                handleNodeMove,
                handleTextNodeMove,
                handleNodeSelect,
                false,
                false,
                null,
                handleToggleNadHover,
                handleRightClick,
                false
            );
        });

    fetch(NadSvgMultibusVLNodesExample)
        .then((response) => response.text())
        .then((svgContent) => {
            const nadViewer = new NetworkAreaDiagramViewer(
                document.getElementById('svg-container-nad-multibus-vlnodes')!,
                svgContent,
                NadSvgMultibusVLNodesExampleMeta,
                500,
                600,
                1000,
                1200,
                handleNodeMove,
                handleTextNodeMove,
                handleNodeSelect,
                true,
                false,
                null,
                handleToggleNadHover,
                handleRightClick,
                true
            );

            // add button to update branch labels
            const branchLabels =
                '[{"branchId": "L7-5-0", "value1": 609, "value2": -611,"connectedBus1":"VL2_0","connectedBus2":"VL5_0"}]';
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
            new NetworkAreaDiagramViewer(
                document.getElementById('svg-container-nad-multibus-vlnodes14')!,
                svgContent,
                NadSvgMultibusVLNodes14ExampleMeta,
                500,
                600,
                1000,
                1200,
                handleNodeMove,
                handleTextNodeMove,
                handleNodeSelect,
                true,
                false,
                null,
                handleToggleNadHover,
                handleRightClick,
                true
            );
        });

    fetch(NadSvgPstHvdcExample)
        .then((response) => response.text())
        .then((svgContent) => {
            new NetworkAreaDiagramViewer(
                document.getElementById('svg-container-nad-pst-hvdc')!,
                svgContent,
                NadSvgPstHvdcExampleMeta,
                500,
                600,
                1000,
                1200,
                handleNodeMove,
                handleTextNodeMove,
                handleNodeSelect,
                true,
                false,
                null,
                handleToggleNadHover,
                handleRightClick,
                true
            );
        });

    fetch(NadSvgThreeWTDanglingLineUnknownBusExample)
        .then((response) => response.text())
        .then((svgContent) => {
            new NetworkAreaDiagramViewer(
                document.getElementById('svg-container-nad-threewt-dl-ub')!,
                svgContent,
                NadSvgThreeWTDanglingLineUnknownBusExampleMeta,
                500,
                600,
                1000,
                1200,
                handleNodeMove,
                handleTextNodeMove,
                handleNodeSelect,
                true,
                false,
                null,
                handleToggleNadHover,
                handleRightClick,
                true
            );
        });

    fetch(NadSvgPartialNetworkExample)
        .then((response) => response.text())
        .then((svgContent) => {
            new NetworkAreaDiagramViewer(
                document.getElementById('svg-container-nad-partial-network')!,
                svgContent,
                NadSvgPartialNetworkExampleMeta,
                500,
                600,
                1000,
                1200,
                handleNodeMove,
                handleTextNodeMove,
                handleNodeSelect,
                true,
                false,
                null,
                handleToggleNadHover,
                handleRightClick,
                true
            );
        });

    fetch(NadSvgPegaseNetworkExample)
        .then((response) => response.text())
        .then((svgContent) => {
            const svgContainerNadPegase = document.getElementById('svg-container-nad-pegase-network');
            new NetworkAreaDiagramViewer(
                svgContainerNadPegase!,
                svgContent,
                NadSvgPegaseNetworkExampleMeta,
                500,
                600,
                1000,
                1200,
                handleNodeMove,
                handleTextNodeMove,
                handleNodeSelect,
                true,
                true,
                [0, 1000, 2200, 2500, 3000, 4000, 9000, 12000, 20000],
                handleToggleNadHover,
                handleRightClick,
                true
            );
        });
};

export const addSldToDemo = () => {
    fetch(SldSvgExample)
        .then((response) => response.text())
        .then((svgContent) => {
            new SingleLineDiagramViewer(
                document.getElementById('svg-container-sld')!,
                svgContent, //svg content
                null, //svg metadata
                'voltage-level',
                500,
                600,
                1000,
                1200,
                null, //callback on the next voltage arrows
                null, //callback on the breakers
                null, //callback on the feeders
                null, //callback on the buses
                // @ts-expect-error: TODO look if null is really possible in code
                null, //arrows color
                null //hovers on equipments callback
            );
        });

    fetch(SldSvgExample)
        .then((response) => response.text())
        .then((svgContent) => {
            new SingleLineDiagramViewer(
                document.getElementById('svg-container-sld-with-callbacks')!,
                svgContent, //svg content
                // @ts-expect-error: incomplete data in example json
                SldSvgExampleMeta, //svg metadata
                'voltage-level',
                500,
                600,
                1000,
                1200,
                handleNextVL, //callback on the next voltage arrows
                handleSwitch, //callback on the breakers
                handleFeeder, //callback on the feeders
                handleBus, //callback on the buses
                'lightblue', //arrows color
                handleToggleSldHover //hovers on equipments callback
            );
        });

    fetch(SldSvgSubExample)
        .then((response) => response.text())
        .then((svgContent) => {
            new SingleLineDiagramViewer(
                document.getElementById('svg-container-sldsub-with-callbacks')!,
                svgContent, //svg content
                // @ts-expect-error: incomplete data in example json
                SldSvgSubExampleMeta, //svg metadata
                'substation',
                500,
                600,
                1200,
                1200,
                handleNextVL, //callback on the next voltage arrows
                handleSwitch, //callback on the breakers
                handleFeeder, //callback on the feeders
                handleBus, //callback on the buses
                'lightblue', //arrows color
                handleToggleSldHover //hovers on equipments callback
            );
        });
};

const handleNextVL: OnNextVoltageCallbackType = (id: string) => {
    const msg = 'Clicked on navigation arrow, dest VL is ' + id;
    console.log(msg);
};

const handleSwitch: OnBreakerCallbackType = (id, switch_status, element) => {
    const msg =
        'Clicked on switch: ' +
        id +
        ', switch_status: ' +
        (switch_status ? 'close' : 'open') +
        '. elementId: ' +
        element?.id;
    console.log(msg);
};

const handleFeeder: OnFeederCallbackType = (id, feederType, svgId, x, y) => {
    const msg =
        'Clicked on feeder: ' + id + ', feeder type: ' + feederType + ', svgId: ' + svgId + 'x: ' + x + ', y: ' + y;
    console.log(msg);
};

const handleBus: OnBusCallbackType = (id, svgId, x, y) => {
    const msg = 'Clicked on bus: ' + id + ', svgId: ' + svgId + 'x: ' + x + ', y: ' + y;
    console.log(msg);
};

const handleToggleSldHover: OnToggleSldHoverCallbackType = (hovered, anchorEl, equipmentId, equipmentType) => {
    if (hovered) {
        const msg = 'Hovers on equipment: ' + equipmentId + ', equipmentType: ' + equipmentType;
        console.log(msg);
    }
};

const handleNodeMove: OnMoveNodeCallbackType = (equipmentId, nodeId, x, y, xOrig, yOrig) => {
    const msg =
        'Node ' +
        nodeId +
        ' equipment ' +
        equipmentId +
        ' moved from [' +
        xOrig +
        ', ' +
        yOrig +
        '] to [' +
        x +
        ', ' +
        y +
        ']';
    console.log(msg);
};

const handleTextNodeMove: OnMoveTextNodeCallbackType = (
    equipmentId,
    nodeId,
    textNodeId,
    shiftX,
    shiftY,
    shiftXOrig,
    shiftYOrig,
    connectionShiftX,
    connectionShiftY,
    connectionShiftXOrig,
    connectionShiftYOrig
) => {
    const msg =
        'TextNode ' +
        textNodeId +
        ' Node ' +
        nodeId +
        ' equipment ' +
        equipmentId +
        ' position shift changed from [' +
        shiftXOrig +
        ', ' +
        shiftYOrig +
        '] to [' +
        shiftX +
        ', ' +
        shiftY +
        '] connection shift changed from [' +
        connectionShiftXOrig +
        ', ' +
        connectionShiftYOrig +
        '] to [' +
        connectionShiftX +
        ', ' +
        connectionShiftY +
        ']';
    console.log(msg);
};

const handleNodeSelect: OnSelectNodeCallbackType = (equipmentId, nodeId, mousePosition) => {
    let msg = 'Node ' + nodeId + ' equipment ' + equipmentId + ' selected';
    if (mousePosition) {
        msg += ' on mousePosition: x = ' + mousePosition.x + ', y = ' + mousePosition.y;
    }
    console.log(msg);
};

const handleToggleNadHover: OnToggleNadHoverCallbackType = (hovered, mousePosition, equipmentId, equipmentType) => {
    if (hovered) {
        const msg =
            'Hovers on equipment: ' +
            equipmentId +
            ', equipmentType: ' +
            equipmentType +
            ', mousePosition : x =' +
            mousePosition?.x +
            ', y=' +
            mousePosition?.y;
        console.log(msg);
    }
};

const handleRightClick: OnRightClickCallbackType = (svgId, equipmentId, equipmentType, mousePosition) => {
    const msg =
        'Right click on element : ' +
        svgId +
        ', equipment: ' +
        equipmentId +
        ', equipmentType: ' +
        equipmentType +
        ', mousePosition : x =' +
        mousePosition?.x +
        ', y=' +
        mousePosition?.y;
    console.log(msg);
};
