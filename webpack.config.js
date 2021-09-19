const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

/**
 * @param env: An object containing all parameters passed to webpack.
 */
module.exports = function(env) {
    // Take into account that CLI arguments are coerced to numbers.
    env.release = String(env.release).padStart(7, '0');
    const Config = require(`./config/${env.target}`)(env.release);

    const mode = env.target === 'local' || env.target === 'devstix' ?
        'development' :
        'production';

    const devtool = Config.DEBUG ? 'source-map' : false;

    const output = {
        path: path.resolve(__dirname, 'compiled'),
        filename: '[name].js',
    };

    const externals = {
        /* Allow importing a Config module */
        Config: JSON.stringify(Config)
    };

    const devServer = {
        contentBase: path.join(__dirname, 'compiled'),
        port: 5000,
        disableHostCheck: true,

        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
            "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
        },

        /* Serve loader.html as the index */
        historyApiFallback: {
            index: '/loader.html'
        }
    };

    return [
        {
            mode: mode,
            devtool: devtool,
            entry: {
                'bundle': [
                    './node_modules/babel-polyfill/dist/polyfill.js',
                    './src/main.tsx',
                ],
            },
            output: output,
            optimization: {
                splitChunks: {
                    cacheGroups: {
                        vendor: {
                            test: /[\\/]node_modules[\\/]/,
                            name: 'vendors',
                            chunks: 'all',
                        },
                    },
                },
            },
            externals: externals,
            plugins: [
                /* Generate the loader at compile time */
                new HtmlWebpackPlugin({
                    filename: 'loader.html',
                    template: 'loader.handlebars',
                    /* Pass the Config into the template context */
                    Config: Config,
                    /* bundle.js is imported directly in the template */
                    inject: false,
                }),
                /* Make sure $ and jQuery are global objects for legacy libraries.
                * (I'm looking at you, touch-punch!) */
                new webpack.ProvidePlugin({
                    $: 'jquery',
                    jQuery: 'jquery',
                    rbush: 'rbush',
                }),
            ],
            resolve: {
                extensions: ['.ts', '.tsx', '.js', '.handlebars'],
                modules: [
                    path.resolve(__dirname, 'src'),
                    'node_modules'
                ],
                alias: {
                    /* Allow importing handlebars templates with `templates/*` */
                    templates: path.resolve(__dirname, 'templates')
                }
            },
            module: {
                rules: [
                    {
                        test: /\.(ts|tsx|js)$/,
                        exclude: /node_modules/,
                        loader: 'ts-loader',
                    },
                    {
                        test: /\.handlebars$/,
                        loader: 'handlebars-loader'
                    },
                ]
            },
            /* Develompent Server Configuration */
            devServer: devServer,
        },
        {
            mode: mode,
            devtool: devtool,
            entry: {
                'path-finder.worker': './src/webworkers/path-finder.worker.ts',
            },
            output: output,
            externals: externals,
            plugins: [
                new webpack.ProvidePlugin({
                    rbush: 'rbush',
                }),
            ],
            resolve: {
                extensions: ['.ts', '.tsx', '.js'],
                modules: [
                    path.resolve(__dirname, 'src'),
                    'node_modules'
                ],
            },
            module: {
                rules: [
                    {
                        test: /\.(ts|tsx|js)$/,
                        exclude: /node_modules/,
                        loader: 'ts-loader',
                    },
                ]
            },
            /* Develompent Server Configuration */
            devServer: devServer
        }
    ];
};
