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
