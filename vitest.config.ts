/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { configDefaults, coverageConfigDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    test: {
        projects: [
            {
                extends: true,
                test: {
                    name: 'unit-tests',
                    include: ['**/*.test.{ts,tsx}'],
                    exclude: [...configDefaults.exclude, '**/*.browser.test.{ts,tsx}'],
                    globals: true,
                    environment: 'jsdom',
                    setupFiles: ['./setupTests.ts'],
                },
            },
            {
                extends: true,
                test: {
                    name: 'browser-tests',
                    include: ['**/*.browser.test.{ts,tsx}'],
                    exclude: [...configDefaults.exclude, '**/*performance.browser.test.{ts,tsx}'],
                    globals: true,
                    testTimeout: 30000,
                    browser: {
                        enabled: true,
                        provider: playwright(),
                        headless: true,
                        // at least one instance is required
                        instances: [{ browser: 'chromium', viewport: { width: 1000, height: 1000 } }],
                    },
                },
            },
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            reportsDirectory: './coverage',
            include: ['src/**/*.{ts,tsx}', 'packages/*/src/**/*.{ts,tsx}'],
            exclude: [
                ...coverageConfigDefaults.exclude,
                '**/*.svg',
                '**/*.test.{ts,tsx}',
                '**/*.browser.test.{ts,tsx}',
                '**/*.test.utils.ts',
                '**/__screenshots__/**',
            ],
        },
    },
});
