# Local verification — v0.3.1 / 2026-09-26

16 automated tests passed, including shared-browser isolation across valid, rejected and valid submissions. All nine animals passed 16-phase visual regression; 14 malformed/unsafe inputs were rejected.

Same-machine three-animal CLI fixture timing (Windows, Node 24.19.0, Playwright 1.62.1, installed Chrome):

| Version | Three measurements (ms) | Median |
|---|---|---|
| Before | 4492, 4572, 4373 | 4492 ms |
| Shared browser | 2110, 2170, 2189 | 2170 ms |

About 52% lower local processing wall time. This measures existing handcrafted fixture processing through CLI completion, including server startup, not model generation or browser-window launch. Both versions keep three animals, 16-phase checks, screenshots, source preservation and standalone animation verification. Small local timing sample; not a cross-machine guarantee. Model generation timing is unknown. No real model benchmark score or GitHub CI success is claimed.

# Local verification — v0.2 / 2026-09-26

Node.js 24.19.0; Playwright 1.62.1; local Google Chrome, Windows.

- 14 automated tests passed: usage and rubric gates, fingerprint abstention, duplicate/self-match exclusion, same-condition retrieval, leave-one-out accounting, Pareto filtering, independent execution and complete UI workflows.
- Browser regression: 9 animal definitions × 16 phases; animation advancement, wheel rotation, visible contacts, clipping checks, SVG round trip, 14 rejected invalid/unsafe fragments, failure preservation, export, reduced motion and 390px mobile width.
- Independent grader: animated fixture passes, stationary and blank fixtures fail appropriate checks, source-declared scores are ignored, resource/runtime/element errors are captured, infinite script hits timeout.
- UI: four evidence images and technical score, random anonymous comparison, mandatory ratings before reveal, fingerprint insufficient-data behavior, duplicate rejection, persisted source samples and quality records, efficiency chart, cross-origin POST rejection, pressure constraints.
- CLI smoke: 9 handcrafted animals pass; 1 invalid SVG and 1 blank Track B HTML fail. The failing HTML still produces four evidence frames. No token or quality values were invented.
- 360 v0.2 prompts generated. Skill validation passes. Desktop, independent-evaluation and anonymous-comparison screenshots inspected.

Synthetic model clusters in unit tests are only test fixtures, not real model samples or attribution accuracy measurements. No model API calls were made. No GitHub remote CI run is claimed. Tests use the preinstalled matching Playwright and local Chrome; a clean npm-ci/Chromium installation was not repeated locally.
