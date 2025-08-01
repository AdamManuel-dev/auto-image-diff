# Vibe Code Workflow

Execute a comprehensive development workflow based on the vibe coding methodology with built-in quality gates and recursive self-improvement.

## Workflow Overview

This command implements a complete development cycle:

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
4. Type checking (npm run type-check) → /fix-types if needed
5. Test generation & execution → /fix-tests if needed
6. Coverage check (>80%)
7. Lint check → /fix-lint if needed
8. Security scan (npm audit)
9. Performance check
10. Documentation update → /generate-docs
11. Pre-commit hooks
12. Commit with conventional message → /commit
13. Push to feature branch
14. Monitor CI pipeline
15. Create PR with full documentation
16. Code review cycle

### Phase 3: Final Push & Completion
1. Final comprehensive review → /review
2. Merge to main branch
3. Final push to main
4. Workflow completion with improvement notes

## Features
- Interactive execution with user confirmation at each step
- Colored output for better visibility
- Workflow logging to `.vibe-workflow.log`
- State tracking for resume capability
- Integration with existing Claude commands
- Quality gates prevent broken code from entering main
- Recursive improvement tracking

## Usage

```bash
/vibe-code-workflow
```

The workflow will guide you through each phase interactively, waiting for confirmation before proceeding to ensure:
- No broken code enters the main branch
- Consistent code quality across the team
- Early detection of issues
- Automated checks reduce manual review burden
- Documentation stays current with code changes
- Performance regressions are caught early
- Security vulnerabilities are identified
- Test coverage remains high

## Implementation

```bash
/Users/adammanuel/.claude/tools/vibe-code-workflow.sh
```