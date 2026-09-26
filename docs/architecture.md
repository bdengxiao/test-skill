# Architecture

```text
index.html / app.js   selection, editor, playback, reports
  BikeRig            wheel rotations, crank, named contact positions
    RiderRig         mounts one allowed SVG root, updates contact paths
      Animal         declarative SVG fragment or {species,nodes}

validator            allowlist + required geometry + 16 rendered phases
runner               provider adapter -> source archive -> validator -> frames
aggregate            comparable experiment cells -> descriptive metrics
```

The Track A page has no runtime framework or external network dependency. The local Track B evaluation endpoint requires Playwright. `node scripts/serve.js` serves only on loopback; the page uses native browser modules. A static host also works. Do not double-click index.html: browser module loading needs HTTP.

Playwright is used for tests, benchmark execution and the independent HTML evaluation endpoint. The server only accepts same-origin JSON POSTs from loopback hostnames and limits concurrent evaluation to one. New provider adapters implement `generate({task,prompt,entry,baseDir})`, returning `{content,model,provider,usage,rawUsage}`. The default adapter only reads files. Supply another with `--adapter path/to/adapter.js`; adapters are executable trusted code and should handle their own API credentials without saving them in results.

Track B uses CSP, request blocking and opaque-origin iframe isolation in a new browser; see [independent evaluation](independent-evaluation.md). Track A never executes submitted JavaScript. Only simple SVG shapes and declarative motion contacts are permitted. There are no automatic repairs. JSON recursion is bounded, and sources are capped at 100,000 characters. These limits protect this local evaluator from accidental excessive inputs; they are not a general-purpose untrusted HTML sandbox.
