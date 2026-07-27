/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

export const handleNodeMove = (equipmentId, nodeId, x, y, xOrig, yOrig) => {
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

export const handleTextNodeMove = (
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

export const handleNodeSelect = (equipmentId, nodeId, mousePosition) => {
    let msg = 'Node ' + nodeId + ' equipment ' + equipmentId + ' selected';
    if (mousePosition) {
        msg += ' on mousePosition: x = ' + mousePosition.x + ', y = ' + mousePosition.y;
    }
    console.log(msg);
};

export const handleToggleNadHover = (hovered, mousePosition, equipmentId, equipmentType) => {
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

export const handleRightClick = (svgId, equipmentId, equipmentType, mousePosition) => {
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