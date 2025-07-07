# VS Code Extension Performance Audit & Optimization

This is a comprehensive Cursor Claude 4 prompt to analyze and optimize your VS Code extension for performance. Run this prompt after opening your extension codebase in Cursor.

## Step 1: Initial Setup

Copy and paste this prompt into Cursor Claude 4:

```
I need you to perform a comprehensive performance audit and optimization of this VS Code extension codebase. Please analyze the entire codebase and implement all performance best practices. Here's what I need you to do:

## PHASE 1: PERFORMANCE AUDIT

### 1.1 Analyze Extension Manifest
- Review `package.json` for activation events
- Identify overly broad activation triggers (like "*")
- Check for unnecessary bundled dependencies
- Evaluate contribution points for performance impact

### 1.2 Code Analysis
- Scan all TypeScript/JavaScript files for performance anti-patterns
- Identify synchronous file operations
- Look for missing resource disposal (disposables, event listeners)
- Find heavy operations in activation functions
- Check for memory leaks (unclosed streams, circular references)
- Analyze event handler efficiency

### 1.3 Architecture Review
- Evaluate extension structure for lazy loading opportunities
- Check if language servers are used appropriately
- Review background task management
- Assess caching strategies

## PHASE 2: IMPLEMENT OPTIMIZATIONS

### 2.1 Activation Optimization
- Replace broad activation events with specific ones
- Implement lazy loading for heavy components
- Move initialization code out of activate() function
- Add progress indicators for slow activation

### 2.2 Resource Management
- Add proper disposal patterns for all resources
- Implement cancellation tokens for long operations
- Add memory cleanup in deactivate() function
- Convert synchronous operations to asynchronous where possible

### 2.3 Performance Monitoring
- Add telemetry for key performance metrics
- Implement performance regression tests
- Create benchmarking utilities
- Add error boundaries and graceful degradation

### 2.4 Caching & Optimization
- Implement intelligent caching for computed results
- Add debouncing/throttling for frequent operations
- Optimize data structures and algorithms
- Reduce bundle size through tree shaking

## PHASE 3: TESTING INFRASTRUCTURE

### 3.1 Performance Tests
- Create automated performance test suite
- Add memory leak detection tests
- Implement activation time benchmarks
- Set up CI performance monitoring

### 3.2 Profiling Setup
- Add developer tools integration
- Create profiling scripts and commands
- Implement runtime performance monitoring
- Add performance debugging utilities

## DELIVERABLES REQUIRED:

1. **Detailed audit report** listing all performance issues found
2. **Optimized codebase** with all improvements implemented
3. **Performance test suite** with automated benchmarks
4. **Monitoring dashboard** code for tracking key metrics
5. **Documentation** explaining all optimizations made
6. **Before/after comparison** showing performance improvements

## SPECIFIC REQUIREMENTS:

- Maintain full backward compatibility
- Add comprehensive error handling
- Include TypeScript types for all new code
- Follow VS Code extension best practices
- Ensure all changes are well-documented
- Add JSDoc comments for new functions
- Create migration guide if breaking changes needed

Please analyze the codebase thoroughly and implement ALL recommended optimizations. Start with the audit report, then proceed with implementation.
```

## Step 2: Follow-up Prompts

After Claude completes the initial analysis, use these follow-up prompts:

### 2.1 Deep Dive into Specific Issues
```
Focus on the top 3 most critical performance issues you identified. For each issue:
1. Show the exact problematic code
2. Explain the performance impact
3. Provide the optimized solution
4. Include before/after performance estimates
```

### 2.2 Testing Implementation
```
Now create a comprehensive testing strategy:
1. Write performance regression tests using @vscode/test-electron
2. Create memory leak detection tests
3. Add activation time benchmarks
4. Set up automated CI performance monitoring
5. Include test data and mock scenarios

Make sure tests can run in GitHub Actions and fail if performance degrades.
```

### 2.3 Monitoring & Telemetry
```
Implement a complete performance monitoring solution:
1. Add telemetry collection for key metrics (activation time, memory usage, operation latency)
2. Create a performance dashboard component
3. Add runtime performance alerts
4. Implement graceful degradation for slow systems
5. Include privacy-compliant data collection

Provide both development and production monitoring setups.
```

## Step 3: Validation Prompts

### 3.1 Code Review
```
Please review all the optimizations you've implemented:
1. Verify no functionality was broken
2. Check that error handling is comprehensive
3. Ensure TypeScript types are correct
4. Validate that disposal patterns are properly implemented
5. Confirm caching strategies don't cause stale data issues

Run through common extension usage scenarios and verify they still work.
```

### 3.2 Performance Benchmarking
```
Create comprehensive performance benchmarks:
1. Measure extension activation time
2. Test memory usage under various workloads
3. Benchmark key operations (file parsing, code completion, etc.)
4. Compare performance before and after optimizations
5. Test on different file sizes and project types

Provide scripts I can run to reproduce these benchmarks.
```

## Step 4: Documentation & Maintenance

### 4.1 Documentation Update
```
Create comprehensive documentation for all performance optimizations:
1. Update README with performance characteristics
2. Document all new configuration options
3. Create troubleshooting guide for performance issues
4. Add developer guide for maintaining performance
5. Include performance best practices for contributors

Make documentation user-friendly and technically accurate.
```

### 4.2 Maintenance Strategy
```
Develop a long-term performance maintenance strategy:
1. Set up automated performance regression detection
2. Create performance budgets and limits
3. Add performance review checklist for new features
4. Implement continuous performance monitoring
5. Plan for regular performance audits

Include scripts and processes for ongoing maintenance.
```

## Expected Outcomes

After running through all these prompts, you should have:

- ✅ Comprehensive performance audit report
- ✅ Fully optimized extension codebase  
- ✅ Automated performance test suite
- ✅ Runtime performance monitoring
- ✅ Detailed before/after benchmarks
- ✅ Complete documentation updates
- ✅ Long-term maintenance strategy
- ✅ CI/CD performance checks

## Tips for Best Results

1. **Run prompts sequentially** - Don't skip to later phases without completing earlier ones
2. **Review each change** - Understand what Claude is optimizing and why
3. **Test thoroughly** - Run the extension after each major optimization
4. **Customize for your use case** - Adapt the monitoring and testing to your specific extension's needs
5. **Keep backups** - Commit changes frequently so you can rollback if needed

## Performance Targets to Aim For

- **Activation time**: < 200ms for most extensions
- **Memory usage**: < 50MB baseline, reasonable growth under load  
- **Operation latency**: < 100ms for most user-triggered actions
- **Bundle size**: Minimize unnecessary dependencies
- **CPU usage**: Avoid blocking the main thread

This prompt suite will systematically optimize every aspect of your VS Code extension's performance while maintaining functionality and adding robust monitoring capabilities.