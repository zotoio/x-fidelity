X-Fidelity VS Code Extension Architecture (Context)
The X-Fidelity VS Code extension (xfi-vscode) is architected to run analysis in-process, using the built-in plugins (xfi-plugins) and shared types (xfi-types) rather than invoking any external CLI. It features an Extension Manager and Analysis Manager that handle workspace analysis workflows. These managers load the project configuration and rules, then invoke the AST and other plugins to scan files. The results come back as a structured XFI_RESULT object (defined in xfi-types) containing the repository config and a list of ScanResult items (each with file path and issues). The extension then reads these results and turns them into VS Code diagnostics (no CLI fallback is used).
Tree-sitter Integration (WASM/Node)
For JavaScript/TypeScript AST analysis, the extension embeds Tree-sitter grammars. At runtime it first attempts to load the native tree-sitter Node module and corresponding languages. If the native modules are unavailable, it falls back to web-tree-sitter (WASM). In either case the extension initializes the parser once (a singleton) during activation. For example, when using the web-tree-sitter variant, the code calls Parser.init() to load the tree-sitter.wasm binary from the extension’s dist directory, then loads the JavaScript and TypeScript grammars via Language.load('/path/to/tree-sitter-javascript.wasm'), and finally parses source text with parser.parse(sourceCode). The resulting syntax tree’s nodes include startPosition and endPosition fields (with row/column coordinates)
npmjs.com
npmjs.com
. These positions are used to compute exact code ranges for each issue.
Issue Detail Range Enrichment
Each detected issue (a rule violation) is reported with full range information. In the XFI_RESULT, each ScanResult contains an array of RuleFailure objects, and each RuleFailure.details includes line, column, endLine, and endColumn fields (derived from the Tree-sitter node’s startPosition/endPosition). The VS Code extension uses these to create precise diagnostics. For example, given an issue with (startLine, startColumn) and (endLine, endColumn), the code constructs a range like:
ts
Copy
Edit
const range = new vscode.Range(startLine-1, startColumn, endLine-1, endColumn);
const diag  = new vscode.Diagnostic(range, message, severity);
This diagnostic is then added to the editor’s diagnostic collection
code.visualstudio.com
. The full-range diagnostics appear in the Problems panel, allowing users to click and navigate directly to the issue span in code
code.visualstudio.com
.
XFI_RESULT Shape and Consumption
The analysis result object (XFI_RESULT) has a known shape (from xfi-types). It includes the resolved archetype configuration plus fields like issueDetails: ScanResult[] and telemetry/stats. The extension iterates over each ScanResult (per-file), and for each RuleFailure inside, it reads the message, severity, and newly available range fields. It then generates a corresponding vscode.Diagnostic. In practice, after building the list of diagnostics, the extension calls something like diagnosticCollection.set(vscode.Uri.file(filePath), diagnostics) to publish them
code.visualstudio.com
. This integration of diagnostics is a core part of the extension (the Diagnostic Provider hooks into VSCode).
Bundling and WASM Asset Inclusion
The VS Code extension uses esbuild to bundle all source files into a single dist/extension.js (as recommended for extensions
code.visualstudio.com
). The build process also copies Tree-sitter WASM files (e.g. tree-sitter.wasm, tree-sitter-javascript.wasm, tree-sitter-typescript.wasm) from the node_modules into the extension’s dist folder. At runtime, the extension uses extensionContext.extensionPath + '/dist/tree-sitter.wasm' (or similar) to locate these assets. This ensures that the embedded Tree-sitter can find its WASM grammar files after bundling.
Removal of CLI Fallback Logic
All legacy CLI-fallback code has been removed from the extension. In particular, functions like registerFallbackCommands, handleInitializationError, and shouldUseFallbackMode in extension.ts are eliminated, and any xfidelity.fallback.* commands or activation events in package.json are dropped. The extension now always performs analysis in-process with the plugins; there is no path that launches an external CLI process. Corresponding tests and mocks for fallback mode are also removed or updated to reflect this change.
Implementation Instructions (Prompt)
Embed and Initialize Tree-sitter
 Install and import Tree-sitter: Add web-tree-sitter (and/or tree-sitter, tree-sitter-javascript, tree-sitter-typescript) to the extension’s package.json dependencies.
 Initialize parser on activation: In extension.ts (or a utility file), call an initialization function (e.g. initializeWasmTreeSitter(context)) during the extension activation event. Ensure this runs only once (singleton) and handles failures gracefully.
 Load language grammars: After Parser.init() succeeds, load the JavaScript and TypeScript grammars via await Parser.Language.load(jsWasmPath) and await Parser.Language.load(tsWasmPath), then call parser.setLanguage(...) accordingly. Cache the ParserClass and loaded languages for reuse.
