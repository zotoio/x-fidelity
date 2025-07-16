const fs = require('fs');
const path = require('path');

console.log('=== Testing XFI_RESULT.json Reading ===');

try {
  const resultPath = path.join('../x-fidelity-fixtures/node-fullstack/.xfiResults/XFI_RESULT.json');
  console.log('📁 Checking file path:', resultPath);
  
    console.log('❌ XFI_RESULT.json file does not exist!');
    process.exit(1);
  }
  
  const content = fs.readFileSync(resultPath, 'utf8');
  const data = JSON.parse(content);
  
  console.log('✅ XFI_RESULT.json file exists and is valid JSON');
  console.log('📊 File size:', Math.round(content.length / 1024), 'KB');
  console.log('📋 Total issues found:', data.XFI_RESULT?.totalIssues || 'unknown');
  console.log('📁 Files analyzed:', data.XFI_RESULT?.fileCount || 'unknown');
  
  const issueCount = data.XFI_RESULT?.issueDetails?.length || 0;
  console.log('🔍 Issue details entries:', issueCount);
  
  if (issueCount > 0) {
    const firstIssue = data.XFI_RESULT.issueDetails[0];
    console.log('📝 First issue file:', firstIssue.filePath);
    console.log('⚠️  First issue errors:', firstIssue.errors?.length || 0);
  }
  
  console.log('✅ XFI_RESULT.json is properly structured and readable');
  
} catch (error) {
  console.error('❌ Error reading XFI_RESULT.json:', error.message);
  process.exit(1);
}
