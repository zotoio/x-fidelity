const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
  // Build TreeSitter worker first - WITH tree-sitter bundled for VSIX compatibility
  const workerCtx = await esbuild.context({
    entryPoints: [
      '../x-fidelity-plugins/src/xfiPluginAst/worker/treeSitterWorker.ts'
    ],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/treeSitterWorker.js',
    external: [
      'vscode',
      'electron',
      'original-fs',
      // Native modules that contain .node files
      'fsevents',
      'chokidar'
      // REMOVED: tree-sitter modules - now bundled to prevent VSIX failures
    ],
    logLevel: 'info',
    alias: {
      '@x-fidelity/core': path.resolve(
        __dirname,
        '../x-fidelity-core/dist/index.js'
      ),
      '@x-fidelity/types': path.resolve(
        __dirname,
        '../x-fidelity-types/dist/index.js'
      )
    },
    target: 'node18',
    treeShaking: true,
    loader: {
      '.json': 'json',
      '.node': 'copy'  // Changed from 'file' to 'copy' for better .node handling
    },
    // Additional options for proper tree-sitter bundling
    mainFields: ['main', 'module'],
    conditions: ['node'],
    define: {
      'process.env.NODE_ENV': production ? '"production"' : '"development"'
    }
  });

  // Build main extension
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/extension.js',
    external: [
      'vscode',
      // Keep these external as they should be available in VS Code environment
      'electron',
      'original-fs',
      // Native modules that contain .node files
      'fsevents',
      'chokidar'
    ],
    logLevel: 'info',
    plugins: [
      esbuildProblemMatcherPlugin,
      copyXFidelityAssetsPlugin,
      // Add bundle size analyzer
      bundleAnalyzerPlugin
    ],
    // Enhanced alias resolution - use built packages for better dependency resolution
    alias: {
      '@x-fidelity/core': path.resolve(
        __dirname,
        '../x-fidelity-core/dist/index.js'
      ),
      '@x-fidelity/types': path.resolve(
        __dirname,
        '../x-fidelity-types/dist/index.js'
      ),
      '@x-fidelity/plugins': path.resolve(
        __dirname,
        '../x-fidelity-plugins/dist/index.js'
      )
    },
    // Include node_modules dependencies that X-Fidelity needs
    define: {
      'process.env.NODE_ENV': JSON.stringify(
        production ? 'production' : 'development'
      ),
      // Fix potential runtime issues
      global: 'globalThis'
    },
    // Resolve extensions for better compatibility
    resolveExtensions: ['.ts', '.js', '.json'],
    // Updated Node.js target for VSCode compatibility
    target: 'node18',
    // Enhanced tree shaking
    treeShaking: true,
    // Optimized for VSCode
    mainFields: ['main', 'module'],
    // Handle circular dependencies better
    conditions: ['node'],
    // Drop console logs and debugger in production only
    drop: production ? ['console', 'debugger'] : [],
    // Loader for JSON and WASM files
    loader: {
      '.json': 'json',
      '.node': 'file',
      '.wasm': 'copy'
    },
    // Bundle splitting for better performance
    splitting: false, // VSCode extensions can't use splitting
    // Metadata for debugging
    metafile: true
  });

  if (watch) {
    console.log('[watch] Starting watch mode...');
    await Promise.all([workerCtx.watch(), ctx.watch()]);
    console.log('[watch] Watching for changes...');
  } else {
    // Build worker and extension
    const [workerResult, extensionResult] = await Promise.all([
      workerCtx.rebuild(),
      ctx.rebuild()
    ]);

    if (extensionResult.metafile) {
      // Log bundle information
      const extensionSize = fs.statSync('dist/extension.js').size;
      const workerSize = fs.statSync('dist/treeSitterWorker.js').size;
      console.log(
        `[build] Extension bundle size: ${Math.round(extensionSize / 1024)}KB`
      );
      console.log(
        `[build] Worker bundle size: ${Math.round(workerSize / 1024)}KB`
      );
    }

    await Promise.all([workerCtx.dispose(), ctx.dispose()]);
  }
}

/**
 * Enhanced bundle analyzer plugin
 */
const bundleAnalyzerPlugin = {
  name: 'bundle-analyzer',
  setup(build) {
    build.onEnd(async result => {
      if (result.metafile && !production) {
        try {
          const analysis = await esbuild.analyzeMetafile(result.metafile, {
            verbose: false
          });
          console.log('[analyzer] Bundle analysis:');
          console.log(analysis);
        } catch (error) {
          console.log('[analyzer] Bundle analysis failed:', error.message);
        }
      }
    });
  }
};

/**
 * Copy X-Fidelity assets plugin - ensures demo config, plugins, core and CLI are packaged
 */
