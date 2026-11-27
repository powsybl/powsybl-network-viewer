/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { createSldComponentElement, DefaultSldLibraryComponents } from './sld-component-library';

describe('createSldComponentElement', () => {
    test('exposes the default Convergence library', () => {
        expect(DefaultSldLibraryComponents.find((component) => component.type === 'BREAKER')?.size).toEqual({
            width: 20,
            height: 20,
        });
    });

    test('creates a group with the style class and every element of the file', () => {
        const generator = createSldComponentElement('GENERATOR');
        expect(generator.getAttribute('class')).toBe('sld-generator');
        expect(Array.from(generator.children).map((element) => element.localName)).toEqual(['circle', 'path', 'path']);
        expect(generator.children[0].getAttribute('transform')).toBeNull();
    });

    test('returns a new group on every call', () => {
        const first = createSldComponentElement('GENERATOR');
        const second = createSldComponentElement('GENERATOR');
        expect(second).not.toBe(first);
        expect(second.children[0]).not.toBe(first.children[0]);
    });

    test('sets sub-component style classes and the open/closed state of a switch', () => {
        const breaker = createSldComponentElement('BREAKER', { open: true });
        expect(breaker.classList.contains('sld-breaker')).toBe(true);
        expect(breaker.classList.contains('sld-open')).toBe(true);
        expect(Array.from(breaker.children).map((element) => element.getAttribute('class'))).toEqual([
            'sld-sw-closed',
            'sld-sw-open',
        ]);
    });

    test('applies the library transformation for the orientation and drops element ids', () => {
        const transformer = createSldComponentElement('THREE_WINDINGS_TRANSFORMER', { orientation: 'DOWN' });
        const winding = transformer.querySelector('circle')!;
        expect(winding.getAttribute('transform')).toBe('scale(1,-1) translate(0,-24)');
        expect(winding.hasAttribute('id')).toBe(false);

        const load = createSldComponentElement('LOAD', { orientation: 'RIGHT' });
        expect(load.children[0].getAttribute('transform')).toBe('rotate(90,8,4.5)');
        expect(createSldComponentElement('LOAD', { orientation: 'LEFT' }).children[0].getAttribute('transform')).toBe(
            'rotate(270,8,4.5)'
        );
        expect(
            createSldComponentElement('LOAD', { orientation: 'UP' }).children[0].getAttribute('transform')
        ).toBeNull();
    });

    test('returns an empty group for a component without sub-components', () => {
        const busbar = createSldComponentElement('BUSBAR_SECTION', { orientation: 'RIGHT' });
        expect(busbar.getAttribute('class')).toBe('sld-busbar-section');
        expect(busbar.children.length).toBe(0);
    });

    test('falls back to the unknown component for a type missing from the library', () => {
        const unknown = createSldComponentElement('NOT_A_COMPONENT');
        expect(unknown.getAttribute('class')).toBe('sld-unknown');
        expect(unknown.children.length).toBe(1);
    });
});
