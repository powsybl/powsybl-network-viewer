/*
 * Copyright (c) 2026, RTE (https://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import {
    OnBendLineCallbackType,
    OnMoveNodeCallbackType,
    OnMoveTextNodeCallbackType,
    OnRightClickCallbackType,
    OnSelectNodeCallbackType,
    OnToggleNadHoverCallbackType,
} from '../../../src';

export const handleNodeMove: OnMoveNodeCallbackType = (equipmentId, nodeId, x, y, xOrig, yOrig) => {
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

export const handleNodeSelect: OnSelectNodeCallbackType = (equipmentId, nodeId, mousePosition) => {
    let msg = 'Node ' + nodeId + ' equipment ' + equipmentId + ' selected';
    if (mousePosition) {
        msg += ' on mousePosition: x = ' + mousePosition.x + ', y = ' + mousePosition.y;
    }
    console.log(msg);
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
