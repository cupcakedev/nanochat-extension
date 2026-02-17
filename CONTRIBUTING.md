# Contributing

Thanks for contributing to NanoChat.

## Before You Start

- Read [README.md](./README.md)
- Search existing issues and pull requests to avoid duplicate work

## Local Setup

```bash
npm ci
npm run lint
npm run build
```

## Workflow

1. Fork and create a feature branch from `main`.
2. Keep changes scoped to one concern per pull request.
3. Update documentation when behavior or architecture changes.
4. Run quality checks before opening a PR.

## Quality Checks

```bash
npm run lint
npm run format:check
npm run build
```

## Architecture Expectations

- Respect context boundaries (`app`, `content`, `background`, `shared`).
- Do not move browser-specific logic into `shared` unless it is truly cross-context.
- Prefer small composable services over monolithic files.

## Pull Request Checklist

- [ ] Lint/build pass locally
- [ ] Formatting is clean
- [ ] Docs updated (if applicable)
- [ ] Breaking changes are called out
- [ ] New behavior includes tests when possible

## Commit Messages

Use clear, imperative commit messages (for example: `refactor: centralize prompt model options`).

## Questions

If you are unsure about architecture decisions, open a discussion in an issue before large refactors.
