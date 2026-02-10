/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import ZoomToFitSvg from '../resources/material-icons/zoom-to-fit.svg';
import ZoomInSvg from '../resources/material-icons/zoom-in.svg';
import ZoomOutSvg from '../resources/material-icons/zoom-out.svg';
import SaveSvg from '../resources/material-icons/save_svg.svg';
import SavePng from '../resources/material-icons/save_png.svg';
import ScreenshotSvg from '../resources/material-icons/screenshot.svg';
import BendLinesSvg from '../resources/material-icons/bend-lines.svg';

function getButton(inputImg: string, title: string, size: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.style.backgroundImage = `url("${inputImg}")`;
    button.style.backgroundRepeat = 'no-repeat';
    button.style.backgroundPosition = 'center center';
    button.title = title;
    button.style.height = size;
    button.style.width = size;
    button.style.padding = '0px';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    return button;
}

export function getZoomToFitButton(): HTMLButtonElement {
    const b = getButton(ZoomToFitSvg, 'Zoom to fit', '25px');
    // button at the bottom: rounded bottom corners and top margin
    b.style.borderRadius = '0 0 5px 5px';
    b.style.marginTop = '1px';
    return b;
}

export function getZoomInButton(): HTMLButtonElement {
    const b = getButton(ZoomInSvg, 'Zoom in', '25px');
    // button at the top: rounded top corners (and no margin)
    b.style.borderRadius = '5px 5px 0 0';
    return b;
}

export function getZoomOutButton(): HTMLButtonElement {
    const b = getButton(ZoomOutSvg, 'Zoom out', '25px');
    // button in the middle: top margin (and no rounded corners)
    b.style.marginTop = '1px';
    return b;
}

export function getSaveSvgButton(): HTMLButtonElement {
    const b = getButton(SaveSvg, 'Save SVG', '30px');
    // button at the left: rounded left corners and right margin
    b.style.borderRadius = '5px 0 0 5px';
    b.style.marginRight = '1px';
    return b;
}

export function getSavePngButton(): HTMLButtonElement {
    const b = getButton(SavePng, 'Save PNG', '30px');
    // button in the middle: no rounded corners and right margin
    b.style.borderRadius = '0 0 0 0';
    b.style.marginRight = '1px';
    return b;
}

export function getDisabledScreenshotButton(): HTMLButtonElement {
    const b = getButton(ScreenshotSvg, 'Screenshot', '30px');
    // button at the right: rounded right corners and no margin
    b.style.borderRadius = '0 5px 5px 0';
    b.style.marginRight = '5px';
    b.disabled = true;
    b.style.cursor = 'not-allowed';
    return b;
}

export function enableButton(buttonElement: HTMLButtonElement) {
    buttonElement.disabled = false;
    buttonElement.style.cursor = '';
}

export function getBendLinesButton(): HTMLButtonElement {
    const b = getButton(BendLinesSvg, 'Enable line bending', '30px');
    b.style.borderRadius = '5px 5px 5px 5px';
    return b;
}
