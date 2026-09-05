# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository

Single-package repository providing **utilities for writing tests with Playwright**. Published as `@cronn/playwright-utils`. The package lives at the repository root; the VitePress documentation site lives in `docs/`.

## Tooling

- Always use Turborepo to run tasks including dependencies
- Build: `tsdown` (ESM-only, `publint` and `attw` checks run as part of the build)
- Lint: ESLint (flat config in `eslint.config.ts`), format: `oxfmt`, unused code: `knip`

## Tests

- Unit tests: Vitest, located in `src/**/*.test.ts` (`pnpm turbo test:unit`)
- Integration tests: Playwright, located in `tests/**/*.spec.ts` (`pnpm turbo test:integration`)

## Conventions

- Use Conventional Commits
- Use `kebab-case` for directory and file names
- Use `UPPER_CASE` for naming top-level constants

## Before committing

- Run `pnpm turbo fix`
- Adding a user-visible change? Run `pnpm changeset add` to add a changeset entry

## GitHub Pull Requests

- Self-assign the PR
- Provide a short summary of the introduced changes. Focus on essential changes.
- Reference related GitHub issues closed by the changes
