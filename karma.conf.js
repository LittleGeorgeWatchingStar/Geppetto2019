const webpackConfig = require('./webpack.config')({target: 'local'});
const webpack = require('webpack');

module.exports = function (config) {
    config.set({
        basePath: '',
        frameworks: ['jasmine'],
        files: [
            'node_modules/babel-polyfill/dist/polyfill.js',
            'node_modules/jasmine-ajax/lib/mock-ajax.js',
            'tests/test_entry.js',
        ],
        preprocessors: {
            'tests/test_entry.js': ['webpack', 'sourcemap'],
            'tests/**/*.ts': ['webpack', 'sourcemap'],
        },
        webpack: {
            mode: 'development',
            module: webpackConfig[0].module,
            resolve: webpackConfig[0].resolve,
            externals: webpackConfig[0].externals,
            target: 'node',
            devtool: 'inline-source-map',
            plugins: [
                /* Make sure $ and jQuery are global objects for legacy libraries.
                 * (I'm looking at you, touch-punch!) */
                new webpack.ProvidePlugin({
                    $: 'jquery',
                    jQuery: 'jquery'
                }),
                /**
                 * A dependency of React.
                 */
                new webpack.DefinePlugin({
                    'process.env': {
                        'NODE_ENV': '"development"'
                    }
                })
            ],
        },
        port: 9876,
        browsers: ['ChromeHeadlessNoSandbox'],
        customLaunchers: {
            ChromeHeadlessNoSandbox: {
                base: 'ChromeHeadless',
                flags: [
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-web-security',
                    '--disable-gpu',
                    '--remote-debugging-port=9222'
                ]
            }
        },
        reporters: ['spec'],
        specReporter: {
            showSpecTiming: true,
            suppressSkipped: true
        },
        colors: true,
        logLevel: config.LOG_INFO,
        singleRun: true,
        concurrency: Infinity,
        mime: {
            'text/x-typescript': ['ts']
        },
    });
};
