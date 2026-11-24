/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { Point, SVG } from '@svgdotjs/svg.js';
import { PolygonSelection } from './polygon-selection';

test('draw a polygon', () => {
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

    // cancelled by a right click with only one point
    overlay.dispatchEvent(new MouseEvent('contextmenu', { clientX: 300, clientY: 300 }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();

    overlay.dispatchEvent(new MouseEvent('click', { clientX: 300, clientY: 100 }));
    overlay.dispatchEvent(new MouseEvent('click', { clientX: 300, clientY: 300 }));
    // closed with a right click at the last point, with Ctrl to invert the selection
    const rightClick = new MouseEvent('contextmenu', { clientX: 100, clientY: 300, ctrlKey: true, cancelable: true });
    overlay.dispatchEvent(rightClick);
    expect(rightClick.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledWith(true);
    expect(svg.findOne('polygon')?.attr('points')).toBe('100,100 300,100 300,300 100,300');

    polygonSelection.stop();
    expect(container.children).toHaveLength(1);
    expect(svg.node.querySelectorAll('polygon, path')).toHaveLength(0);
});
