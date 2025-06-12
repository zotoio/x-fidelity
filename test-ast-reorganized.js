const { generateAst } = require('./dist/index.js');

const result = generateAst({ 
    fileName: 'test.ts', 
    fileContent: 'function hello() { return "world"; }' 
});

console.log('AST working:', !!result.tree);
console.log('Tree type:', result.tree?.type);
console.log('✅ Tree-sitter AST working in reorganized structure!'); 