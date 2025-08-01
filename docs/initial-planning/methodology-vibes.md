# How I vibe coded this, and why?

1. I used deep research/opus to help breakdown the tooling I wanted to build, and research the most effect options for what I need. 
2. I turned that into a basic PRD document (not present).
3. I turned that into the task-list.md
4. I turned that into the detailed-task-list.md, where dependencies for each task was taken into account
5. I turned that into the critical-success-tasks.md where I had claude focus on the tasks that are critical for the success of the project. Failure here could lead to downstream effects where the entire project fails. 
6. I used all of those to create a more accurate PRD imagediff-prd-detailed.md
7. I used all current notes to create the README.md
8. I then had claude create some documentation of the use-case this is being built for in figma-website-refinement-guide.md
9. I finally used opus to create a TODO.md that is used by my current vibe coding architecture to track the basic task management.

10. Use at work to create a recursive self-improvement system to increase throughput and quality of the code from vibe coding.


## Process

### This workflow ensures:

No broken code enters the main branch
Consistent code quality across the team
Early detection of issues
Automated checks reduce manual review burden
Documentation stays current with code changes
Performance regressions are caught early
Security vulnerabilities are identified
Test coverage remains high

> The cyclical nature ensures developers can't proceed until quality standards are met, dramatically reducing the need for large refactoring efforts later. RetryClaude can make mistakes. Please double-check responses.


```mermaid
graph TB
    Start([Start New Task]) --> PickTask[Pick Task from DAG]
    PickTask --> CheckDeps{Dependencies<br/>Complete?}
    CheckDeps -->|No| WaitDeps[Wait/Help with<br/>Dependencies]
    WaitDeps --> CheckDeps
    CheckDeps -->|Yes| DesignFirst[Design & Plan<br/>Implementation]
    
    DesignFirst --> InitialCoding[Initial Coding<br/>Implementation]
    
    InitialCoding --> TypeCheck{Type Check<br/>npm run type-check}
    TypeCheck -->|❌ Errors| FixTypes[Fix Type Errors]
    FixTypes --> TypeCheck
    TypeCheck -->|✅ Pass| TestGen[Generate/Update Tests<br/>- Unit Tests<br/>- Integration Tests]
    
    TestGen --> RunTests{Run Tests<br/>npm test}
    RunTests -->|❌ Fail| FixCode[Fix Implementation<br/>or Tests]
    FixCode --> TypeCheck
    RunTests -->|✅ Pass| Coverage{Coverage Check<br/>>80%?}
    Coverage -->|❌ Low| AddTests[Add More Tests]
    AddTests --> RunTests
    Coverage -->|✅ Good| Lint{Lint Check<br/>npm run lint}
    
    Lint -->|❌ Issues| FixLint[Fix Lint Issues<br/>- Style<br/>- Best Practices]
    FixLint --> TypeCheck
    Lint -->|✅ Pass| SecurityCheck{Security Scan<br/>npm audit}
    
    SecurityCheck -->|❌ Vulnerabilities| FixSecurity[Address Security<br/>Issues]
    FixSecurity --> TypeCheck
    SecurityCheck -->|✅ Pass| PerfCheck{Performance<br/>Check}
    
    PerfCheck -->|❌ Regression| OptimizeCode[Optimize<br/>Performance]
    OptimizeCode --> TypeCheck
    PerfCheck -->|✅ Pass| DocCheck{Documentation<br/>Updated?}
    
    DocCheck -->|❌ Missing| UpdateDocs[Update Docs<br/>- Code Comments<br/>- API Docs<br/>- README]
    UpdateDocs --> PreCommit
    DocCheck -->|✅ Complete| PreCommit[Pre-commit Hooks<br/>- Format<br/>- Lint<br/>- Test]
    
    PreCommit --> CommitMsg{Commit Message<br/>Follows Convention?}
    CommitMsg -->|❌ Invalid| FixCommit[Fix Commit Message<br/>feat/fix/chore/docs]
    FixCommit --> CommitMsg
    CommitMsg -->|✅ Valid| Push[Git Push to<br/>Feature Branch]
    
    Push --> CI{CI Pipeline<br/>Passes?}
    CI -->|❌ Fail| ReviewCI[Review CI Logs<br/>Fix Issues]
    ReviewCI --> TypeCheck
    CI -->|✅ Pass| PRReady{PR Ready?<br/>- Description<br/>- Screenshots<br/>- Breaking Changes}
    
    PRReady -->|❌ Incomplete| CompletePR[Complete PR<br/>Requirements]
    CompletePR --> PRReady
    PRReady -->|✅ Ready| CreatePR[Create Pull Request]
    
    CreatePR --> CodeReview{Code Review<br/>Approved?}
    CodeReview -->|❌ Changes Requested| AddressReview[Address Review<br/>Comments]
    AddressReview --> TypeCheck
    CodeReview -->|✅ Approved| Merge[Merge to Main]
    
    Merge --> UpdateLocal[Update Local Main<br/>git pull origin main]
    UpdateLocal --> TaskComplete{Task Complete<br/>Update DAG}
    TaskComplete --> Start
    
    style Start fill:#90EE90
    style TypeCheck fill:#FFE4B5
    style RunTests fill:#FFE4B5
    style Coverage fill:#FFE4B5
    style Lint fill:#FFE4B5
    style SecurityCheck fill:#FFE4B5
    style PerfCheck fill:#FFE4B5
    style CI fill:#FFE4B5
    style CodeReview fill:#FFE4B5
    style Merge fill:#90EE90
    style TaskComplete fill:#90EE90
```