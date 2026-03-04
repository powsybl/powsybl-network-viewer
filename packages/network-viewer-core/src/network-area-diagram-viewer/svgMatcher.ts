/*
 * Copyright (c) 2026, RTE (https://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import type { MatcherContext } from 'expect';
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true,
    parseTagValue: true,
    parseAttributeValue: true,
    ignoreDeclaration: true,
});

/* ------------------------------------------------ */
/* Normalization */
/* ------------------------------------------------ */
function normalize(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(normalize);
    }

    if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj)
            .sort((a, b) => a.localeCompare(b))
            .reduce((acc: any, key) => {
                acc[key] = normalize(obj[key]);
                return acc;
            }, {});
    }

    return obj;
}

/* ------------------------------------------------ */
/* SVG numeric helpers */
/* ------------------------------------------------ */
function parseNumberList(str: string): number[] {
    return str
        .trim()
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number);
}

/**
 * Replace SVG numeric string attributes (points, d)
 * with arrays of numbers for tolerant comparison.
 */
function replaceNumericStrings(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(replaceNumericStrings);
    }

    if (obj && typeof obj === 'object') {
        const result: any = {};

        for (const key of Object.keys(obj)) {
            const value = obj[key];

            if (typeof value === 'string' && key.endsWith('@_points')) {
                result[key] = parseNumberList(value);
            } else {
                result[key] = replaceNumericStrings(value);
            }
        }

        return result;
    }

    return obj;
}

/* ------------------------------------------------ */
/* Tolerant rounding for pretty diffs */
/* ------------------------------------------------ */
function roundNumbers(obj: any, epsilon: number): any {
    if (Array.isArray(obj)) {
        return obj.map((v) => roundNumbers(v, epsilon));
    }

    if (typeof obj === 'number') {
        const decimals = Math.max(0, Math.ceil(-Math.log10(epsilon)));
        return Number(obj.toFixed(decimals));
    }

    if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const key of Object.keys(obj)) {
            result[key] = roundNumbers(obj[key], epsilon);
        }
        return result;
    }

    return obj;
}

/* ------------------------------------------------ */
/* Deep tolerant comparison */
/* ------------------------------------------------ */
function compareWithTolerance(a: any, b: any, epsilon: number): boolean {
    if (typeof a === 'number' && typeof b === 'number') {
        return Math.abs(a - b) <= epsilon;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
            return false;
        }
        return a.every((v, i) => compareWithTolerance(v, b[i], epsilon));
    }

    if (a && b && typeof a === 'object' && typeof b === 'object') {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);

        if (keysA.length !== keysB.length) {
            return false;
        }

        // Ensure keys match before comparing values
        keysA.sort((a, b) => a.localeCompare(b));
        keysB.sort((a, b) => a.localeCompare(b));
        if (!keysA.every((k, i) => k === keysB[i])) {
            return false;
        }

        return keysA.every((key) => compareWithTolerance(a[key], b[key], epsilon));
    }

    return a === b;
}

/* ------------------------------------------------ */
/* Jest matcher */
/* ------------------------------------------------ */
export function toEqualSvg(this: MatcherContext, actual: string, expected: string, options?: { epsilon?: number }) {
    const epsilon = options?.epsilon ?? 1e-4;

    // Use a helper to process the SVG consistently
    const process = (xml: string) => replaceNumericStrings(normalize(parser.parse(xml)));

    const parsedActual = process(actual);
    const parsedExpected = process(expected);

    const pass = compareWithTolerance(parsedActual, parsedExpected, epsilon);

    if (pass) {
        return {
            pass: true,
            message: () => `Expected SVGs not to be equal (epsilon=${epsilon})`,
        };
    }

    // Round numbers for readable diff
    const displayPrecision = epsilon;
    const roundedActual = roundNumbers(parsedActual, displayPrecision);
    const roundedExpected = roundNumbers(parsedExpected, displayPrecision);

    const diffString =
        this.utils.diff(roundedExpected, roundedActual, {
            expand: false,
        }) ?? 'No visual diff available';

    return {
        pass: false,
        message: () => `SVGs differ (epsilon=${epsilon})\n\n${diffString}`,
    };
}
