import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import path from 'path';
import babel from 'rollup-plugin-babel';
import nodePolyfills from 'rollup-plugin-node-polyfills';
import typescript from '@rollup/plugin-typescript';
import { defineConfig } from 'vite';

const isProd = process.env.NODE_ENV === 'production';
const extensions = ['.js', '.ts', '.tsx'];
const pkg = require('./package.json')

process.env.VITE_IS_LIB_MODE = false

export default defineConfig(() => {
  return {
    build: {
      lib: {
        entry: path.resolve(__dirname, 'src/index.ts'),
        name: 'three-physx'
      },
      rollupOptions: {
        input: './src/index.ts',
        output: { dir: 'dist', format: 'es6', sourcemap: true, inlineDynamicImports: true, },
        plugins: [
          nodePolyfills(),
          json(),
          typescript({
            tsconfig: 'tsconfig.json',
          }),
          replace({
            'process.env.NODE_ENV': JSON.stringify(isProd ? 'production' : 'development'),
            preventAssignment: false
          }),
          resolve({
            extensions,
          }),
          commonjs({
            include: /node_modules/,
          }),
          babel({
            extensions,
            exclude: /node_modules/,
            babelrc: false,
            runtimeHelpers: true,
            presets: [
              '@babel/preset-env',
              '@babel/preset-react',
              '@babel/preset-typescript',
            ],
            plugins: [
              '@babel/plugin-syntax-dynamic-import',
              ['@babel/plugin-proposal-object-rest-spread', {
                useBuiltIns: true,
              }],
              ['@babel/plugin-transform-runtime', {
                corejs: 3,
                helpers: true,
                regenerator: true,
                useESModules: false,
              }],
            ],
          })
        ],
      }
    }
  }
});
