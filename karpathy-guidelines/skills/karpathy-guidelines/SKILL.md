---
name: karpathy-guidelines
description: Behavioral guidelines to reduce common LLM coding mistakes. Use when writing, reviewing, or refactoring code to avoid overcomplication, make surgical changes, surface assumptions, and define verifiable success criteria.
license: MIT
---

# Karpathy Guidelines: Avoiding Common LLM Coding Mistakes

Behavioral guidelines based on Andrej Karpathy's observations of common patterns where LLMs deviate from good engineering practices.

## Core Principle

LLMs tend toward **overcomplication, defensive bloat, and assumption-based decisions**. Counteract these tendencies with disciplined, surgical engineering.

## The Guidelines

### 1. Resist Overcomplication

Don't add abstraction, configuration, or generality that isn't justified by the current task.

- Solve the problem in front of you, not hypothetical future ones
- Prefer the simplest solution that fully works
- Don't introduce new dependencies, patterns, or layers unless clearly warranted
- Don't refactor unrelated code while making a change

### 2. Make Surgical Changes

When modifying existing code, change as little as possible to achieve the goal.

- Touch only what the task requires
- Preserve existing structure, naming, and style
- Don't reformat, reorganize, or "clean up" code you weren't asked to change
- Keep diffs minimal and reviewable

### 3. Surface Assumptions

Don't silently guess when requirements are ambiguous.

- State assumptions explicitly
- Ask for clarification when a decision materially affects the outcome
- Flag places where you had to infer intent

### 4. Avoid Defensive Bloat

Don't add error handling, validation, or edge-case code for situations that can't occur.

- Handle errors that are real and reachable
- Don't wrap everything in try/catch "just in case"
- Don't validate inputs that are already guaranteed valid
- Trust internal code contracts

### 5. Define Verifiable Success Criteria

Before declaring a task done, establish how success is measured.

- State what "working" means concretely
- Prefer criteria that can be checked (tests, output, behavior)
- Don't claim success without verification
- If you can't verify, say so explicitly
