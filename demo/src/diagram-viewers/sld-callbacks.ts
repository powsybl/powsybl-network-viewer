/*
 * Copyright (c) 2026, RTE (https://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import {
    OnBreakerCallbackType,
    OnBusCallbackType,
    OnFeederCallbackType,
    OnNextVoltageCallbackType,
    OnToggleSldHoverCallbackType,
} from '../../../src';

export const handleNextVL: OnNextVoltageCallbackType = (id: string, event: MouseEvent) => {
    const msg = (event.ctrlKey ? 'CTRL + ' : '') + 'Click on navigation arrow, dest VL is ' + id;
    console.log(msg);
};

export const handleSwitch: OnBreakerCallbackType = (id, switch_status, element) => {
    const msg =
        'Clicked on switch: ' +
        id +
        ', switch_status: ' +
        (switch_status ? 'close' : 'open') +
        '. elementId: ' +
        element?.id;
    console.log(msg);
};

export const handleFeeder: OnFeederCallbackType = (id, feederType, svgId, x, y) => {
    const msg =
        'Clicked on feeder: ' + id + ', feeder type: ' + feederType + ', svgId: ' + svgId + 'x: ' + x + ', y: ' + y;
    console.log(msg);
};

export const handleBus: OnBusCallbackType = (id, svgId, x, y) => {
    const msg = 'Clicked on bus: ' + id + ', svgId: ' + svgId + 'x: ' + x + ', y: ' + y;
    console.log(msg);
};

export const handleToggleSldHover: OnToggleSldHoverCallbackType = (hovered, anchorEl, equipmentId, equipmentType) => {
    if (hovered) {
        const msg = 'Hovers on equipment: ' + equipmentId + ', equipmentType: ' + equipmentType;
        console.log(msg);
    }
};
