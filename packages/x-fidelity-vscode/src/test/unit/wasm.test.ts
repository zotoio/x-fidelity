import * as assert from 'assert';
import * as vscode from 'vscode';
import { 
  initializeWasmTreeSitter, 
  isWasmTreeSitterReady, 
  getWasmStatus, 
  resetWasmTreeSitter,
  createParser,
  getJavaScriptLanguage,
  getTypeScriptLanguage,
  parseCode 
} from '../../utils/wasmAstUtils';
import { getExtensionContext } from '../../extension';

suite('Enhanced WASM Tree-sitter Tests', () => {
  let extensionContext: vscode.ExtensionContext;

  suiteSetup(async function() {
    this.timeout(60000); // Allow more time for WASM initialization
    
    console.log('🔧 Setting up WASM Tree-sitter test suite...');
    
    // Get the extension context
    const extension = vscode.extensions.getExtension('zotoio.x-fidelity-vscode');
    assert.ok(extension, 'Extension should be available');
    
    if (!extension.isActive) {
      console.log('📦 Activating extension...');
      await extension.activate();
    }
    
    extensionContext = getExtensionContext();
    assert.ok(extensionContext, 'Extension context should be available');
    
    console.log('✅ Extension context obtained successfully');
    
    // Reset WASM state before testing
    resetWasmTreeSitter();
    console.log('🔄 WASM state reset');
  });

  suite('WASM Initialization', () => {
    test('Should initialize WASM Tree-sitter successfully', async function() {
      this.timeout(30000); // 30 second timeout
      
      console.log('🚀 Testing WASM Tree-sitter initialization...');
      
      // Get initial status
      const initialStatus = getWasmStatus();
      console.log('📊 Initial WASM status:', initialStatus);
      
      // Verify initial state
      assert.strictEqual(initialStatus.isInitialized, false, 'Should not be initialized initially');
      assert.strictEqual(initialStatus.hasFailed, false, 'Should not have failed initially');
      assert.strictEqual(initialStatus.hasLanguages, false, 'Should not have languages initially');
      
      // Initialize WASM Tree-sitter
      try {
        console.log('🔄 Calling initializeWasmTreeSitter...');
        await initializeWasmTreeSitter(extensionContext);
        console.log('✅ WASM Tree-sitter initialization completed');
      } catch (error) {
        console.error('❌ WASM Tree-sitter initialization failed:', error);
        throw error;
      }
      
      // Check if ready
      const isReady = isWasmTreeSitterReady();
      console.log('🔍 WASM Tree-sitter ready:', isReady);
      
      // Get final status
      const finalStatus = getWasmStatus();
      console.log('📊 Final WASM status:', finalStatus);
      
      // Comprehensive assertions
      assert.strictEqual(isReady, true, 'WASM Tree-sitter should be ready after initialization');
      assert.strictEqual(finalStatus.isInitialized, true, 'Should be marked as initialized');
      assert.strictEqual(finalStatus.hasFailed, false, 'Should not have failed');
      assert.strictEqual(finalStatus.hasLanguages, true, 'Should have languages loaded');
      assert.strictEqual(finalStatus.hasParser, true, 'Should have parser available');
      assert.strictEqual(finalStatus.failureReason, undefined, 'Should not have failure reason');
    });

    test('Should handle re-initialization gracefully', async function() {
      this.timeout(10000);
      
      console.log('🔄 Testing WASM re-initialization...');
      
      // Ensure WASM is already initialized from previous test
      const initialReady = isWasmTreeSitterReady();
      assert.strictEqual(initialReady, true, 'WASM should already be initialized');
      
      // Try to initialize again
      await initializeWasmTreeSitter(extensionContext);
      
      // Should still be ready
      const stillReady = isWasmTreeSitterReady();
      assert.strictEqual(stillReady, true, 'WASM should still be ready after re-initialization');
    });

    test('Should provide accurate status information', function() {
      console.log('📊 Testing WASM status reporting...');
      
      const status = getWasmStatus();
      
      // Verify status properties exist and have correct types
      assert.ok(typeof status.isInitialized === 'boolean', 'isInitialized should be boolean');
      assert.ok(typeof status.hasFailed === 'boolean', 'hasFailed should be boolean');
      assert.ok(typeof status.hasLanguages === 'boolean', 'hasLanguages should be boolean');
      assert.ok(typeof status.hasParser === 'boolean', 'hasParser should be boolean');
      
      // Verify status consistency
      if (status.isInitialized) {
        assert.strictEqual(status.hasFailed, false, 'Initialized WASM should not have failed');
        assert.strictEqual(status.hasLanguages, true, 'Initialized WASM should have languages');
        assert.strictEqual(status.hasParser, true, 'Initialized WASM should have parser');
      }
    });
  });

  suite('Parser Functionality', () => {
    test('Should create parser instances', function() {
      console.log('🔨 Testing parser creation...');
      
      // Ensure WASM is ready
      const isReady = isWasmTreeSitterReady();
      assert.strictEqual(isReady, true, 'WASM should be ready for parser creation');
      
      // Create parser
      const parser = createParser();
      assert.ok(parser, 'Parser should be created successfully');
      
      console.log('✅ Parser created successfully');
    });

    test('Should provide language access', function() {
      console.log('🔤 Testing language access...');
      
      // Get JavaScript language
      const jsLanguage = getJavaScriptLanguage();
      assert.ok(jsLanguage, 'JavaScript language should be available');
      
      // Get TypeScript language
      const tsLanguage = getTypeScriptLanguage();
      assert.ok(tsLanguage, 'TypeScript language should be available');
      
      console.log('✅ Languages accessed successfully');
    });

    test('Should parse JavaScript code', async function() {
      this.timeout(10000);
      
      console.log('📝 Testing JavaScript code parsing...');
      
      const jsCode = `
        function helloWorld() {
          console.log("Hello, World!");
          return true;
        }
        
        const result = helloWorld();
      `;
      
      try {
        const tree = await parseCode(jsCode, 'javascript');
        assert.ok(tree, 'Parse tree should be generated');
        
        // Verify tree structure
        assert.ok(tree.rootNode, 'Tree should have root node');
        assert.ok(tree.rootNode.type, 'Root node should have type');
        
        console.log('✅ JavaScript parsing successful');
        console.log(`   Root node type: ${tree.rootNode.type}`);
        console.log(`   Child count: ${tree.rootNode.childCount}`);
        
      } catch (error) {
        console.error('❌ JavaScript parsing failed:', error);
        throw error;
      }
    });

    test('Should parse TypeScript code', async function() {
      this.timeout(10000);
      
      console.log('📝 Testing TypeScript code parsing...');
      
      const tsCode = `
        interface User {
          name: string;
          age: number;
        }
        
        function greetUser(user: User): string {
          return \`Hello, \${user.name}!\`;
        }
        
        const user: User = { name: "Alice", age: 30 };
        greetUser(user);
      `;
      
      try {
        const tree = await parseCode(tsCode, 'typescript');
        assert.ok(tree, 'Parse tree should be generated');
        
        // Verify tree structure
        assert.ok(tree.rootNode, 'Tree should have root node');
        assert.ok(tree.rootNode.type, 'Root node should have type');
        
        console.log('✅ TypeScript parsing successful');
        console.log(`   Root node type: ${tree.rootNode.type}`);
        console.log(`   Child count: ${tree.rootNode.childCount}`);
        
      } catch (error) {
        console.error('❌ TypeScript parsing failed:', error);
        throw error;
      }
    });

    test('Should handle complex code structures', async function() {
      this.timeout(15000);
      
      console.log('🏗️  Testing complex code structure parsing...');
      
      const complexCode = `
        import { Component } from 'react';
        
        interface Props {
          title: string;
          onClick?: () => void;
        }
        
        class MyComponent extends Component<Props> {
          private handleClick = () => {
            if (this.props.onClick) {
              this.props.onClick();
            }
          }
          
          render() {
            return (
              <div className="my-component">
                <h1>{this.props.title}</h1>
                <button onClick={this.handleClick}>
                  Click me
                </button>
              </div>
            );
          }
        }
        
        export default MyComponent;
      `;
      
      try {
        const tree = await parseCode(complexCode, 'typescript');
        assert.ok(tree, 'Parse tree should be generated for complex code');
        
        // Verify we can traverse the tree
        let nodeCount = 0;
        const countNodes = (node: any) => {
          nodeCount++;
          for (let i = 0; i < node.childCount; i++) {
            countNodes(node.child(i));
          }
        };
        
        countNodes(tree.rootNode);
        
        console.log('✅ Complex code parsing successful');
        console.log(`   Total nodes: ${nodeCount}`);
        assert.ok(nodeCount > 10, 'Complex code should generate many nodes');
        
      } catch (error) {
        console.error('❌ Complex code parsing failed:', error);
        throw error;
      }
    });
  });

  suite('Error Handling', () => {
    test('Should handle invalid code gracefully', async function() {
      this.timeout(10000);
      
      console.log('🚫 Testing invalid code handling...');
      
      const invalidCode = `
        function broken( {
          console.log("This is syntactically invalid"
          return;
        }
      `;
      
      try {
        const tree = await parseCode(invalidCode, 'javascript');
        
        // Tree should still be generated, but may contain error nodes
        assert.ok(tree, 'Parse tree should be generated even for invalid code');
        assert.ok(tree.rootNode, 'Tree should have root node');
        
        // Check if tree contains errors
        const hasErrors = tree.rootNode.hasError && tree.rootNode.hasError();
        console.log(`   Tree has errors: ${hasErrors}`);
        
        console.log('✅ Invalid code handled gracefully');
        
      } catch (error) {
        console.error('❌ Invalid code handling failed:', error);
        throw error;
      }
    });

    test('Should fail gracefully when WASM not ready', async function() {
      console.log('⚠️  Testing behavior when WASM not ready...');
      
      // Reset WASM to uninitialized state
      resetWasmTreeSitter();
      
      try {
        // Attempting to create parser should fail
        assert.throws(() => {
          createParser();
        }, /WASM Tree-sitter not ready/);
        
        // Attempting to get languages should fail
        assert.throws(() => {
          getJavaScriptLanguage();
        }, /JavaScript language not loaded/);
        
        assert.throws(() => {
          getTypeScriptLanguage();
        }, /TypeScript language not loaded/);
        
        // Attempting to parse code should fail
        try {
          await parseCode('const x = 1;', 'javascript');
          assert.fail('Should have thrown error');
        } catch (error) {
          assert.ok(error instanceof Error);
          assert.match(error.message, /WASM Tree-sitter not ready/);
        }
        
        console.log('✅ Graceful failure handling verified');
        
        // Re-initialize for subsequent tests
        await initializeWasmTreeSitter(extensionContext);
        
      } catch (error) {
        // Re-initialize even if test fails
        await initializeWasmTreeSitter(extensionContext);
        throw error;
      }
    });
  });

  suite('Performance', () => {
    test('Should parse code efficiently', async function() {
      this.timeout(10000);
      
      console.log('⚡ Testing parsing performance...');
      
      const mediumCode = `
        // Generate a medium-sized code sample
        ${Array(50).fill(0).map((_, i) => 
          `function func${i}(param${i}: string): number { return ${i}; }`
        ).join('\n')}
      `;
      
      const startTime = performance.now();
      
      const tree = await parseCode(mediumCode, 'typescript');
      
      const endTime = performance.now();
      const parseTime = endTime - startTime;
      
      assert.ok(tree, 'Parse tree should be generated');
      
      console.log(`✅ Parsing completed in ${parseTime.toFixed(2)}ms`);
      
      // Performance assertion (should parse in under 1 second)
      assert.ok(parseTime < 1000, `Parsing should be fast (was ${parseTime.toFixed(2)}ms)`);
    });

    test('Should handle memory efficiently', async function() {
      this.timeout(15000);
      
      console.log('💾 Testing memory efficiency...');
      
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Parse multiple code samples
      const promises = Array(10).fill(0).map(async (_, i) => {
        const code = `
          function test${i}() {
            const data = { value: ${i} };
            return data.value;
          }
        `;
        return parseCode(code, 'javascript');
      });
      
      const trees = await Promise.all(promises);
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      assert.strictEqual(trees.length, 10, 'All parsing operations should complete');
      
      console.log(`   Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
      
      // Memory increase should be reasonable (less than 50MB for this test)
      assert.ok(memoryIncrease < 50 * 1024 * 1024, 
        `Memory increase should be reasonable (was ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB)`);
    });
  });

  suiteTeardown(function() {
    console.log('🧹 Cleaning up WASM Tree-sitter test suite...');
    // Keep WASM initialized for other tests that might need it
  });
}); 