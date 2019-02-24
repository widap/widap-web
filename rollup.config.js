import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import replace from 'rollup-plugin-replace';
import json from 'rollup-plugin-json';
import { terser } from "rollup-plugin-terser";

const CFG = {
  output: {
    format: 'iife',
    strict: false,
  },
  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    json({
      include: 'js/*.json',
    }),
    commonjs({
      include: 'node_modules/**',
        namedExports: {
          './node_modules/react/index.js': [
            'cloneElement',
            'createElement',
            'PropTypes',
            'Children',
            'Component',
            'PureComponent',
          ],
          './node_modules/react-dom/index.js': [
            'createPortal',
            'findDOMNode',
          ],
       }
    }),
    babel({include: 'js/**'}),
    resolve(),
  ],
  watch: {
    include: 'js/**',
  },
};

export default cmdLineArgs => {
  var config = Object.assign({}, CFG);
  if (cmdLineArgs.configProduction === true) {
    config.plugins.push(terser());
  }
  return config
}
