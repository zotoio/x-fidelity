const esbuild = require('esbuild');
const esbuildPluginPino = require("esbuild-plugin-pino");
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
    outdir: 'dist',
    external: [
      // Keep only runtime dependencies external that MUST be provided by the environment
      // or contain native binaries that can't be bundled
      // VSCode API is only available in VSCode extension context
      'vscode',
      // Native modules that contain .node files - these need platform-specific builds
      'fsevents',
      // TreeSitter native modules - these contain platform-specific .node binaries
      'tree-sitter',
      'tree-sitter-javascript', 
      'tree-sitter-typescript',
      'web-tree-sitter',

      // Bundle everything else to make CLI self-contained:
      // - axios: HTTP client used by core
      // - commander: CLI framework
      // - fs-extra: Enhanced filesystem operations  
      // - ora: Loading spinners
      // - prettyjson: JSON formatting
      // - pino: Core logging (without transports)
      // - glob: File pattern matching
      // - @babel/*: AST parsing
      // - @yarnpkg/lockfile: Package lock parsing
      // - dotenv: Environment variables
      // - esprima: JavaScript parsing
      // - lodash: Utility functions
      // - openai: AI integration
      // - semver: Version comparison
      // - chokidar: File watching
      // NOTE: @x-fidelity/* packages are intentionally NOT listed here
      // They should be bundled via the alias configuration below
    ],
    logLevel: 'info',
    // Bundle all internal dependencies from source
    alias: {
      '@x-fidelity/core': path.resolve(__dirname, '../x-fidelity-core/src/index.ts'),
      '@x-fidelity/types': path.resolve(__dirname, '../x-fidelity-types/src/index.ts'),
      '@x-fidelity/plugins': path.resolve(__dirname, '../x-fidelity-plugins/src/index.ts'),
      '@x-fidelity/server': path.resolve(__dirname, '../x-fidelity-server/src/index.ts'),
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
      '.json': 'json',
      '.node': 'file'
    },
    metafile: true,
    plugins: [
      esbuildPluginPino({ transports: ["pino-pretty"] }),
      // Plugin to replace dynamic imports with static ones for bundling
      {
        
        name: 'replace-dynamic-imports',
        setup(build) {
          build.onLoad({ filter: /\.ts$/ }, async (args) => {
            if (!args.path.includes('configManager.ts')) return;
            
            const fs = require('fs');
            let contents = fs.readFileSync(args.path, 'utf8');
            
            // Replace dynamic imports with static imports for bundling
            contents = contents.replace(
              /await this\.dynamicImport\('@x-fidelity\/plugins'\)/g,
              'await import("@x-fidelity/plugins")'
            );
            
            return { contents, loader: 'ts' };
          });
        }
      },
      copyAssetsPlugin
    ]
  });

  // Build CLI
  const cliResult = await ctx.rebuild();
  
  if (cliResult.metafile) {
    const cliSize = fs.statSync('dist/index.js').size;
    console.log(`[cli] CLI bundle size: ${Math.round(cliSize / 1024)}KB`);
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
        { name: 'xfidelity', path: 'dist/xfidelity' }
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