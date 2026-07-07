/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import '../../../../global.d.ts';

import IEEE14CdfNetworkMetadata from '../resources/test-data/nad-ieee14cdf-solved_metadata.json';
import FourSubstationsNetworkCustomStyleMetadata from '../resources/test-data/nad-four-substations_custom_metadata.json';
import EurostagNetworkMetadata from '../resources/test-data/nad-eurostag-tutorial-example1_metadata.json';
import IEEE9NetworkMetadata from '../resources/test-data/nad-ieee9-zeroimpedance-cdf_metadata.json';
import FourSubstationsNetworkMetadata from '../resources/test-data/nad-four-substations_metadata.json';
import IEEE9NetworkMiddleArrowsMetadata from '../resources/test-data/nad-ieee9-zeroimpedance-cdf-middle-arrow_metadata.json';
import FourSubstationsNetworkMultipleLabelsMetadata from '../resources/test-data/nad-four-substations-multiple-labels_metadata.json';
import DoubleArrowsNetworkMetadata from '../resources/test-data/nad-double-arrows-with-middle-values_metadata.json';

import { SvgWriter } from './svg-writer';
import { getSvgFromFile } from './test-utils';

test('testIEEE14CdfNetwork', () => {
    const actual = new SvgWriter(IEEE14CdfNetworkMetadata).getSvg({ width: 0, height: 0 });
    const expected = getSvgFromFile('../resources/test-data/nad-ieee14cdf-solved.svg');
    expect(actual).toEqualSvg(expected, { epsilon: 0.1 });
});

test('testFourSubstationsNetworkCustomStyle', () => {
    const actual = new SvgWriter(FourSubstationsNetworkCustomStyleMetadata).getSvg({ width: 0, height: 0 });
    const expected = getSvgFromFile('../resources/test-data/nad-four-substations_custom.svg');
    expect(actual).toEqualSvg(expected, { epsilon: 0.1 });
});

test('testEurostagNetwork', () => {
    const actual = new SvgWriter(EurostagNetworkMetadata).getSvg({ width: 0, height: 0 });
    const expected = getSvgFromFile('../resources/test-data/nad-eurostag-tutorial-example1.svg');
    expect(actual).toEqualSvg(expected, { epsilon: 0.1 });
});

test('testIEEE9Network', () => {
    const actual = new SvgWriter(IEEE9NetworkMetadata).getSvg({ width: 0, height: 0 });
    const expected = getSvgFromFile('../resources/test-data/nad-ieee9-zeroimpedance-cdf.svg');
    expect(actual).toEqualSvg(expected, { epsilon: 0.1 });
});

test('testFourSubstationsNetwork', () => {
    const actual = new SvgWriter(FourSubstationsNetworkMetadata).getSvg({ width: 0, height: 0 });
    const expected = getSvgFromFile('../resources/test-data/nad-four-substations.svg');
    expect(actual).toEqualSvg(expected, { epsilon: 0.1 });
});

test('testIEEE9NetworkMiddleArrows', () => {
    const actual = new SvgWriter(IEEE9NetworkMiddleArrowsMetadata).getSvg({ width: 0, height: 0 });
    const expected = getSvgFromFile('../resources/test-data/nad-ieee9-zeroimpedance-cdf-middle-arrow.svg');
    expect(actual).toEqualSvg(expected, { epsilon: 0.1 });
});

test('testFourSubstationsNetworkMultipleLabelsNetwork', () => {
    const actual = new SvgWriter(FourSubstationsNetworkMultipleLabelsMetadata).getSvg({ width: 0, height: 0 });
    const expected = getSvgFromFile('../resources/test-data/nad-four-substations-multiple-labels.svg');
    expect(actual).toEqualSvg(expected, { epsilon: 0.1 });
});

test('testDoubleArrowsNetwork', () => {
    const actual = new SvgWriter(DoubleArrowsNetworkMetadata).getSvg({ width: 0, height: 0 });
    const expected = getSvgFromFile('../resources/test-data/nad-double-arrows-with-middle-values.svg');
    expect(actual).toEqualSvg(expected, { epsilon: 0.1 });
});
