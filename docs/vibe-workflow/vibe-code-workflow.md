# Vibe Code Workflow

Execute a comprehensive development workflow based on the vibe coding methodology with enforced quality gates that prevent broken code from being committed or pushed.

## Key Features

✅ **Quality Gates**: Enforces passing tests, type checks, and lint checks before allowing commits or pushes
🚦 **Pre-Commit Validation**: Blocks commits if quality checks fail
🚀 **Pre-Push Validation**: Re-runs all checks before pushing to ensure code quality
🔧 **Auto-Fix Integration**: Offers to run fix commands when checks fail

## Workflow Overview

This command implements a complete development cycle with quality enforcement:

### Phase 1: Research & Planning

1. Deep research using Claude/Opus to analyze tooling needs
2. Create basic PRD document
3. Transform PRD → task-list.md
4. Enhance with dependencies → detailed-task-list.md
5. Extract critical-success-tasks.md (failure points)
6. Synthesize → imagediff-prd-detailed.md
7. Generate README.md from all notes
8. Create use-case documentation (e.g., figma-website-refinement-guide.md)
9. Generate TODO.md for vibe coding architecture

### Phase 2: Development Cycle (Repeating)

For each task in TODO/DAG:

1. Pick task and verify dependencies
2. Design & plan implementation
3. Initial coding
4. **Preliminary quality check** (informational only)
5. **Pre-commit validation** (BLOCKING):
   - Type checking (npm run typecheck/type-check)
   - Test execution (npm test)
   - Lint check (npm run lint)
   - ❌ If any fail → Commit blocked
   - ✅ If all pass → Commit allowed
6. Offers auto-fix options if checks fail:
   - Lint auto-fix
   - /fix-types integration
   - /fix-tests integration
7. Commit with message (only if quality gate passes)
8. Continue with next task or proceed to push

### Phase 3: Final Push & Completion

1. **Pre-push validation** (BLOCKING):
   - Re-runs all quality checks
   - Type checking, tests, and lint must all pass
   - ❌ If any fail → Push blocked
   - ✅ If all pass → Push allowed
2. Push to feature branch (only if quality gate passes)
3. Create PR with documentation
4. Workflow completion with quality metrics

### Phase 4: Documentation & TODO Update

1. Update TODO.md with completed tasks and new items discovered
2. Create documentation in /docs/{section.subsection}/ folder:
   - Implementation notes and decisions
   - Lessons learned and improvement suggestions
   - Architecture diagrams if applicable
   - API documentation for new features
3. Update project README with new features/changes
4. Archive workflow log to /docs/{section.subsection}/workflow-log.md

## Features

- **Enforced Quality Gates**: Commits and pushes are blocked if tests/types/lint fail
- **Pre-Commit Validation**: Runs all checks before allowing commits
- **Pre-Push Validation**: Re-runs all checks before pushing to ensure quality
- **Auto-Fix Integration**: Offers to run fix commands when checks fail
- Interactive execution with user confirmation at each step
- Colored output for better visibility
- Workflow logging to `.vibe-workflow.log`
- State tracking for resume capability
- Integration with existing Claude commands (/fix-types, /fix-tests)
- Quality metrics tracking in documentation

## Usage

```bash
/vibe-code-workflow
```

The workflow will guide you through each phase interactively, enforcing quality at critical points:

### Quality Enforcement Points:

1. **Before Commit**: All tests, type checks, and lint must pass
2. **Before Push**: Re-validates all checks to ensure nothing broke
3. **Auto-Fix Support**: Offers to run fix commands when checks fail

### Benefits:

- ✅ No broken code enters the repository
- ✅ Consistent code quality across the team
- ✅ Early detection and blocking of issues
- ✅ Automated enforcement reduces manual review burden
- ✅ Documentation includes quality metrics
- ✅ Developers learn to fix issues before committing

## Implementation

```bash
/Users/adammanuel/.claude/tools/vibe-code-workflow.sh
```
