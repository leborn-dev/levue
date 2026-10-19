# vue-server-renderer

> This package is auto-generated. For pull requests please see [src/platforms/web/entry-server-renderer.js](https://github.com/vuejs/vue/blob/dev/src/platforms/web/entry-server-renderer.js).

This package offers Node.js server-side rendering for Vue 2.0.

- [API Reference](https://ssr.vuejs.org/en/api.html)
- [Vue.js Server-Side Rendering Guide](https://ssr.vuejs.org)

## Security update: Node.js requirement

This maintained source build requires **Node.js 20.0.0 or later** for server rendering. The runtime dependency `serialize-javascript` was upgraded to 7.1.2 to address its published code execution and denial of service advisories; that dependency requires Node.js 20. Update the Node runtime before adopting this SSR package, rebuild the bundle, and rerun render-to-string, streaming, template-state serialization and webpack plugin checks.

The browser/runtime `vue` package keeps its Vue 2 API and has no new package-level Node engine restriction. Local development tools have separate requirements: the updated Vite/Vitest/Puppeteer toolchain is verified using Node.js 22.23.1. Do not use a development-tool requirement as the browser library's engine constraint.
