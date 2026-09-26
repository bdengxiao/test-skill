# Contributing

Use Node.js 22+ and run `npm test` plus `npm run test:visual` before submitting a change. Keep runtime code free of dependencies. Preserve the SVG/JSON contract or version breaking changes explicitly.

New animals should test a distinct morphology, remain recognizable at small sizes, and pass the same phase checks. Public examples cannot be claimed as held-out tests. Add independent negative cases for validator changes.

For benchmark data, include exact prompts, raw responses, real usage, model version, settings, all failures, review protocol and source commit. Do not add API keys. Label handcrafted fixtures as such. Never present invented or estimated token counts as API measurements.

Open issues with a minimal input fragment and expected behavior. Prefer a small measurable change to speculative frameworks.
