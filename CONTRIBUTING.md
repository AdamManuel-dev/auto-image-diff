# Contributing to auto-image-diff

## Commit Message Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automated versioning and changelog generation.

### Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: A new feature (triggers minor version bump)
- **fix**: A bug fix (triggers patch version bump)
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools and libraries

### Breaking Changes

Add `BREAKING CHANGE:` in the commit footer or `!` after the type to trigger a major version bump:

```
feat!: remove deprecated API methods

BREAKING CHANGE: The deprecated methods `oldMethod()` and `anotherOldMethod()` have been removed.
```

### Examples

```
feat: add CSS fix suggestion feature
fix: resolve image alignment issues with rotated images
docs: update API documentation with new examples
perf: optimize batch processing for large image sets
feat(classifier): add new edge detection algorithm
fix(batch): handle empty directory gracefully
```

## Automated Releases

This project uses [semantic-release](https://github.com/semantic-release/semantic-release) for automated versioning and publishing:

- **Patch releases** (1.0.X) for bug fixes
- **Minor releases** (1.X.0) for new features
- **Major releases** (X.0.0) for breaking changes

Releases are automatically created when commits are pushed to the `main` branch, based on the conventional commits since the last release.

## Development Workflow

1. Create a feature branch from `main`
2. Make your changes using conventional commit messages
3. Run tests: `npm test`
4. Run linting: `npm run lint`
5. Submit a pull request to `main`
6. After review and merge, the release will be automated

## Testing Releases Locally

You can test what version would be released without actually releasing:

```bash
npm run release:dry-run
```

This will show you:

- What version would be bumped to
- What changelog entries would be generated
- Whether the release would be published