const copyXFidelityAssetsPlugin = {
  name: 'copy-xfidelity-assets',
  setup(build) {
    build.onEnd(() => {
      // Ensure dist directory exists
      if (!fs.existsSync('dist')) {
        fs.mkdirSync('dist', { recursive: true });
      }

      console.log('[xfidelity] 📦 Copying X-Fidelity assets...');

      // Copy CLI binary for bundled execution
      const cliBinarySrc = path.resolve(
        __dirname,
        '../x-fidelity-cli/dist/index.js'
      );
      const cliBinaryDest = 'dist/cli';

      try {
        // Ensure CLI directory exists
        if (!fs.existsSync(cliBinaryDest)) {
          fs.mkdirSync(cliBinaryDest, { recursive: true });
        }

        // Copy CLI binary and support files
        const cliFiles = ['index.js', 'index.js.map', 'index.d.ts'];
        const cliDistPath = path.dirname(cliBinarySrc);

        for (const file of cliFiles) {
          const srcFile = path.join(cliDistPath, file);
          const destFile = path.join(cliBinaryDest, file);

          if (fs.existsSync(srcFile)) {
            fs.copyFileSync(srcFile, destFile);
          }
        }

        // Copy demo config directory for bundled CLI
        const cliDemoConfigSrc = path.join(cliDistPath, 'demoConfig');
        const cliDemoConfigDest = path.join(cliBinaryDest, 'demoConfig');

        if (fs.existsSync(cliDemoConfigSrc)) {
          fs.cpSync(cliDemoConfigSrc, cliDemoConfigDest, {
            recursive: true,
            force: true
          });
        }

        console.log('[cli] ✅ CLI binary bundled to dist/cli');
      } catch (error) {
        console.warn(
          '[cli] ⚠️ CLI bundling failed (CLI may not be built):',
          error.message
        );
        console.warn('[cli] 💡 Run: cd ../x-fidelity-cli && yarn build');
      }

      // Copy demo configuration
      const demoConfigSrc = path.resolve(
        __dirname,
        '../x-fidelity-democonfig/src'
      );
      const demoConfigDest = 'dist/demoConfig';

      if (fs.existsSync(demoConfigSrc)) {
        try {
          // Remove existing demoConfig directory
          if (fs.existsSync(demoConfigDest)) {
            fs.rmSync(demoConfigDest, { recursive: true, force: true });
          }

          // Create destination directory
          fs.mkdirSync(demoConfigDest, { recursive: true });

          // Copy all demo config files recursively
          copyDirectoryRecursive(demoConfigSrc, demoConfigDest);
          console.log(
            `[xfidelity] ✓ Copied demo configuration from ${demoConfigSrc}`
          );
        } catch (error) {
          console.error(
            `[xfidelity] ❌ Failed to copy demo configuration:`,
            error.message
          );
        }
      } else {
        console.warn(
          `[xfidelity] ⚠ Demo configuration not found at ${demoConfigSrc}`
        );
      }

      // Copy plugin sample rules and configurations
      const pluginsSrc = path.resolve(__dirname, '../x-fidelity-plugins/src');
      const pluginsDest = 'dist/plugins';

      if (fs.existsSync(pluginsSrc)) {
        try {
          // Remove existing plugins directory
          if (fs.existsSync(pluginsDest)) {
            fs.rmSync(pluginsDest, { recursive: true, force: true });
          }

          // Create destination directory
          fs.mkdirSync(pluginsDest, { recursive: true });

          // Copy only the sample rules and configuration files (not the full source)
          copyPluginAssets(pluginsSrc, pluginsDest);
          console.log(`[xfidelity] ✓ Copied plugin assets from ${pluginsSrc}`);
        } catch (error) {
          console.error(
            `[xfidelity] ❌ Failed to copy plugin assets:`,
            error.message
          );
        }
      } else {
        console.warn(
          `[xfidelity] ⚠ Plugins directory not found at ${pluginsSrc}`
        );
      }

      // Copy WASM files for web-tree-sitter
      console.log('[wasm] 📦 Copying Tree-sitter WASM files...');
      
      try {
        // Create wasm directory
        const wasmDest = 'dist/wasm';
        if (!fs.existsSync(wasmDest)) {
          fs.mkdirSync(wasmDest, { recursive: true });
        }

        // Copy main tree-sitter WASM file from web-tree-sitter
        const treeSitterWasm = path.resolve(__dirname, 'node_modules', 'web-tree-sitter', 'tree-sitter.wasm');
        const treeSitterWasmDest = path.join(wasmDest, 'tree-sitter.wasm');
        
        if (fs.existsSync(treeSitterWasm)) {
          fs.copyFileSync(treeSitterWasm, treeSitterWasmDest);
          console.log('[wasm] ✓ Copied tree-sitter.wasm');
        } else {
          console.warn('[wasm] ⚠️ tree-sitter.wasm not found at', treeSitterWasm);
          // Try alternative path
          const altPath = path.resolve(__dirname, 'node_modules', 'web-tree-sitter', 'lib', 'tree-sitter.wasm');
          if (fs.existsSync(altPath)) {
            fs.copyFileSync(altPath, treeSitterWasmDest);
            console.log('[wasm] ✓ Copied tree-sitter.wasm from lib/ directory');
          }
        }

        // Copy language parser WASM files
        const languageFiles = [
          { pkg: 'tree-sitter-javascript', file: 'tree-sitter-javascript.wasm' },
          { pkg: 'tree-sitter-typescript', file: 'tree-sitter-typescript.wasm' },
          { pkg: 'tree-sitter-typescript', file: 'tree-sitter-tsx.wasm' }
        ];

        for (const { pkg, file } of languageFiles) {
          const srcPath = path.resolve(__dirname, 'node_modules', pkg, file);
          const destPath = path.join(wasmDest, file);
          
          if (fs.existsSync(srcPath)) {
            fs.copyFileSync(srcPath, destPath);
            console.log(`[wasm] ✓ Copied ${file}`);
          } else {
            console.warn(`[wasm] ⚠️ ${file} not found at`, srcPath);
          }
        }

        // Verify copied files
        const wasmFiles = fs.readdirSync(wasmDest).filter(f => f.endsWith('.wasm'));
        console.log(`[wasm] ✅ WASM files copied successfully: ${wasmFiles.join(', ')}`);
        
        if (wasmFiles.length === 0) {
          console.error('[wasm] ❌ No WASM files were copied! This will cause TreeSitter initialization to fail.');
        }
        
      } catch (error) {
        console.error('[wasm] ❌ Failed to copy WASM files:', error.message);
        console.error('[wasm] This will cause TreeSitter WASM initialization to fail in the extension.');
      }

      // Create a manifest file with version information
      const manifest = {
        version: '4.0.0',
        buildTime: new Date().toISOString(),
        components: {
          demoConfig: fs.existsSync(demoConfigDest),
          plugins: fs.existsSync(pluginsDest),
          wasm: fs.existsSync('dist/wasm')
        }
      };

      fs.writeFileSync(
        'dist/xfidelity-manifest.json',
        JSON.stringify(manifest, null, 2)
      );
      console.log(`[xfidelity] ✓ Created manifest file`);
    });
  }
};

