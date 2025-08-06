#!/usr/bin/env node

/**
 * Ensures workspace package symlinks are properly set up for integration tests
 * This fixes the issue where compiled code can't resolve workspace package imports
 * Works both locally and in CI environments (GitHub Actions)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORKSPACE_ROOT = path.resolve(__dirname, '../../..');
const PACKAGES_DIR = path.join(WORKSPACE_ROOT, 'packages');

// Workspace packages that need symlinks
const WORKSPACE_PACKAGES = [
  { name: '@x-fidelity/types', dir: 'x-fidelity-types' },
  { name: '@x-fidelity/core', dir: 'x-fidelity-core' },
  { name: '@x-fidelity/plugins', dir: 'x-fidelity-plugins' },
  { name: '@x-fidelity/democonfig', dir: 'x-fidelity-democonfig' }
];

/**
 * Creates symlinks for workspace packages in a package's node_modules
 */
function ensureSymlinksForPackage(packageDir, packageName) {
  const nodeModulesDir = path.join(packageDir, 'node_modules');
  const xFidelityDir = path.join(nodeModulesDir, '@x-fidelity');

  // Create node_modules/@x-fidelity if it doesn't exist
  if (!fs.existsSync(xFidelityDir)) {
    fs.mkdirSync(xFidelityDir, { recursive: true });
    console.log(`  📁 Created ${path.relative(WORKSPACE_ROOT, xFidelityDir)}`);
  }

  // Create symlinks for each workspace package
  for (const { name, dir } of WORKSPACE_PACKAGES) {
    // Skip self-reference
    if (name === packageName) continue;

    const linkName = name.split('/')[1]; // Get package name without scope
    const linkPath = path.join(xFidelityDir, linkName);
    const targetPath = path.join(PACKAGES_DIR, dir);

    // Remove existing symlink/directory if it exists
    if (fs.existsSync(linkPath)) {
      try {
        const stats = fs.lstatSync(linkPath);
        if (stats.isSymbolicLink()) {
          fs.unlinkSync(linkPath);
        } else {
          // It might be a real directory or junction on Windows
          fs.rmSync(linkPath, { recursive: true, force: true });
        }
      } catch (e) {
        console.warn(`  ⚠️  Could not remove ${linkPath}: ${e.message}`);
      }
    }

    // Create new symlink
    try {
      // On Windows CI, use junction for directories (more reliable)
      // On Unix systems, use relative symlinks for portability
      if (process.platform === 'win32') {
        // Windows: use junction (always absolute path)
        fs.symlinkSync(targetPath, linkPath, 'junction');
      } else {
        // Unix: use relative symlink
        const relativeTarget = path.relative(path.dirname(linkPath), targetPath);
        fs.symlinkSync(relativeTarget, linkPath, 'dir');
      }
      
      console.log(`  ✅ Linked ${name} -> ${path.relative(WORKSPACE_ROOT, targetPath)}`);
    } catch (error) {
      console.error(`  ❌ Failed to create symlink for ${name}: ${error.message}`);
      
      // Fallback: copy the directory instead of symlinking
      console.log(`  🔄 Attempting fallback: copying directory instead...`);
      try {
        fs.cpSync(targetPath, linkPath, { recursive: true, force: true });
        console.log(`  ✅ Copied ${name} (fallback method)`);
      } catch (copyError) {
        console.error(`  ❌ Copy fallback also failed: ${copyError.message}`);
      }
    }
  }
}

/**
 * Ensures yarn workspaces are properly linked
 */
function ensureYarnWorkspaces() {
  console.log('\n📦 Running yarn to ensure workspace links...');
  try {
    // Run yarn install to ensure workspace symlinks are created
    execSync('yarn install --frozen-lockfile --check-files', {
      cwd: WORKSPACE_ROOT,
      stdio: 'inherit'
    });
    console.log('✅ Yarn workspace links updated');
  } catch (error) {
    console.warn('⚠️  Yarn install had issues, but continuing...');
  }
}

/**
 * Main function to ensure all workspace symlinks are set up
 */