Refactor AST Plugin to Output Full Ranges
 Capture node positions: In the AST plugin code (under xfi-plugins), where rule violations are detected, use the Tree-sitter node’s positions. For a node node, read node.startPosition.row/column and node.endPosition.row/column.
 Populate IssueDetail/RuleFailure: Modify the code that creates each issue detail so it assigns these to the output. For example, set details.startLine = node.startPosition.row; details.startColumn = node.startPosition.column; details.endLine = node.endPosition.row; details.endColumn = node.endPosition.column;. Ensure these fields are included in the IssueDetail or RuleFailure object that the plugin returns.
Extend xfi-types for Full Range Fields
 Update types: In packages/x-fidelity-types/src/core.ts, extend the RuleFailure.details (or IssueDetail) interface to include the new fields: startLine: number, startColumn: number, endLine: number, endColumn: number. If IssueDetail is an alias, locate the underlying type (ScanResult/RuleFailure) and add fields.
 Rebuild and version bump: Re-run the build for x-fidelity-types and update its version. Adjust any tests that expect the old type shape.
Refactor VS Code Extension to Use Full Ranges
 Consume new fields: In the diagnostic conversion logic (e.g. in diagnosticProvider.ts or analysisManager.ts), read the new startLine, startColumn, endLine, endColumn from each issue.
 Create full-range vscode.Range: For each issue, construct the range with new vscode.Range(startLine - 1, startColumn, endLine - 1, endColumn). (Remember VSCode is 0-indexed for lines.)
 Create diagnostics: Instantiate new vscode.Diagnostic(range, issue.details.message, issue.level) (or similar). Set the code and code.description if you want clickable documentation links.
 Publish diagnostics: Add each diagnostic to a map keyed by file URI, then call diagnosticCollection.set(uri, diagnosticsArray) so they appear in the Problems panel.
Remove CLI Fallback Logic
 Delete fallback code: Remove any code related to CLI fallback mode from extension.ts (like shouldUseFallbackMode, registerFallbackCommands, handleInitializationError).
 Remove fallback commands: In package.json, delete any commands or activation events prefixed with xfidelity.fallback..
 Update tests: Remove or revise any extension tests that were checking fallback behavior. Ensure all tests assume the integrated mode only.
Bundle Tree-sitter WASM Assets
 Copy WASM in build: In the extension’s build script (esbuild.js or similar), add logic to copy node_modules/web-tree-sitter/tree-sitter.wasm into dist/tree-sitter.wasm. Also copy node_modules/tree-sitter-typescript/tree-sitter-typescript.wasm (and .js for other languages) as needed.
 Adjust paths: Verify that initializeWasmTreeSitter or its fallback logic uses the correct paths (e.g. using extensionContext.extensionPath + '/dist/tree-sitter.wasm'). Test in a packaged extension (use vsce package) to ensure the WASM loads in production.
Testing and Validation
 Unit tests: Add unit tests for the AST plugin(s) to assert that IssueDetail objects now include the correct startLine/startColumn/endLine/endColumn for sample code.
 Extension integration test: Use the existing test workspace fixture (packages/x-fidelity-fixtures/node-fullstack) and run the full analysis. Verify that diagnostics appear at the correct ranges in a sample file.
 Remove fallback mocks: Ensure any existing tests for fallback mode are removed or updated. All tests should now expect the integrated analysis (no CLI) path.
 Lint and format: Run the linter and formatter on all changed files to ensure code quality.