# Benchmark design / v0.2

Test Skill measures compact SVG generation under a supplied rig. Tokens are a measurable proxy for model computation, **not FLOPs, energy, GPU time or universally comparable cost**. The proposed 80–90% infrastructure reuse is a design motivation, not a measured savings claim.

## Tracks and protocol

- A: generate only SVG/Animal JSON, using the exact coordinate and contact contract. Runtime motion is supplied, so passing motion checks does not establish that the model can author animation code.
- B: generate a whole HTML animation. v0.2 runs the original HTML in a separate browser context and opaque-origin sandbox, blocks network requests, samples four frames and records a technical score. Visual quality still requires an independent review. The two tracks have different technical gates and must not be pooled.
- Formats are alternative representations of the same contract. The current editor accepts both automatically. To compare formats experimentally, add an explicit format requirement to task.requirement and retain it in results.

`benchmark/tasks.jsonl` contains 18 public development tasks (9 animals × 2 tracks). They are NOT hidden tests. All nine implementations are publicly visible. Genuine held-out tasks must be created and stored separately, withheld from development and prompting, and described in a later evaluation release. Do not label a public animal as unseen.

## Reproducible experiment

1. Generate a plan across budgets 50, 100, 250, 500, 1000 and skill variants none, micro, mini, full.
2. Pin package version/commit, exact prompts, model version, provider, sampling settings and trial seed where supported. The runner preserves prompt and response hashes. Put sampling settings in `provenance.settings`, and source commit / trial identifiers in the rest of `provenance`; the runner preserves this object and aggregation separates different settings and task requirements.
3. Run externally with the provider's real output limit. The local runner can check reported output against that budget, but cannot enforce limits on previously saved responses. Record truncation and all failed attempts. No retry or silent repair is performed.
4. Fill file/model/usage in a subset of the plan and import responses. Unknown usage remains null. Include all actual prompt messages, skill, contract, examples, retry context and system overhead in input usage.
5. Compare within track, species, element limit, format, skill condition and budget. Use repeated trials (e.g. at least 3), disclose sample counts, failures, missing reviews and token coverage. Current aggregation reports descriptive means only, without confidence intervals or statistical significance.

The `none` condition still includes the Track A API contract. It means no extra skill guidance, not zero context. The full skill contains repository links, which are unavailable to a text-only model unless their contents are explicitly supplied; use the exact same tool access policy in every condition, and count any additional context. The micro/mini/full labels are qualitative sizes, not verified token counts.

## Original prototype

The handoff references `svg_animal_bike_benchmark.html` from a prior ChatGPT sandbox. The accessible conversation supplied only its link, with no attached bytes. It could not be downloaded, preserved, run or compared in this workspace. This repository is a new implementation; it does not claim to be a verified refactor of that file. If the original is supplied later, preserve it under `prototype/` before comparison.

## Roadmap

- Stronger OS-level resource quotas and continuous-time checks for the existing Track B grader.
- Provider adapters with recorded real token usage, price source/date and full sampling parameters.
- Confidence intervals and independent held-out validation beyond the implemented Pareto chart and blinded review.
- Model fingerprint calibration against real, balanced multi-model data; held-out prompts and open-set evaluation.
- Minimum effective prompt / skill experiments and explicitly balanced SVG vs JSON comparisons.
- Private held-out morphology tasks; progressive element limits 50/30/20/10.
- Repair tasks with separate first-pass and cumulative repair cost.
- Separate deterministic compliance and creative visual briefs.
- Better occlusion, origin-to-body attachment, joint anatomy and perceptual clipping checks.

The Track A validator checks syntax, allowed content, required attributes, element limits, non-finite scalar attributes, bounds and contact endpoints. It samples 16 phases. It does not prove anatomical correctness, recognizability, continuous-time correctness, full SVG conformance, self-intersection quality, origin connectivity or occlusion. Its conservative bounds use geometry plus maximum stroke width, not exact painted-pixel bounds. These limits matter when reporting success rates.
