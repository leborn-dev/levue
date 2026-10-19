# Security remediation, 2026-10-19

Baseline: `leborn-dev/levue` main `6a10cadfba4f1d4792d8bcddb5c4b8059816156d`, which is also the analysis commit of all 19 initial CodeQL alerts. This is a source change; it does not publish a release, change external services, or disable/dismiss security analysis.

## Code and compiler boundaries

| Initial CodeQL alerts | Treatment and evidence |
| --- | --- |
| 1–5, `rewriteDefault` ReDoS | Remove overlapping leading-whitespace matches and the broad named-export expression. Anchored per-line matching and a linear conservative precheck retain the parser fallback, comments, decorated classes and named reexports. Regression includes 50,000 newlines and long nonmatching exports. |
| 6, filename ReDoS | Split the final path segment and extension with string operations; only the extension uses an anchored word-character check. A 50,000-dot extensionless filename is covered. |
| 7, release-note path | Require a valid SemVer before loading the changelog generator or opening output. Negative path input is rejected before file creation. |
| 8, Git hook path | Resolve Git's own `COMMIT_EDITMSG`, validate canonical path equality, and read that resolved path. Tests cover unrelated input and a legitimate hook path in a separate temporary repository. |
| 9–10, SFC expression string helpers | Review as intentional compiler/identifier-analysis operations. `processExp`/`stripStrings` build an import-usage search string; `isImportUsed` consumes it with `.test()`. It is not executable output or a security sanitizer. `local` is a Babel-parsed identifier; `$` is its only regular-expression metacharacter. Preserve TypeScript expressions and import-usage/HMR regression. The independent filename and source-module literal construction defects are fixed by safe serialization/preserving Babel's original literal. |
| 11, event handler codegen | Review as intentional trusted-template compilation. Regex replacement classifies method paths, function expressions and invocations; each expression remains executable by design. Inline statements and modifiers are tested. Application render data is not reparsed as event-handler source. |
| 12–14, inline templates | Review as intentional recursive compilation of a trusted AST. `generate(ast, options)` produces the embedded render functions; a string replacement is not an attempted security boundary. Normal inline-template rendering is retained. |
| 15, slot codegen | Review as intentional template code generation. Static attribute values/names are serialized in the compiler; bound values are trusted template expressions. Keep slot props, camelization and expressions in the existing compiler suite. |
| 16–17, SSR function invocation | Request context does not select a method. The invoked value is the trusted evaluated bundle's export. New-context mode checks `typeof res`; reusable modes reject a nonfunction before retaining it in a closure. Tests submit `constructor`/`__proto__` request values in every mode and reject nonfunction exports. Separately fix a real inherited-cache collision: an own bundle filename `constructor` must evaluate its source rather than returning an inherited function. All three module caches now have null prototypes. |
| 18, HTTP example script | Pin dynamics.js 1.1.5 over HTTPS with SHA384 SRI and anonymous CORS. The hash was computed from the exact pinned response bytes. |
| 19, reactive property/merge utility | Reproduce actual global pollution: the two-argument `defineReactive({}, '__proto__')` previously observed the inherited `Object.prototype`, and a later `Vue.set` on another object reused that inherited observer and wrote to the built-in prototype. Do not read an inherited `__proto__` as the initial reactive value, and accept only own observer metadata when adding properties. Also define an own data property for `Vue.set({}, '__proto__', value)`, preserving explicitly supplied values and ordinary inherited keys. Regression tests verify that neither built-in nor application prototypes are mutated. The normal observer and data/injection suites remain covered. |

