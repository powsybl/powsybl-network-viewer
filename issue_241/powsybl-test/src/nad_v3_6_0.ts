/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { NetworkAreaDiagramViewer } from '@powsybl/network-viewer-core';
import {
    handleNodeMove,
    handleNodeSelect,
    handleRightClick,
    handleTextNodeMove,
    handleToggleNadHover,
} from './util.ts';

export function setupNadV3_6_0(
    container: HTMLElement | null,
    svgContent: string,
    metadata: any,
    enableLevelOfDetail: boolean,
    zoomLevels: number[]
) {
    new NetworkAreaDiagramViewer(container, svgContent, metadata, {
        enableDragInteraction: true,
        addButtons: true,
        onMoveNodeCallback: handleNodeMove,
        onMoveTextNodeCallback: handleTextNodeMove,
        onSelectNodeCallback: handleNodeSelect,
        onToggleHoverCallback: handleToggleNadHover,
        onRightClickCallback: handleRightClick,
        enableLevelOfDetail: enableLevelOfDetail,
        zoomLevels: zoomLevels,
    });
}
