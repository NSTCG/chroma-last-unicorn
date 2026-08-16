import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  return {
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
      target: 'esnext',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: !isDev,
          drop_debugger: !isDev,
          passes: 3,
          unsafe: true,
          unsafe_arrows: true,
          unsafe_comps: true,
          unsafe_math: true,
          unsafe_methods: true,
          pure_getters: true
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
