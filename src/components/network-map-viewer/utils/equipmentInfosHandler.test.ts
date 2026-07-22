/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { describe, test, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNameOrId } from './equipmentInfosHandler';

describe('useNameOrId', () => {
    test('should return null when infos is null/undefined', () => {
        const { result } = renderHook(() => useNameOrId(true));
        expect(result.current.getNameOrId(null)).toBeNull();
        expect(result.current.getNameOrId(undefined)).toBeNull();
    });

    test('should return the name when useName is true and name is valid', () => {
        const { result } = renderHook(() => useNameOrId(true));
        expect(result.current.getNameOrId({ id: 's0', name: 'substation1' })).toEqual('substation1');
    });

    test('should return the id when useName is false', () => {
        const { result } = renderHook(() => useNameOrId(false));
        expect(result.current.getNameOrId({ id: 's0', name: 'substation1' })).toEqual('s0');
    });

    test('should return the id when useName is true and name is not valid', () => {
        const { result } = renderHook(() => useNameOrId(true));
        expect(result.current.getNameOrId({ id: 's0', name: '    ' })).toEqual('s0');
        expect(result.current.getNameOrId({ id: 's0', name: null })).toEqual('s0');
    });
});
