---
crux: true
description: 
globs: 
alwaysApply: true
---
# Important guidance

## 0. after large changes, before I give you another prompt, ask me to confirm whether I want you commit changes.  If i agree, create a conventional commit message based on the changes, and perform the commit.

## 1. ask for clarification if you are unsure about a given change or its implications, but not for simple changes.

## 2. never modify the files below the 'temp' dir, they are for reference only, and should only be part of context if specifically instructed.

## 3. use yarn instead of npm for commmands

## 4. after any significant changes are made, ensure that unit tests across all packages work using `yarn test` from the workspace root as part concluding a prompt response before handing over to me for the next prompt. each new change should increase overall unit test coverage in meaningful ways - if the feature worked on already has high direct coverage, add tests for an adjacent or related  feature to ensure continuous improvement in coverage over time.

## 5. If the unit tests fail, ensure that they are fixed without changing the tests or if the implementation has changed in a way that requires test updates, ensure that test updates are meaningful and worthwhile, and that any test changes related to existing code that has been updated is checked, as it may indicate that the implementation update is broken, and not the test.

## 6. When making changes, ensure that the README.md and also the website is updated accordingly, including removal of any content that is no longer relevant.

## 7. before adding new files or functions, ensure that they are not duplications of existing equivalents.  instead the existing functions should be updated.

## 8. do not leave temporary scripts and files created during execution of tools to analyse and fix issues scattered around the codebase.  move them to a 'temp' dir inside the repo.

## 9. vscode testing
when changes are made that impact the vscode extension, ensure that any integration tests that execute to check the change are targeted rather than executing all of the integration test suites.

## 10. during builds, if you see any linting errors, fix them.

