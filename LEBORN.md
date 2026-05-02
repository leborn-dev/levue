# About this fork

`LeVue` is a [Leborn](https://github.com/leborn-dev) fork of [Vue 2.x](https://github.com/vuejs/vue).

## Why this fork exists

Vue 2 reached end-of-life on December 31, 2023. With millions of production deployments worldwide, the migration to Vue 3 is non-trivial. We focus on AI-assisted migration tools (LTS is well covered by HeroDevs NES).

## What we are doing

This fork goes through 5 phases:

- **Phase A: Setup and Analysis** - Docker dev environment, codebase overview, dependency status, compatibility issues
- **Phase B: Modern Node.js LTS build compatibility** - Make the codebase run on Modern Node.js LTS
- **Phase C: Build toolchain modernization** - Update EOL dependencies to current versions
- **Phase D: Tests and CI** - Test coverage and matrix CI on GitHub Actions
- **Phase E: AI-native rebirth and v0.1.0 release** - AI-assisted Vue 2 -> Vue 3 migration. Options API to Composition API conversion, breaking change suggestions, automated PR generation.

## Status

This is an **early-stage** fork. The repository was initialized on 2026-05-02 with a full mirror of the upstream codebase. Modernization and Leborn-specific features are tracked in [Issues](../../issues).

Estimated duration to v0.1.0: **2 to 3 weeks** (with Claude Code-augmented development).

## Original project

- Name: Vue 2.x
- Repository: https://github.com/vuejs/vue
- License: MIT

This fork retains all upstream commit history (see `git log`). Original maintainers and contributors are credited in commit metadata. See `NOTICE` for the formal attribution.

## About Leborn

[Leborn](https://github.com/leborn-dev) is an initiative to revive popular but stalled open-source projects with AI-native enhancements designed for the 2026 era of software. Leborn is sponsored and operated by [LLL Sdn Bhd](https://lll.dev) (Malaysia).

The name "Leborn" is from "Reborn" with the R replaced by L (for LLL).

## License

This fork retains the original MIT license. See `LICENSE`.
