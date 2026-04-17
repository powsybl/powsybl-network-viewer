/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import '../../../../global.d.ts';
import IEE14CdfNetworkMetadata from '../resources/test-data/nad-ieee14cdf-solved_metadata.json';

import { SvgWriter } from './svg-writer';
import { getSvgFromFile } from './test-utils';

test('testIEE14CdfNetwork', () => {
    const actual = new SvgWriter(IEE14CdfNetworkMetadata).getSvg();
    const expected = getSvgFromFile('../resources/test-data/nad-ieee14cdf-solved.svg');
    expect(actual).toEqualSvg(expected, { epsilon: 0.1 });
});
