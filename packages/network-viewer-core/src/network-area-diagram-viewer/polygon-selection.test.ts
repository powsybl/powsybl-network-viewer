/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { Point, SVG } from '@svgdotjs/svg.js';
import { PolygonSelection } from './polygon-selection';

function startPolygonSelection() {
    const container = document.createElement('div');
    const svg = SVG().addTo(container);
    vi.spyOn(svg, 'point').mockImplementation((x, y) => new Point(x, y));
    const onClose = vi.fn();
    const onCancel = vi.fn();
    // the start event is the first point
    const polygonSelection = new PolygonSelection(
        svg,
        onClose,
        onCancel,
        new MouseEvent('mousedown', { clientX: 100, clientY: 100 })
    );
    const overlay = container.lastElementChild!;
    const click = (clientX: number, clientY: number) =>
        overlay.dispatchEvent(new MouseEvent('click', { clientX, clientY }));
    const doubleClick = (clientX: number, clientY: number, ctrlKey = false) =>
        ['click', 'click', 'dblclick'].forEach((type) =>
            overlay.dispatchEvent(new MouseEvent(type, { clientX, clientY, ctrlKey }))
        );
    return { container, svg, onClose, onCancel, polygonSelection, overlay, click, doubleClick };
}

test('draw a polygon', () => {
    const { container, svg, onClose, onCancel, polygonSelection, overlay, click, doubleClick } =
        startPolygonSelection();

    click(300, 100);
    click(300, 300);
    const rightClick = new MouseEvent('contextmenu', { clientX: 200, clientY: 200, cancelable: true });
    overlay.dispatchEvent(rightClick);
    expect(rightClick.defaultPrevented).toBe(true);
    // the polygon follows the pointer
    overlay.dispatchEvent(new MouseEvent('pointermove', { clientX: 200, clientY: 200 }));
    expect(svg.findOne('polygon')?.attr('points')).toBe('100,100 300,100 300,300 200,200');

    // with Ctrl to invert the selection
    doubleClick(100, 300, true);
    expect(onClose).toHaveBeenCalledWith(true);
    expect(onCancel).not.toHaveBeenCalled();
    expect(svg.findOne('polygon')?.attr('points')).toBe('100,100 300,100 300,300 100,300');

    polygonSelection.stop();
    expect(container.children).toHaveLength(1);
    expect(svg.node.querySelectorAll('polygon, path')).toHaveLength(0);
});

test('cancel a polygon with less than 3 points', () => {
    // with a double click on the first point
    const doubleClicked = startPolygonSelection();
    doubleClicked.doubleClick(100, 100);
    expect(doubleClicked.onCancel).toHaveBeenCalledOnce();
    expect(doubleClicked.onClose).not.toHaveBeenCalled();

    // with Enter
    const closed = startPolygonSelection();
    closed.click(300, 100);
    closed.polygonSelection.close(false);
    expect(closed.onCancel).toHaveBeenCalledOnce();
    expect(closed.onClose).not.toHaveBeenCalled();
});