/**
 * Enhanced problem matcher plugin
 */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',
  setup(build) {
    build.onStart(() => {
      console.log('[build] 🔨 Build started...');
    });

    build.onEnd(result => {
      if (result.errors.length > 0) {
        console.log(
          `[build] ❌ Build failed with ${result.errors.length} errors:`
        );
        result.errors.forEach(({ text, location }) => {
          console.error(`  ✘ [ERROR] ${text}`);
          if (location) {
            console.error(
              `    📍 ${location.file}:${location.line}:${location.column}`
            );
          }
        });
      } else {
        console.log('[build] ✅ Build completed successfully');
      }

      if (result.warnings.length > 0) {
        console.log(`[build] ⚠ ${result.warnings.length} warnings:`);
        result.warnings.forEach(({ text, location }) => {
          console.warn(`  ⚠ [WARNING] ${text}`);
          if (location) {
            console.warn(
              `    📍 ${location.file}:${location.line}:${location.column}`
            );
          }
        });
      }
    });
  }
};

/**
 * Helper function to copy directory recursively
 */
function copyDirectoryRecursive(src, dest) {
  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const files = fs.readdirSync(src);
    files.forEach(file => {
      const srcFile = path.join(src, file);
      const destFile = path.join(dest, file);
      copyDirectoryRecursive(srcFile, destFile);
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

/**
 * Helper function to copy plugin assets (sample rules and configs)
 */
function copyPluginAssets(src, dest) {
  const plugins = fs.readdirSync(src).filter(item => {
    const itemPath = path.join(src, item);
    return fs.statSync(itemPath).isDirectory() && item.startsWith('xfiPlugin');
  });

  plugins.forEach(plugin => {
    const pluginSrc = path.join(src, plugin);
    const pluginDest = path.join(dest, plugin);

    // Create plugin directory
    fs.mkdirSync(pluginDest, { recursive: true });

    // Copy sample rules if they exist
    const sampleRulesPath = path.join(pluginSrc, 'sampleRules');
    if (fs.existsSync(sampleRulesPath)) {
      const sampleRulesDest = path.join(pluginDest, 'sampleRules');
      copyDirectoryRecursive(sampleRulesPath, sampleRulesDest);
    }

    // Copy any JSON configuration files in the plugin root
    const files = fs.readdirSync(pluginSrc);
    files.forEach(file => {
      if (file.endsWith('.json')) {
        const srcFile = path.join(pluginSrc, file);
        const destFile = path.join(pluginDest, file);
        fs.copyFileSync(srcFile, destFile);
      }
    });
  });
}

main().catch(e => {
  console.error('❌ Build failed:', e);
  process.exit(1);
});
