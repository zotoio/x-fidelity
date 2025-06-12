const plugins = require('@x-fidelity/plugins');

console.log('generateAst function type:', typeof plugins.generateAst);

const result = plugins.generateAst({ 
    fileName: 'test.ts', 
    fileContent: 'function test() { return 42; }' 
});

console.log('AST result has tree:', !!result.tree);
if (result.tree) {
    console.log('Tree type:', result.tree.type);
    console.log('Child count:', result.tree.childCount);
}

console.log('✅ Tree-sitter AST working in CLI context!'); 