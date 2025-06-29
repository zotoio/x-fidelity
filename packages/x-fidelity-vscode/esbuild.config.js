const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
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
      // Exclude native tree-sitter packages since we're using WASM versions
      'tree-sitter',
      'tree-sitter-javascript',
      'tree-sitter-typescript'
    ],
    logLevel: 'info',
    plugins: [
      esbuildProblemMatcherPlugin,
      copyWasmFilesPlugin,
      copyXFidelityAssetsPlugin,
      // Add bundle size analyzer
      bundleAnalyzerPlugin,
    ],
    // Enhanced alias resolution - use built packages for better dependency resolution
    alias: {
      '@x-fidelity/core': path.resolve(__dirname, '../x-fidelity-core/dist/index.js'),
      '@x-fidelity/types': path.resolve(__dirname, '../x-fidelity-types/dist/index.js'),
      '@x-fidelity/plugins': path.resolve(__dirname, '../x-fidelity-plugins/dist/index.js'),
    },
    // Include node_modules dependencies that X-Fidelity needs
    define: {
      'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development'),
      // Fix potential runtime issues
      'global': 'globalThis',
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
    // Loader for JSON files
    loader: {
      '.json': 'json',
      '.wasm': 'file',
      '.node': 'file',
    },
    // Bundle splitting for better performance
    splitting: false, // VSCode extensions can't use splitting
    // Metadata for debugging
    metafile: true,
  });

  // Build worker thread
  const workerCtx = await esbuild.context({
    entryPoints: ['src/workers/analysisWorker.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/worker.js',
    external: [
      'vscode', // Worker won't have access to VSCode API
      // Native tree-sitter packages - external for worker
      'tree-sitter',
      'tree-sitter-javascript', 
      'tree-sitter-typescript',
      'electron',
      'original-fs'
    ],
    logLevel: 'info',
    target: 'node18',
    treeShaking: true,
    define: {
      'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development'),
      'global': 'globalThis',
    },
    resolveExtensions: ['.ts', '.js', '.json'],
    mainFields: ['main', 'module'],
    conditions: ['node'],
    drop: production ? ['console', 'debugger'] : [],
    loader: {
      '.json': 'json',
      '.wasm': 'file',
      '.node': 'file',
    },
    metafile: true,
  });

  if (watch) {
    console.log('[watch] Starting watch mode...');
    await ctx.watch();
    await workerCtx.watch();
    console.log('[watch] Watching for changes...');
  } else {
    const result = await ctx.rebuild();
    const workerResult = await workerCtx.rebuild();
    
    if (result.metafile) {
      // Log bundle information
      const bundleSize = fs.statSync('dist/extension.js').size;
      const workerSize = fs.statSync('dist/worker.js').size;
      console.log(`[build] Main bundle size: ${Math.round(bundleSize / 1024)}KB`);
      console.log(`[build] Worker bundle size: ${Math.round(workerSize / 1024)}KB`);
    }
    
    await ctx.dispose();
    await workerCtx.dispose();
  }
}

/**
 * Enhanced bundle analyzer plugin
 */
const bundleAnalyzerPlugin = {
  name: 'bundle-analyzer',
  setup(build) {
    build.onEnd(async (result) => {
      if (result.metafile && !production) {
        try {
          const analysis = await esbuild.analyzeMetafile(result.metafile, { verbose: false });
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
 * Copy X-Fidelity assets plugin - ensures demo config, plugins, and core are packaged
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

      // Copy demo configuration
      const demoConfigSrc = path.resolve(__dirname, '../x-fidelity-democonfig/src');
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
          console.log(`[xfidelity] ✓ Copied demo configuration from ${demoConfigSrc}`);
        } catch (error) {
          console.error(`[xfidelity] ❌ Failed to copy demo configuration:`, error.message);
        }
      } else {
        console.warn(`[xfidelity] ⚠ Demo configuration not found at ${demoConfigSrc}`);
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
          console.error(`[xfidelity] ❌ Failed to copy plugin assets:`, error.message);
        }
      } else {
        console.warn(`[xfidelity] ⚠ Plugins directory not found at ${pluginsSrc}`);
      }

      // Create a manifest file with version information
      const manifest = {
        version: '4.0.0',
        buildTime: new Date().toISOString(),
        components: {
          demoConfig: fs.existsSync(demoConfigDest),
          plugins: fs.existsSync(pluginsDest),
          wasm: {
            treeSitter: fs.existsSync('dist/tree-sitter.wasm'),
            javascript: fs.existsSync('dist/tree-sitter-javascript.wasm'),
            typescript: fs.existsSync('dist/tree-sitter-typescript.wasm')
          }
        }
      };

      fs.writeFileSync('dist/xfidelity-manifest.json', JSON.stringify(manifest, null, 2));
      console.log(`[xfidelity] ✓ Created manifest file`);
    });
  }
};

/**
 * Enhanced WASM files plugin with better error handling
 */
const copyWasmFilesPlugin = {
  name: 'copy-wasm-files',
  setup(build) {
    build.onEnd(() => {
      // Ensure dist directory exists
      if (!fs.existsSync('dist')) {
        fs.mkdirSync('dist', { recursive: true });
      }

      // Copy WASM files - check multiple possible locations
      const wasmFiles = [
        {
          src: [
            '../../node_modules/web-tree-sitter/tree-sitter.wasm',
            'node_modules/web-tree-sitter/tree-sitter.wasm'
          ],
          dest: 'dist/tree-sitter.wasm'
        },
        {
          src: [
            '../../node_modules/tree-sitter-javascript/tree-sitter-javascript.wasm',
            'node_modules/tree-sitter-javascript/tree-sitter-javascript.wasm'
          ],
          dest: 'dist/tree-sitter-javascript.wasm'
        },
        {
          src: [
            '../../node_modules/tree-sitter-typescript/tree-sitter-typescript.wasm',
            'node_modules/tree-sitter-typescript/tree-sitter-typescript.wasm'
          ],
          dest: 'dist/tree-sitter-typescript.wasm'
        }
      ];

      wasmFiles.forEach(({ src, dest }) => {
        let copied = false;
        for (const srcPath of src) {
          try {
            if (fs.existsSync(srcPath)) {
              fs.copyFileSync(srcPath, dest);
              console.log(`[wasm] ✓ Copied ${srcPath} to ${dest}`);
              copied = true;
              break;
            }
          } catch (error) {
            console.warn(`[wasm] ⚠ Failed to copy ${srcPath}:`, error.message);
          }
        }
        if (!copied) {
          console.warn(`[wasm] ⚠ Warning: Could not find WASM file for ${dest}`);
        }
      });
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
    
    build.onEnd((result) => {
      if (result.errors.length > 0) {
        console.log(`[build] ❌ Build failed with ${result.errors.length} errors:`);
        result.errors.forEach(({ text, location }) => {
          console.error(`  ✘ [ERROR] ${text}`);
          if (location) {
            console.error(`    📍 ${location.file}:${location.line}:${location.column}`);
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
            console.warn(`    📍 ${location.file}:${location.line}:${location.column}`);
          }
        });
      }
    });
  },
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