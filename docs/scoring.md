# Scoring

Keep raw data. There is no model leaderboard yet: **Not yet benchmarked.**

## Automated fields

`validation.pass` is a deterministic structural/rig gate for Track A, not a visual quality score. Results include errors, element count (root included), UTF-8 bytes, and bounding boxes at 16 phase samples. The runner also records browser page exceptions, exact source files, hashes, prompt text and four screenshots of passing submissions.

`budgetPass` is null when output usage is missing. Otherwise it compares reported outputTokens with task.budget. An over-budget output may still be geometrically valid; filter by budgetPass for budget-constrained reports. Do not drop failures from denominators. Unknown fields are null, never a fabricated zero.

## Human review

Optionally attach `review: {"recognizability":80,"motion":70,"morphology":90,"craft":80,"reviewer":"anonymous-id","notes":"..."}` to an entry. Use the same blinded rubric and timestamps for every model:

| Dimension | 0 | 50 | 100 |
|---|---|---|---|
| Recognizability | Wrong / unidentifiable animal | Species is ambiguous | Clearly identifiable silhouette and features |
| Motion | Broken contacts or implausible motion | Attached but awkward | Stable, readable, plausible movement |
| Morphology | Wrong body plan | Partly adapted template | Species-appropriate limbs and structure |

| Visual craft | Rough/incomplete | Coherent basic drawing | Deliberate silhouette, layers and details |

All four dimensions must be present and between 0 and 100. After completed validation, quality is their equal-weight mean, gated to zero on structural failure. Until review is available it remains null. v0.1 records retain their legacy three-dimension calculation; aggregation separates versions. v0.2 Track B technicalScore is independent of human qualityScore. See [independent evaluation](independent-evaluation.md) for its weights and limitations.

`qualityPer1kTokens = qualityScore × 1000 / totalTokens`. Total counts input plus output; in this normalized contract reasoning is already included in outputTokens and is not added twice. Providers that report reasoning separately must normalize before import. Usage may be unknown for some providers; never infer exact tokens from bytes or characters. Monetary cost and latency are explicitly supplied observations, with no built-in guessed price table.

Quality/token can reward short but inadequate answers. Present absolute quality, validity, budget compliance, usage coverage and cost alongside it. A provider's nominal token is not the same unit across tokenizers. This score is a research choice, not an objective universal ranking.
