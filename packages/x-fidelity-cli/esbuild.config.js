const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const production = process.argv.includes('--production');

async function main() {
  // First ensure all dependencies are built
  console.log('[cli] Building dependencies...');
  
  // Build main CLI
  const ctx = await esbuild.context({
    entryPoints: ['src/index.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/index.js',
    external: [
      // Keep only runtime dependencies external
      'commander',
      'fs-extra', 
      'ora',
      'prettyjson',
      'pino',
      'pino-pretty',
      // VSCode API is only available in VSCode extension context
      'vscode'
    ],
    logLevel: 'info',
    // Bundle all internal dependencies
    alias: {
      '@x-fidelity/core': path.resolve(__dirname, '../x-fidelity-core/dist/index.js'),
      '@x-fidelity/types': path.resolve(__dirname, '../x-fidelity-types/dist/index.js'),
      '@x-fidelity/plugins': path.resolve(__dirname, '../x-fidelity-plugins/dist/index.js'),
      '@x-fidelity/server': path.resolve(__dirname, '../x-fidelity-server/dist/index.js'),
      '@x-fidelity/democonfig': path.resolve(__dirname, '../x-fidelity-democonfig/src/index.js')
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development')
    },
    resolveExtensions: ['.ts', '.js', '.json'],
    target: 'node18',
    treeShaking: true,
    mainFields: ['main', 'module'],
    conditions: ['node'],
    loader: {
      '.json': 'json'
    },
    metafile: true,
    plugins: [
      copyAssetsPlugin
    ]
  });

  const result = await ctx.rebuild();
  
  if (result.metafile) {
    const bundleSize = fs.statSync('dist/index.js').size;
    console.log(`[cli] Bundle size: ${Math.round(bundleSize / 1024)}KB`);
  }

  await ctx.dispose();
}

/**
 * Copy assets plugin - ensures demo config and CLI binary are properly set up
 */
const copyAssetsPlugin = {
  name: 'copy-cli-assets',
  setup(build) {
    build.onEnd(() => {
      console.log('[cli] 📦 Copying CLI assets...');

      // Copy demo configuration
      const demoConfigSrc = path.resolve(__dirname, '../x-fidelity-democonfig/src');
      const demoConfigDest = 'dist/demoConfig';

      if (fs.existsSync(demoConfigSrc)) {
        try {
          if (fs.existsSync(demoConfigDest)) {
            fs.rmSync(demoConfigDest, { recursive: true, force: true });
          }
          fs.mkdirSync(demoConfigDest, { recursive: true });
          copyDirectoryRecursive(demoConfigSrc, demoConfigDest);
          console.log('[cli] ✅ Demo config copied to dist/demoConfig');
        } catch (error) {
          console.warn('[cli] ⚠️  Failed to copy demo config:', error.message);
        }
      }

      // Create executable CLI binaries
      const cliSource = 'dist/index.js';
      const binaries = [
        { name: 'xfidelity', path: 'dist/xfidelity' },
        { name: 'xfi', path: 'dist/xfi' }
      ];
      
      if (fs.existsSync(cliSource)) {
        binaries.forEach(binary => {
          try {
            fs.copyFileSync(cliSource, binary.path);
            if (process.platform !== 'win32') {
              fs.chmodSync(binary.path, '755');
            }
            console.log(`[cli] ✅ CLI binary created at ${binary.path}`);
          } catch (error) {
            console.warn(`[cli] ⚠️  Failed to create CLI binary ${binary.name}:`, error.message);
          }
        });
      }
    });
  }
};

/**
 * Recursively copy directory
 */
function copyDirectoryRecursive(src, dest) {
  const stats = fs.statSync(src);
  
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const files = fs.readdirSync(src);
    files.forEach(file => {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      copyDirectoryRecursive(srcPath, destPath);
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

main().catch(console.error); 