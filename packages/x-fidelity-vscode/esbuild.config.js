const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minifyWhitespace: production,
    minifyIdentifiers: false, // Prevent SG.* patterns that trigger false security warnings
    minifySyntax: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/extension.js',
    external: [
      'vscode',
      // Keep the native tree-sitter packages external since we're using WASM
      'tree-sitter',
      'tree-sitter-javascript',
      'tree-sitter-typescript'
    ],
    logLevel: 'silent',
    plugins: [
      esbuildProblemMatcherPlugin,
      copyWasmFilesPlugin,
    ],
    // Bundle all X-Fidelity packages
    alias: {
      '@x-fidelity/core': path.resolve(__dirname, '../x-fidelity-core/src/index.ts'),
      '@x-fidelity/types': path.resolve(__dirname, '../x-fidelity-types/src/index.ts'),
      '@x-fidelity/plugins': path.resolve(__dirname, '../x-fidelity-plugins/src/index.ts'),
    },
    // Include node_modules dependencies that X-Fidelity needs
    define: {
      'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development'),
    },
    // Resolve extensions for TypeScript
    resolveExtensions: ['.ts', '.js', '.json'],
    // Node.js compatibility for VS Code extensions
    target: 'node16',
  });

  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

/**
 * Plugin to copy WASM files needed for web-tree-sitter
 * @type {import('esbuild').Plugin}
 */
const copyWasmFilesPlugin = {
  name: 'copy-wasm-files',
  setup(build) {
    build.onEnd(() => {
      // Ensure dist directory exists
      if (!fs.existsSync('dist')) {
        fs.mkdirSync('dist', { recursive: true });
      }

      // Copy WASM files to dist directory - correct paths from workspace root
      const wasmFiles = [
        {
          src: '../../node_modules/web-tree-sitter/tree-sitter.wasm',
          dest: 'dist/tree-sitter.wasm'
        },
        {
          src: '../../node_modules/tree-sitter-javascript/tree-sitter-javascript.wasm',
          dest: 'dist/tree-sitter-javascript.wasm'
        },
        {
          src: '../../node_modules/tree-sitter-typescript/tree-sitter-typescript.wasm',
          dest: 'dist/tree-sitter-typescript.wasm'
        }
      ];

      wasmFiles.forEach(({ src, dest }) => {
        try {
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
            console.log(`[wasm] Copied ${src} to ${dest}`);
          } else {
            console.warn(`[wasm] Warning: ${src} not found, skipping copy`);
          }
        } catch (error) {
          console.error(`[wasm] Error copying ${src}:`, error.message);
        }
      });
    });
  }
};

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',

  setup(build) {
    build.onStart(() => {
      console.log('[watch] build started');
    });
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        console.error(`    ${location.file}:${location.line}:${location.column}:`);
      });
      console.log('[watch] build finished');
    });
  },
};

main().catch(e => {
  console.error(e);
  process.exit(1);
}); 