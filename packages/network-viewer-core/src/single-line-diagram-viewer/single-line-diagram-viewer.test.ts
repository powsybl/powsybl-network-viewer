/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { describe, test, expect, vi, it } from 'vitest';
import { SingleLineDiagramViewer } from './single-line-diagram-viewer';

describe('Test SingleLineDiagramViewer', () => {
    const container = document.createElement('div');

    describe('test hover callback', () => {
        const onToggleHover = vi.fn();
        let svgContent: string;
        let svgMetadata: any;

        beforeEach(() => {
            onToggleHover.mockClear();
        });

        test('test trigger hover callback on label', () => {
            svgContent = `<g id="equipmentId1"><rect class="sld-switch"/><text class="sld-label" id="tieLineId"">TieLine</text></g>`;
            svgMetadata = {
                nodes: [{ id: 'equipmentId1', equipmentId: 'tieLineId', componentType: 'BOUNDARY_LINE' }],
            };
            const viewer: SingleLineDiagramViewer = Object.assign(SingleLineDiagramViewer.prototype, {
                container: Object.assign(container, { innerHTML: svgContent }),
                svgMetadata: svgMetadata,
                onToggleHoverCallback: onToggleHover,
            });
            viewer['addEquipmentsPopover']();
            container.querySelector('text.sld-label')?.dispatchEvent(new MouseEvent('mouseover'));
            expect(onToggleHover).toHaveBeenNthCalledWith(1, true, expect.anything(), 'tieLineId', 'BOUNDARY_LINE');
        });

        it.each([
            [0, 'BREAKER'],
            [1, 'DISCONNECTOR'],
        ])('test trigger hover callback on switches %s %s', (index, componentType) => {
            svgContent = `<g id="equipmentId${index}"><rect class="sld-switch"/></g>`;
            svgMetadata = {
                nodes: [{ id: `equipmentId${index}`, equipmentId: 'breaker1', componentType: componentType }],
            };
            const viewer: SingleLineDiagramViewer = Object.assign(SingleLineDiagramViewer.prototype, {
                container: Object.assign(container, { innerHTML: svgContent }),
                svgMetadata: svgMetadata,
                onToggleHoverCallback: onToggleHover,
            });
            viewer['addEquipmentsPopover']();
            container.querySelector('#equipmentId' + index)?.dispatchEvent(new MouseEvent('mouseover'));
            expect(onToggleHover).toHaveBeenNthCalledWith(1, true, expect.anything(), 'breaker1', componentType);
        });
    });
});
