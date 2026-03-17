/*
 * Copyright (c) 2026, RTE (https://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */
import 'vitest';

declare module 'vitest' {
    interface Assertion<R> {
        /**
         * Custom SVG matcher
         * Compares two SVGs with numeric tolerance and normalized structure
         */
        toEqualSvg(expected: string, options?: { epsilon?: number }): R;
    }
}
