#!/usr/bin/env node

/**
 * Test script for PR Version Sync workflow behavior
 * This helps validate the workflow triggers and sequencing
 */

const { execSync } = require('child_process');
const fs = require('fs');

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',    // cyan
    success: '\x1b[32m', // green  
    error: '\x1b[31m',   // red
    warning: '\x1b[33m', // yellow
    reset: '\x1b[0m'
  };
  
  console.log(`${colors[type]}${message}${colors.reset}`);
}

function checkWorkflowConfiguration() {
  log('🔍 Checking PR Version Sync workflow configuration...', 'info');
  
  const workflowPath = '.github/workflows/pr-version-sync.yml';
  
  if (!fs.existsSync(workflowPath)) {
    log('❌ PR Version Sync workflow not found', 'error');
    return false;
  }
  
  const workflowContent = fs.readFileSync(workflowPath, 'utf8');
  
  // Check for workflow_run trigger
  if (!workflowContent.includes('workflow_run:')) {
    log('❌ Workflow should use workflow_run trigger', 'error');
    return false;
  }
  
  // Check for proper workflow dependencies
  if (!workflowContent.includes('"CI", "VSCode Extension CI"')) {
    log('❌ Workflow should depend on CI and VSCode Extension CI', 'error');
    return false;
  }
  
  // Check for success condition
  if (!workflowContent.includes("github.event.workflow_run.conclusion == 'success'")) {
    log('❌ Workflow should only run on successful CI completion', 'error');
    return false;
  }
  
  log('✅ Workflow configuration looks correct', 'success');
  return true;
}

function checkOtherWorkflows() {
  log('🔍 Checking other workflow configurations...', 'info');
  
  const workflows = [
    { name: 'CI', path: '.github/workflows/ci.yml' },
    { name: 'VSCode Extension CI', path: '.github/workflows/vscode-extension-ci.yml' }
  ];
  
  let allValid = true;
  
  workflows.forEach(workflow => {
    if (!fs.existsSync(workflow.path)) {
      log(`❌ ${workflow.name} workflow not found`, 'error');
      allValid = false;
      return;
    }
    
    const content = fs.readFileSync(workflow.path, 'utf8');
    
    // Check for pull_request trigger
    if (!content.includes('pull_request:')) {
      log(`❌ ${workflow.name} should have pull_request trigger`, 'error');
      allValid = false;
      return;
    }
    
    log(`✅ ${workflow.name} configuration looks correct`, 'success');
  });
  
  return allValid;
}

function simulateWorkflowSequence() {
  log('🎯 Simulating workflow execution sequence...', 'info');
  
  log('1. 📝 PR created/updated → CI workflows start', 'info');
  log('2. ⏳ CI and VSCode Extension CI run in parallel', 'info');  
  log('3. ✅ Both workflows complete successfully', 'success');
  log('4. 🚀 PR Version Sync workflow triggers (workflow_run)', 'info');
  log('5. 🔍 Analyzes commits for version sync needs', 'info');
  log('6. 📝 Adds bump commit if needed (or skips)', 'info');
  log('7. ✅ All status checks complete → PR ready for merge', 'success');
  
  log('\n🎯 This ensures sequential execution and prevents race conditions!', 'success');
}

function provideBranchProtectionGuidance() {
  log('\n📋 Branch Protection Setup Reminder:', 'warning');
  log('Configure these required status checks in repository settings:', 'info');
  log('  ✅ build-and-test', 'info');
  log('  ✅ test-extension', 'info'); 
  log('  ✅ check-version-sync', 'info');
  log('\nPath: Settings → Branches → Add rule for master branch', 'info');
}

function main() {
  log('🧪 PR Workflow Validation Test', 'info');
  log('============================\n', 'info');
  
  let allValid = true;
  
  allValid &= checkWorkflowConfiguration();
  allValid &= checkOtherWorkflows();
  
  simulateWorkflowSequence();
  provideBranchProtectionGuidance();
  
  if (allValid) {
    log('\n🎉 All workflow configurations are valid!', 'success');
    log('The PR workflow should now wait for CI completion.', 'success');
  } else {
    log('\n❌ Some workflow configurations need fixing.', 'error');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}