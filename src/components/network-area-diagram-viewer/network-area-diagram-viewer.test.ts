/**
 * Copyright (c) 2024, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { NetworkAreaDiagramViewer } from './network-area-diagram-viewer';
import { NadViewerParametersOptions } from './nad-viewer-parameters';

describe('Test network-area-diagram-viewer', () => {
    // SVG aren't loaded properly in DOM with Jest. Has to be enriched...
    test('nad creation', () => {
        const container: HTMLDivElement = document.createElement('div');

        const nadViewerParametersOptions: NadViewerParametersOptions = {
            minWidth: 0,
            minHeight: 0,
            maxWidth: 0,
            maxHeight: 0,
            enableDragInteraction: false,
            enableLevelOfDetail: false,
            addButtons: false,
            onMoveNodeCallback: null,
            onMoveTextNodeCallback: null,
            onSelectNodeCallback: null,
            onToggleHoverCallback: null,
            onRightClickCallback: null,
        };
        const nad: NetworkAreaDiagramViewer = new NetworkAreaDiagramViewer(
            container,
            '',
            null,
            nadViewerParametersOptions
        );

        nad.moveNodeToCoordinates('', 0, 0);
        expect(container.getElementsByTagName('svg').length).toBe(0);
        expect(nad.getContainer().outerHTML).toBe('<div></div>');
        expect(nad.getSvgContent()).toBe('');
    });
});
