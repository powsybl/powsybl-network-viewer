/*
 * Copyright (c) 2026, RTE (https://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import checker from 'vite-plugin-checker';

const eslintCmd = 'eslint';

export const eslintCmdWithOptions = () => {
    return process.env.VITEST
        ? `${eslintCmd} "./src/**/*.{spec,test}.{js,jsx,ts,tsx}"`
        : `${eslintCmd} --ignore-pattern "**/*.{test,spec}.*" "**/src/**/*.{js,jsx,ts,tsx}"`;
};

export const viteEslintChecker = (isPreview: boolean | undefined, command: 'build' | 'serve') => {
    return (
        !isPreview &&
        checker({
            overlay: {
                initialIsOpen: true,
                position: 'bl',
            },
            typescript: true,
            eslint: {
                lintCommand: command === 'build' ? `${eslintCmd} .` : eslintCmdWithOptions(),
                useFlatConfig: true,
                dev: {
                    logLevel: ['error', 'warning'],
                },
            },
        })
    );
};
