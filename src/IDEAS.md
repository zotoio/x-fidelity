# Innovative Check Types for Codebase Standardization

## aider.chat Claude 3.7 Sonnet Prompt

```bash
/architect what are some other unusual check types we could add that are not 
covered by linting, security, sonarqube or similar tools. Remember the goal 
is to encourage teams to follow patterns that simplify codebases from internal 
company SDKs frameworks, with important rules enforced. Have a think about 
50 examples that are both simple to understand, and help improve productivity. 
Use an innovative mindset and consider react microfrontends using GraphQL 
as well as microservices using GraphQL and others using standard REST.
```

## Response: 50 Innovative Check Types

These innovative check types could be added to the X-Fidelity tool to encourage teams to follow patterns that simplify codebases and improve productivity. These go beyond what typical linting, security, or SonarQube tools cover.

### Frontend Architecture Patterns

1. **Component Reuse Ratio** - Measure the reuse of React components across the codebase to encourage shared component libraries.
2. **Microfrontend Boundary Violations** - Detect when one microfrontend directly imports from another instead of using defined contracts.
3. **GraphQL Fragment Consistency** - Ensure GraphQL fragments follow naming conventions and are reused appropriately.
4. **Component Prop Explosion** - Flag React components with too many props that should be refactored into smaller components.
5. **State Management Consistency** - Ensure consistent state management patterns (Redux, Context API, etc.) within a microfrontend.
6. **CSS-in-JS Pattern Adherence** - Verify that styling follows the team's chosen CSS-in-JS approach consistently.
7. **Component Documentation Coverage** - Check that all shared components have proper documentation and examples.
8. **Microfrontend Shell Integration** - Verify that microfrontends properly register with the application shell.
9. **Feature Flag Implementation** - Ensure feature flags follow the company's standard implementation pattern.
10. **A11y Pattern Compliance** - Check that custom UI components implement the team's accessibility patterns correctly.

### Backend Architecture Patterns

11. **Microservice Boundary Enforcement** - Detect when services directly access another service's database instead of using APIs.
12. **API Version Consistency** - Ensure all endpoints follow the company's versioning strategy.
13. **GraphQL Resolver Structure** - Verify GraphQL resolvers follow the team's architectural patterns.
14. **Circuit Breaker Implementation** - Check that external service calls implement circuit breakers according to standards.
15. **Idempotency Pattern Usage** - Ensure critical endpoints implement proper idempotency patterns.
16. **Pagination Standard Adherence** - Verify that list endpoints follow the company's pagination standards.
17. **Error Response Format Consistency** - Check that error responses follow the company's standardized format.
18. **Service Discovery Registration** - Ensure services properly register with the service discovery mechanism.
19. **Database Transaction Pattern** - Verify that database transactions follow the team's patterns for consistency.
20. **Async Processing Pattern** - Check that async operations follow the company's queue/event processing patterns.

### Cross-Cutting Concerns

21. **Logging Context Propagation** - Ensure request context is properly propagated in logs across service boundaries.
22. **Distributed Tracing Integration** - Verify that services properly integrate with the distributed tracing system.
23. **Metric Naming Convention** - Check that metrics follow the company's naming conventions for easier dashboarding.
24. **Health Check Implementation** - Ensure services implement standardized health check endpoints.
25. **Configuration Management** - Verify services use the company's standard configuration management approach.
26. **Graceful Shutdown Implementation** - Check that services implement proper graceful shutdown procedures.
27. **Retry Policy Consistency** - Ensure retry policies follow company standards for external service calls.
28. **Cache Usage Patterns** - Verify that caching follows the team's established patterns.
29. **Dependency Injection Pattern** - Check that services follow the company's dependency injection approach.
30. **Feature Toggle Framework Usage** - Ensure the standard feature toggle framework is used consistently.

### Development Workflow

31. **Branch Naming Convention** - Verify branch names follow the team's convention for easier automation.
32. **Commit Message Format** - Check that commit messages follow the company's format for better release notes.
33. **PR Size Limits** - Flag PRs that exceed the team's guidelines for reviewable code size.
34. **Test Coverage Distribution** - Ensure test coverage is distributed appropriately (not just in easy-to-test areas).
35. **Test Fixture Standardization** - Verify test fixtures follow the team's patterns for consistency.
36. **API Contract Test Coverage** - Check that all API contracts have corresponding contract tests.
37. **Documentation Update Verification** - Ensure code changes that affect public APIs also update documentation.
38. **Breaking Change Detection** - Flag changes that would break existing clients according to team standards.
39. **Dependency Update Frequency** - Check that dependencies are updated according to the team's schedule.
40. **Code Ownership Adherence** - Verify that changes respect the team's code ownership boundaries.

### Company-Specific SDK Usage

41. **Internal SDK Version Compliance** - Ensure teams use the approved versions of internal SDKs.
42. **SDK Feature Adoption** - Check that teams are using new SDK features rather than maintaining legacy implementations.
43. **SDK Configuration Standardization** - Verify that SDK configuration follows company standards.
44. **SDK Extension Pattern** - Ensure extensions to SDKs follow the approved patterns.
45. **SDK Authentication Pattern** - Check that authentication with internal services uses the company's SDK patterns.
46. **SDK Initialization Order** - Verify that SDKs are initialized in the correct order according to dependencies.
47. **SDK Event Handling Pattern** - Ensure event handling with SDKs follows the company's patterns.
48. **SDK Logging Integration** - Check that SDK logging is properly integrated with the application's logging.
49. **SDK Error Handling Pattern** - Verify that SDK errors are handled according to company standards.
50. **SDK Resource Cleanup** - Ensure resources from SDKs are properly cleaned up when no longer needed.

> Each of these checks could be implemented as a rule in the X-Fidelity tool to encourage teams to follow patterns that simplify codebases and improve productivity. The focus is on architectural patterns and company-specific standards rather than general code quality issues that would be caught by traditional tools.
