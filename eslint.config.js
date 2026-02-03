/*
 * Copyright © 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { braceExpand } from 'minimatch';
import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import tsEslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginReactRefresh from 'eslint-plugin-react-refresh';
import pluginJest from 'eslint-plugin-jest';
import pluginTestingLibrary from 'eslint-plugin-testing-library';
import { getSupportInfo, resolveConfig, resolveConfigFile } from 'prettier';

const JsFiles = [`**/*.{${braceExpand('{,c,m}js{,x}').join(',')}}`];
const TsFiles = [`**/*.{${braceExpand('{,m}ts{,x}').join(',')}}`];
const JsTsFiles = [...JsFiles, ...TsFiles];
const TestFiles = ['**/__tests__/**/*.{js,cjs,mjs,jsx,ts,mts,tsx}', '**/?(*.)+(spec|test).{js,cjs,mjs,jsx,ts,mts,tsx}'];

function setRuleLevel(rules, rule, level) {
    if (Array.isArray(rules[rule])) {
        rules[rule][0] = level;
    } else {
        rules[rule] = level;
    }
    return rules; // just a helper for functional chaining
}

/**
 * Files checked by Prettier
 */
async function getPrettierCheckedExt() {
    const configPath = await resolveConfigFile(import.meta.filename);
    const config = await resolveConfig(configPath, { useCache: false });
    const supportInfo = await getSupportInfo({ plugins: config.plugins });
    return supportInfo.languages
        .flatMap((lng) => lng.extensions ?? []) // extract extensions checked by plugins
        .concat('.env') // also checked by prettier in override section
        .map((dotExt) => dotExt.substring(1)); // remove dot from ext string
}

const prettierExts = await getPrettierCheckedExt();

export default defineConfig([
    globalIgnores([
        // .git & node_modules is implicitly always ignored
        'dist/**',
        'coverage/**',
        'docs/_build/**',
        '**/dist/**',
    ]),
    {
        // We set "default files" checked when another config object don't define "files" field
        name: 'ProjectCheckedFiles',
        files: [
            `**/*.{${[prettierExts, JsTsFiles]
                .flat()
                .filter((ext, index, self) => self.indexOf(ext) === index) // dedupe
                .join(',')}}`,
        ],
    },
    { name: 'eslint declare', files: JsTsFiles, plugins: { js }, extends: ['js/recommended'] },
    {
        files: TsFiles,
        extends: tsEslint.configs.recommendedTypeChecked,
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    { name: 'eslint-plugin-react declare', files: JsTsFiles, plugins: { react: pluginReact } },
    { files: JsTsFiles, ...pluginReactHooks.configs['recommended-latest'] },
    { files: JsTsFiles, ...pluginReactRefresh.configs.vite },
    {
        name: 'eslint-plugin-testing-library/react',
        files: TestFiles,
        ...pluginTestingLibrary.configs['flat/react'],
        rules: {}, // rules are set by cra-config
    },
    {
        name: 'eslint-plugin-jest/recommended',
        files: TestFiles,
        ...pluginJest.configs['flat/recommended'],
        rules: {}, // rules are set by cra-config
    },
    {
        name: 'General configuration',
        files: JsTsFiles,
        plugins: {
            '@typescript-eslint': tsEslint.plugin,
        },
        settings: {
            babel: true,
            // compat: true,
        },
        languageOptions: {
            globals: {
                ...globals.es2020, // https://vite.dev/guide/build.html#browser-compatibility & https://vite.dev/config/build-options.html#build-target
                ...globals.browser,
            },
            ecmaVersion: 2020,
            // Parsing error: 'import' and 'export' may appear only with 'sourceType: module'
            sourceType: 'module',
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'warn', // we still have "any" in code
            '@typescript-eslint/no-unsafe-call': 'warn', // we call function typed as "any"
            '@typescript-eslint/no-unsafe-return': 'warn', // we return "any" value
            '@typescript-eslint/no-unsafe-argument': 'warn', // we still pass "any" to typed args
            '@typescript-eslint/no-unsafe-assignment': 'warn', // we still pass "any" to typed vars
            '@typescript-eslint/no-unsafe-member-access': 'warn', // access properties of object typed as "any"
        },
    },
    {
        name: 'General configuration for tests',
        files: ['**/setupTests.ts', '**/svgTransform.ts', '**/*.{test,spec}.{js,jsx,ts,tsx}'],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.jest, // globals.vitest
            },
        },
    },
    {
        name: 'React: jsx-runtime',
        files: JsTsFiles,
        // concretely disable react/react-in-jsx-scope & react/jsx-uses-react
        ...pluginReact.configs.flat['jsx-runtime'], // using React 17+
    },
    {
        name: 'ProjectToolsConfigs',
        files: ['**/*.config.{js,ts}'],
        languageOptions: { globals: globals.node, ecmaVersion: 'latest', sourceType: 'module' },
        rules: {
            // Disable type-checked rules for config files
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
        },
    },
    // keep last in case we have reactivated a rule that conflict with Prettier (turn off the rules of some core & eslint plugins rules)
    {
        ...eslintPluginPrettierRecommended, // include eslint-config-prettier
        // format isn't mandatory during dev session, so we pass it to warn level instead of error
        rules: setRuleLevel({ ...eslintPluginPrettierRecommended.rules }, 'prettier/prettier', 'warn'),
    },
]);
