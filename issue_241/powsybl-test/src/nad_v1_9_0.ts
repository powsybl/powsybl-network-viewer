/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import {
    handleNodeMove,
    handleNodeSelect,
    handleRightClick,
    handleTextNodeMove,
    handleToggleNadHover,
} from './util.ts';
import { NetworkAreaDiagramViewer } from '@powsybl/network-viewer';

export function setupNadV1_9_0(
    container: HTMLElement | null,
    svgContent: string,
    metadata: any,
    enableLevelOfDetail: boolean,
    zoomLevels: number[]
) {
    new NetworkAreaDiagramViewer(
        container,
        <string>svgContent,
        metadata,
        500,
        600,
        1000,
        1200,
        handleNodeMove,
        handleTextNodeMove,
        handleNodeSelect,
        true,
        enableLevelOfDetail, //
        zoomLevels, //
        handleToggleNadHover,
        handleRightClick,
        true
    );
}
