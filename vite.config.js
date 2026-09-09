import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  return {
    resolve: {
      alias: {
        '@devStudio': isDev
          ? path.resolve(__dirname, 'src/dev/devStudio.js')
          : path.resolve(__dirname, 'src/dev/devStudioEmpty.js')
      }
    },
    plugins: [
      viteSingleFile({
        removeOptionalTags: true,
        deleteInlinedFiles: true
      })
    ],
    define: {
      __DEV__: JSON.stringify(isDev)
    },
    build: {
      modulePreload: false,
      emptyOutDir: true,
      target: 'esnext',
      minify: 'terser',
      terserOptions: {
        ecma: 2020,
        module: true,
        toplevel: true,
        compress: {
          drop_console: !isDev,
          drop_debugger: !isDev,
          passes: 5,
          pure_getters: true,
          unsafe: true,
          unsafe_arrows: true,
          unsafe_comps: true,
          unsafe_math: true,
          unsafe_methods: true,
          hoist_funs: true,
          hoist_vars: true,
          reduce_vars: true,
          booleans_as_integers: false
        },
        mangle: {
          toplevel: true,
          properties: false // keep Three.js API calls safe
        },
        format: {
          comments: false
        }
      },
      rollupOptions: {
        output: {
          manualChunks: undefined,
          inlineDynamicImports: true
        }
      }
    },
    server: {
      port: 5173,
      open: false,
      host: true
    }
  };
});
