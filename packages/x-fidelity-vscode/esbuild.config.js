const esbuild = require('esbuild');
const path = require('path');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/extension.js',
    external: ['vscode'],
    logLevel: 'silent',
    plugins: [
      esbuildProblemMatcherPlugin,
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