---
layout: home

hero:
  name: Playwright Utils
  text: Utilities for writing tests with Playwright
  actions:
    - theme: brand
      text: Getting Started
      link: /getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/cronn/playwright-utils

features:
  - title: Route Interceptor
    details: Abort, mock, modify or delay the requests of a page for the duration of a single action instead of the whole test.
    link: /api/route-interceptor
  - title: Fetch Adapter
    details: Use Playwright's request context as a fetch implementation to send requests of an API client through Playwright.
    link: /api/fetch-adapter
  - title: Console Captor
    details: Collect the console messages of a page, filtered by level or a custom predicate, for a single action or a whole test.
    link: /logging/console-captor
  - title: Snapshot Testing
    details: Mask non-deterministic values like IDs, timestamps or base URLs in a consistent format to keep file snapshots stable.
    link: /snapshots/normalizers
  - title: Test Setup
    details: Detect a CI environment and resolve paths from the package root to keep the Playwright configuration portable.
    link: /configuration
  - title: Utility Types
    details: Types for writing reusable test helpers, like a target accepting both a page and a locator.
    link: /utility-types
---