The review classifications above are submitted for independent review, not silent alert dismissal. Vue explicitly documents that templates are executable source and must be trusted: [Vue 2 security guidance](https://github.com/vuejs/v2.vuejs.org/blob/master/src/v2/guide/security.md). Removing expression evaluation would break Vue 2's public API.

Additional real fixes: serialize inferred SFC component names with `JSON.stringify`; preserve the original parsed module-source literal when rewriting reexports. A filename containing quotes previously produced invalid/injectable JavaScript; a quoted module path previously lost its escaping.

## Advisory coverage for the packages built here

Package-manager audit does not check a project's own package, so the GitHub Advisory Database API was independently queried for every published workspace name. These are the reviewed records observed on 2026-10-19; no package was renamed to evade a source advisory.

| Package/version | Reviewed source advisories | Coverage |
| --- | --- | --- |
| `vue@2.7.16` | [CVE-2024-9506 / GHSA-5j4c-8p2g-v4jx](https://github.com/advisories/GHSA-5j4c-8p2g-v4jx) | Anchor plaintext end-tag matching so malformed input cannot restart a lazy scan at every position. Reproduce the malformed script/textarea input before the fix. |
| `vue-template-compiler@2.7.16` | [CVE-2024-6783 / GHSA-g3ch-rx76-35fx](https://github.com/advisories/GHSA-g3ch-rx76-35fx) | Parsed AST elements and attribute dictionaries have null prototypes. Tests poison ambient static/dynamic class/style and `v-if` metadata and verify it is absent from generated source. SSR shares the same parser. |
| `vue-server-renderer@2.7.16` | No reviewed package-name advisories returned | Independently check shared compiler fixes and run string, stream, bundle, template, webpack and request-context regressions. Runtime dependency advisories are also included in full audit. |
| `@vue/compiler-sfc@2.7.16` | No reviewed package-name advisories returned | Independently check filename/literal/ReDoS boundaries and run the complete SFC suite and public type generation. |

The version remains 2.7.16 until a separate release decision. The source fixes do not change the advisory database's historical version ranges or repair the unmodified npm release.

## Dependencies and compatibility

The original frozen lock audit reports 141 vulnerabilities: 13 critical, 61 high, 50 moderate, 17 low. Updated dependencies and bounded source forks produce zero findings at every severity in full `pnpm audit`, including workspace dependencies.

The two advisories without a registry fix use reviewed source forks in `vendor/security`: braces 3.0.3 and sprintf-js 1.1.3. Official tarball SHA512 values were verified; licenses, original entrypoints, source diffs, update policy and regression commands are recorded alongside the source. Tests exercise both public/direct braces helpers and the sprintf source/minified entrypoints. The file overrides identify actual patched code, not version-only exclusions.

Development migration includes Vitest 4, webpack 5, Puppeteer 25, a compatible jsdom, current PostCSS/pug/stylus and lock transitive updates. Preserve browser tests by translating the legacy double-click option and waiting for the next rendering frame after input (native hashchange can follow input dispatch), use Puppeteer's asynchronous browser resolution for Karma, fix webpack 5 bare stack-frame source-map handling, and update only fixture chunk names/asset order. Rollup's TypeScript filter now uses an extension regex because hardened picomatch no longer accepts the old empty extglob. Failed builds now exit nonzero.

The SSR runtime's `serialize-javascript` 7.1.2 requires Node.js >=20.0.0. That requirement belongs to `packages/server-renderer/package.json` and its README. The root/browser `vue` package has no added Node engine restriction. Development tools were verified with Node 22.23.1; they have separate requirements.

## Browser CDN dependencies

The reorder benchmark now loads the exact `lodash@4.18.1` distribution, replacing 4.10.0. The old shipped script reproduced `_.merge` prototype pollution; the new distribution rejects the same input while retaining shuffle, keyed row selection, add and remove. This also avoids the reviewed affected ranges in [GHSA-r5fr-rjxr-66jc](https://github.com/advisories/GHSA-r5fr-rjxr-66jc) and [GHSA-f23m-r3pf-42rh](https://github.com/advisories/GHSA-f23m-r3pf-42rh).

The Select2 wrapper now loads stable `select2@4.1.0` JavaScript and CSS and pins its jQuery dependency to 3.7.1. Select2 4.0.3 was affected by [CVE-2016-10744 / GHSA-rf66-hmqf-q3fc](https://github.com/advisories/GHSA-rf66-hmqf-q3fc), patched in 4.0.6. The sample does not configure the affected rich AJAX HTML templates; updating the shipped library removes the affected distribution without changing its Vue 2 props/input/watch/destroy contract. Correct the local Vue script path so the classic sample loads the built Vue distribution.

All four CDN assets use versioned HTTPS jsDelivr npm URLs, SHA384 SRI and anonymous CORS, following [Select2's distribution guidance](https://select2.org/getting-started/installation/). Each response was byte-for-byte equal to its corresponding file in the official npm tarball, whose registry SHA512 integrity was separately verified. Reviewed GitHub Advisory Database package/version queries returned zero records for all three selected versions. The explicit network browser check exercises real selection/input updates, programmatic value/options updates, default label escaping and plugin destruction, as well as benchmark operations. It requires the built `dist/vue.min.js` and CDN access.

## Firebase example

The old source configuration exactly matches the public upstream Vue v2.7.16 Firebase example. Firebase API keys identify a project and can be public only with appropriate API restrictions, Security Rules and App Check: [official guidance](https://firebase.google.com/docs/projects/api-keys). The old project's restrictions and rules were not inspected or assumed safe. No key or project was probed, changed or revoked.

Remove automatic connection to that shared third-party project. The example now requires an explicit `window.FIREBASE_CONFIG`; without it no Firebase initialization occurs and setup instructions are displayed. A supplied project still initializes the original add/remove-user example. Historical commits are not rewritten, and historical public configuration is not declared an unrestricted safe secret. No key value appears in the remediation report or tests.

## Reproduce validation

Use Node 22.23.1 and pnpm 8.9.2 for the verified development environment. To use an existing browser, set `PUPPETEER_EXECUTABLE_PATH` to its executable. `PUPPETEER_SKIP_DOWNLOAD=1 pnpm install --frozen-lockfile` is suitable when that browser is supplied.

- `pnpm audit --json`
- `pnpm run test:security`
- `node --test test/security-cdn.cjs` (explicit CDN/browser integration; requires Chrome and `pnpm run build`)
- `pnpm exec vitest run test/unit packages/compiler-sfc packages/server-renderer --maxWorkers=4`
- `pnpm run ts-check` and `pnpm run test:types`
- `pnpm run build`
- `pnpm exec vitest run test/e2e --maxWorkers=2`
- `pnpm run test:transition`

The optional `ts-check:test` script is not part of `pnpm test`. It already fails on the original main plus original frozen lock (708 diagnostics), including deliberately invalid fixture types and the legacy done-callback shim. The candidate also has modern test-tool declaration incompatibilities with the retained TypeScript 4.9 checker. Baseline 708 = 704 source/fixture diagnostics + 4 dependency declaration diagnostics; candidate 714 = the same 704 source/fixture diagnostics + 10 modern test-tool declaration diagnostics. Counts and per-file/code deltas are kept separately in the handoff evidence; the production source check and generated public-type check pass. No fixture/type check is suppressed to hide these diagnostics. Sass emits its upstream legacy-API deprecation notice during SFC tests.
