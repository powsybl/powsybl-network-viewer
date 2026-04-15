/**
 * Copyright (c) 2024, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/// <reference types="vite-plugin-svgr/client" />
/// <reference types="vite/client" />

declare module '*.frag' {
    const content: string;
    export default content;
}

declare module '*.vert' {
    const content: string;
    export default content;
}
