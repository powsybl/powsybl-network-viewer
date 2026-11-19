/*
 * Copyright (c) 2026, RTE (https://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import {
    OnBendLineCallbackType,
    OnClickNodeCallbackType,
    OnMoveNodesCallbackType,
    OnMoveTextNodeCallbackType,
    OnPolygonSelectionModeCallbackType,
    OnRightClickCallbackType,
    OnSelectionChangeCallbackType,
    OnToggleNadHoverCallbackType,
} from '../../../src';

export const handleNodesMove: OnMoveNodesCallbackType = (movedNodes) => {
    console.log('Moved nodes', movedNodes);
};

export const handleTextNodeMove: OnMoveTextNodeCallbackType = (
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

export const handleNodeClick: OnClickNodeCallbackType = (equipmentId, nodeId, mousePosition) => {
    let msg = 'Node ' + nodeId + ' equipment ' + equipmentId + ' clicked';
    if (mousePosition) {
        msg += ' on mousePosition: x = ' + mousePosition.x + ', y = ' + mousePosition.y;
    }
    console.log(msg);
};

export const handleSelectionChange: OnSelectionChangeCallbackType = (selectedNodes) => {
    console.log(
        'Selected nodes: [' +
            selectedNodes.map(({ equipmentId, nodeId }) => equipmentId + ' (' + nodeId + ')').join(', ') +
            ']'
    );
};

export const handlePolygonSelectionMode: OnPolygonSelectionModeCallbackType = (isActive) => {
    console.log('Polygon selection ' + (isActive ? 'started' : 'stopped'));
};

export const handleToggleNadHover: OnToggleNadHoverCallbackType = (
    hovered,
    mousePosition,
    equipmentId,
    equipmentType
) => {
    let msg = 'ToggleNadHoverCallback called';
    if (hovered) {
        msg +=
            ' with hover on equipment: ' +
            equipmentId +
            ', equipmentType: ' +
            equipmentType +
            ', mousePosition : x =' +
            mousePosition?.x +
            ', y=' +
            mousePosition?.y;
    }
    console.log(msg);
};

export const handleRightClick: OnRightClickCallbackType = (svgId, equipmentId, equipmentType, mousePosition) => {
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

export const handleLineBending: OnBendLineCallbackType = (
    svgId,
    equipmentId,
    equipmentType,
    linePoints,
    lineOperation
) => {
    const msg =
        'Bent line: ' +
        svgId +
        ', equipment: ' +
        equipmentId +
        ', equipmentType: ' +
        equipmentType +
        ', linePoints: [' +
        linePoints?.map((point: { x: number; y: number }) => point.x + ',' + point.y).join(' ') +
        '], operation: ' +
        lineOperation;
    console.log(msg);
};
