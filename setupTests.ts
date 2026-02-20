/**
 * Copyright (c) 2024, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { toEqualSvg } from './packages/network-viewer-core/src/network-area-diagram-viewer/svgMatcher';

expect.extend({ toEqualSvg });

//FIXME workaround svg.panzoom.js import crash even though it's not used
/* eslint-disable */
(global as any).SVG = () => {};
(global as any).SVG.extend = () => {};
/* eslint-enable */
