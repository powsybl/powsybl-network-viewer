/**
 * Copyright (c) 2024, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

//FIXME workaround svg.panzoom.js import crash even though it's not used
/* eslint-disable */
declare var SVG: any;
global.SVG = () => {};
global.SVG.extend = () => {};
/* eslint-enable */

const canvas2DContextStub = {
    font: '',
    clearRect: () => {},
    fillRect: () => {},
    fillText: () => {},
    strokeText: () => {},
    measureText: (text: string) => {
        const width = text.length * 8;
        return {
            width,
            actualBoundingBoxLeft: 0,
            actualBoundingBoxRight: width,
            actualBoundingBoxAscent: 8,
            actualBoundingBoxDescent: 2,
            fontBoundingBoxAscent: 8,
            fontBoundingBoxDescent: 2,
        };
    },
    getImageData: (sx: number, sy: number, sw: number, sh: number) => ({
        data: new Uint8ClampedArray(sw * sh * 4),
        width: sw,
        height: sh,
    }),
    putImageData: () => {},
    drawImage: () => {},
    createImageData: (sw: number, sh: number) => ({
        data: new Uint8ClampedArray(sw * sh * 4),
        width: sw,
        height: sh,
    }),
};

if (typeof HTMLCanvasElement !== 'undefined') {
    HTMLCanvasElement.prototype.getContext = function (contextId: '2d' | 'bitmaprenderer' | 'webgl' | 'webgl2') {
        if (contextId === '2d') {
            return canvas2DContextStub as unknown as CanvasRenderingContext2D;
        }
        return null;
    } as unknown as typeof HTMLCanvasElement.prototype.getContext;
}
