/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import * as ComponentUtils from './component-utils';
import { LibraryComponent } from './library-component';

test('getComponent', () => {
    const componentLibary: LibraryComponent[] = [
        {
            type: 'LOCK',
            size: {
                width: 50,
                height: 50,
            },
            subComponents: [
                {
                    name: 'LOCK',
                    fileName: 'lock.svg',
                },
            ],
            styleClass: 'nad-lock',
        },
        {
            type: 'FLASH',
            size: {
                width: 50,
                height: 50,
            },
            subComponents: [
                {
                    name: 'FLASH',
                    fileName: 'flash.svg',
                },
            ],
            styleClass: 'nad-flash',
        },
    ];
    const component = ComponentUtils.getComponent(componentLibary, 'FLASH');
    expect(component).not.toBe(undefined);
    expect(component?.size.height).toBe(50);
    expect(component?.size.width).toBe(50);
    expect(component?.subComponents.length).toBe(1);
    expect(component?.subComponents[0].name).toBe('FLASH');
    expect(component?.subComponents[0].fileName).toBe('flash.svg');
    expect(component?.styleClass).toBe('nad-flash');
});

test('getComponentPath', () => {
    void ComponentUtils.getComponentPath('flash.svg').then((path) => {
        expect(path.getAttribute('d')).toBe(
            'M34.71 3.91H21l-7.4 22.28a.1.1 0 0 0 .09.13h8.49a.1.1 0 0 1 .1.13L15.71 46.09a.5.5 0 0 0 .88.45L36.41 19.33a.1.1 0 0 0-.08-.16H27.42a.11.11 0 0 1-.09-.15l7.47-15a.1.1 0 0 0-.09-.11Z'
        );
    });
});
