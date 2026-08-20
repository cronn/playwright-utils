# Playwright Utils

Utilities for writing tests with [Playwright](https://playwright.dev/).

## Documentation

For full documentation, visit [cronn.github.io/playwright-utils](https://cronn.github.io/playwright-utils/).

## Installation

```sh
pnpm add -D @cronn/playwright-utils
```

```sh
npm install -D @cronn/playwright-utils
```

```sh
yarn add -D @cronn/playwright-utils
```

## Development

This repository uses [Turborepo](https://turborepo.com/) as build system.

### Common Tasks

| Command               | Description                                                                       |
| --------------------- | --------------------------------------------------------------------------------- |
| `pnpm turbo check`    | Runs code checks, including TypeScript compilation, linting, formatting and tests |
| `pnpm turbo fix`      | Applies automatic fixes, including linting and formatting                         |
| `pnpm turbo build`    | Runs the build                                                                    |
| `pnpm turbo ci`       | Runs all tasks required for CI, including checks and builds                       |
| `pnpm turbo clean`    | Removes all build outputs and caches                                              |
| `pnpm turbo docs:dev` | Starts the documentation site in development mode                                 |

### Testing the package locally

Using `pnpm link`, you can test the local package in another local project.

```sh
cd path/to/project
pnpm link path/to/playwright-utils
```

This replaces the package in `node_modules` with the local version.

### Editor Setup

#### IntelliJ IDEA

**Recommended Plugins:**

- [Oxc](https://plugins.jetbrains.com/plugin/27061-oxc) for formatting

#### VS Code

If you configured a default formatter on language level in your user settings, you need to remove it or replace it by `oxc.oxc-vscode` to use oxfmt as formatter.
