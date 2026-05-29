const path = require('path')
const TerserPlugin = require('terser-webpack-plugin')
require('dotenv').config()

const ASSET_PATH = process.env.ASSET_PATH || '/tab-module/'

module.exports = {
    mode: 'production',
    entry: {
        'tab-module': { import: path.join(__dirname, 'src', 'index.ts') },
    },
    module: {
        rules: [
        {
            test: /\.tsx?$/,
            use: {
                loader: 'ts-loader',
                options: {
                    // Suppress declaration-file emit during the webpack pass.
                    // Full type-checking and .d.ts generation are handled by build:tsc.
                    transpileOnly: true,
                },
            },
            exclude: '/node_modules/',
        },
        ],
    },
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin(),
        ],
        splitChunks: false,
    },
    output: {
        path: path.resolve(__dirname, 'umd'),
        publicPath: ASSET_PATH,
        library: 'EpicTabMod',
        libraryTarget: 'umd',
    },
    resolve: {
        extensions: ['.ts', '.js', '.json'],
        alias: {
            '#root': path.resolve(__dirname, './'),
            '#config': path.resolve(__dirname, 'src', 'config'),
            '#loader': path.resolve(__dirname, 'src', 'loader'),
            '#runtime': path.resolve(__dirname, 'src', 'runtime'),
            '#service': path.resolve(__dirname, 'src', 'service'),
            '#types': path.resolve(__dirname, 'src', 'types'),
        },
        symlinks: true
    },
}