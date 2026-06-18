/*
 * Copyright (c) 2026, RTE (https://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import SldSvgExample from './diagram-viewers/data/sld/sld-example.svg';
import SldSvgExampleMeta from './diagram-viewers/data/sld/sld-example_metadata.json';
import SldSvgSubExample from './diagram-viewers/data/sld/sld-sub-example.svg';
import SldSvgSubExampleMeta from './diagram-viewers/data/sld/sld-sub-example_metadata.json';

import { SingleLineDiagramViewer } from '../../src';
import {
    handleBus,
    handleFeeder,
    handleNextVL,
    handleSwitch,
    handleToggleSldHover,
} from './diagram-viewers/sld-callbacks';

/* eslint-disable @typescript-eslint/no-floating-promises */

const addSldToDemo = () => {
    fetch(SldSvgExample)
        .then((response) => response.text())
        .then((svgContent) => {
            new SingleLineDiagramViewer(
                document.getElementById('svg-container-sld')!,
                svgContent, //svg content
                null, //svg metadata
                'voltage-level',
                500,
                600,
                1000,
                1200,
                null, //callback on the next voltage arrows
                null, //callback on the breakers
                null, //callback on the feeders
                null, //callback on the buses
                // @ts-expect-error: TODO look if null is really possible in code
                null, //arrows color
                null //hovers on equipments callback
            );
        });

    fetch(SldSvgExample)
        .then((response) => response.text())
        .then((svgContent) => {
            new SingleLineDiagramViewer(
                document.getElementById('svg-container-sld-with-callbacks')!,
                svgContent, //svg content
                // @ts-expect-error: incomplete data in example json
                SldSvgExampleMeta, //svg metadata
                'voltage-level',
                500,
                600,
                1000,
                1200,
                handleNextVL, //callback on the next voltage arrows
                handleSwitch, //callback on the breakers
                handleFeeder, //callback on the feeders
                handleBus, //callback on the buses
                'lightblue', //arrows color
                handleToggleSldHover //hovers on equipments callback
            );
        });

    fetch(SldSvgSubExample)
        .then((response) => response.text())
        .then((svgContent) => {
            new SingleLineDiagramViewer(
                document.getElementById('svg-container-sldsub-with-callbacks')!,
                svgContent, //svg content
                // @ts-expect-error: incomplete data in example json
                SldSvgSubExampleMeta, //svg metadata
                'substation',
                500,
                600,
                1200,
                1200,
                handleNextVL, //callback on the next voltage arrows
                handleSwitch, //callback on the breakers
                handleFeeder, //callback on the feeders
                handleBus, //callback on the buses
                'lightblue', //arrows color
                handleToggleSldHover //hovers on equipments callback
            );
        });
};

addSldToDemo();