function main() {
  console.log('🔗 Ensuring workspace package symlinks for integration tests...');
  console.log(`📍 Workspace root: ${WORKSPACE_ROOT}`);
  console.log(`🌍 Environment: ${process.env.CI ? 'CI (GitHub Actions)' : 'Local'}`);
  console.log(`💻 Platform: ${process.platform}`);
  
  // First, ensure yarn workspaces are linked
  if (!process.env.SKIP_YARN_INSTALL) {
    ensureYarnWorkspaces();
  }
  
  // Ensure symlinks for each package
  console.log('\n🔗 Creating cross-package symlinks...');
  for (const { name, dir } of WORKSPACE_PACKAGES) {
    const packageDir = path.join(PACKAGES_DIR, dir);
    
    if (!fs.existsSync(packageDir)) {
      console.warn(`⚠️  Package directory not found: ${dir}`);
      continue;
    }
    
    console.log(`\n📦 Setting up symlinks for ${name}...`);
    ensureSymlinksForPackage(packageDir, name);
  }
  
  // Also ensure symlinks for the VSCode package
  const vscodePackageDir = path.join(PACKAGES_DIR, 'x-fidelity-vscode');
  if (fs.existsSync(vscodePackageDir)) {
    console.log(`\n📦 Setting up symlinks for x-fidelity-vscode...`);
    ensureSymlinksForPackage(vscodePackageDir, 'x-fidelity-vscode');
  }
  
  // Verify that the critical symlinks exist
  console.log('\n🔍 Verifying critical symlinks...');
  const criticalPaths = [
    { 
      path: 'x-fidelity-core/node_modules/@x-fidelity/types',
      required: true,
      description: 'Core -> Types dependency'
    },
    { 
      path: 'x-fidelity-plugins/node_modules/@x-fidelity/types',
      required: true,
      description: 'Plugins -> Types dependency'
    },
    { 
      path: 'x-fidelity-plugins/node_modules/@x-fidelity/core',
      required: true,
      description: 'Plugins -> Core dependency'
    },
    { 
      path: 'x-fidelity-vscode/node_modules/@x-fidelity/core',
      required: true,
      description: 'VSCode -> Core dependency'
    },
    { 
      path: 'x-fidelity-vscode/node_modules/@x-fidelity/types',
      required: true,
      description: 'VSCode -> Types dependency'
    },
    { 
      path: 'x-fidelity-vscode/node_modules/@x-fidelity/plugins',
      required: true,
      description: 'VSCode -> Plugins dependency'
    }
  ];
  
  let allValid = true;
  let criticalMissing = false;
  
  for (const { path: relativePath, required, description } of criticalPaths) {
    const fullPath = path.join(PACKAGES_DIR, relativePath);
    if (fs.existsSync(fullPath)) {
      try {
        const stats = fs.lstatSync(fullPath);
        const realPath = fs.realpathSync(fullPath);
        if (stats.isSymbolicLink() || stats.isDirectory()) {
          console.log(`  ✅ ${description}`);
          console.log(`     ${relativePath} -> ${path.relative(WORKSPACE_ROOT, realPath)}`);
        } else {
          console.error(`  ❌ ${description}`);
          console.error(`     ${relativePath} exists but is not a symlink/directory`);
          allValid = false;
          if (required) criticalMissing = true;
        }
      } catch (e) {
        console.error(`  ❌ ${description}`);
        console.error(`     ${relativePath} - Error: ${e.message}`);
        allValid = false;
        if (required) criticalMissing = true;
      }
    } else {
      console.error(`  ❌ ${description}`);
      console.error(`     ${relativePath} does not exist`);
      allValid = false;
      if (required) criticalMissing = true;
    }
  }
  
  // Also verify that compiled dist directories exist
  console.log('\n📦 Verifying compiled packages...');
  const distPaths = [
    'x-fidelity-types/dist/index.js',
    'x-fidelity-core/dist/index.js',
    'x-fidelity-plugins/dist/index.js'
  ];
  
  for (const distPath of distPaths) {
    const fullPath = path.join(PACKAGES_DIR, distPath);
    if (fs.existsSync(fullPath)) {
      console.log(`  ✅ ${distPath}`);
    } else {
      console.error(`  ❌ ${distPath} - not found (run yarn build)`);
      criticalMissing = true;
    }
  }
  
  if (allValid) {
    console.log('\n✅ All workspace symlinks successfully configured');
  } else if (criticalMissing) {
    console.error('\n❌ Critical symlinks missing - tests will fail');
    console.log('💡 Try running:');
    console.log('   1. yarn install --force');
    console.log('   2. yarn build');
    console.log('   3. yarn test:integration');
    process.exit(1);
  } else {
    console.warn('\n⚠️  Some non-critical symlinks could not be created');
  }
}

if (require.main === module) {
  main();
}

module.exports = { ensureSymlinksForPackage, main };
