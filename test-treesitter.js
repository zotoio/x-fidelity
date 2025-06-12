const { generateAst } = require('./dist/baseUtils/astUtils.js');

const result = generateAst({ 
    fileName: 'test.ts', 
    fileContent: 'function hello() { return "world"; }' 
});

console.log('Tree-sitter AST generated:', !!result.tree);
if (result.tree) {
    console.log('Root node type:', result.tree.type);
    console.log('Child count:', result.tree.childCount);
    console.log('First child type:', result.tree.children[0]?.type);
} 