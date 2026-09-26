export function normalizeUsage(usage = {}) {
  const out = {};
  for (const key of ['inputTokens','outputTokens','reasoningTokens','totalTokens','latencyMs','costUSD']) {
    const v = usage[key];
    if (v !== undefined && v !== null && (!Number.isFinite(v) || v < 0)) throw new Error(`Invalid ${key}`);
    out[key] = v ?? null;
  }
  // Reasoning is a subset of output under this contract; never add it twice.
  if (out.totalTokens === null && out.inputTokens !== null && out.outputTokens !== null) out.totalTokens = out.inputTokens + out.outputTokens;
  if (out.reasoningTokens !== null && out.outputTokens !== null && out.reasoningTokens > out.outputTokens) throw new Error('Reasoning tokens must be included in outputTokens');
  if (out.totalTokens !== null && out.inputTokens !== null && out.outputTokens !== null && out.totalTokens !== out.inputTokens + out.outputTokens) throw new Error('Inconsistent totalTokens');
  return out;
}
export function score(record) {
  const review = record.review;
  const dimensions=record.version==='0.1.0'?['recognizability','motion','morphology']:['recognizability','motion','morphology','craft'];
  const quality = review && dimensions.every(k => Number.isFinite(review[k]) && review[k]>=0 && review[k]<=100)
    ? dimensions.reduce((sum,k)=>sum+review[k],0)/dimensions.length : null;
  const qualityScore = quality === null ? null : record.validation?.pass === false ? 0 : record.validation?.pass === true ? quality : null;
  return {qualityScore, qualityPer1kTokens: qualityScore !== null && record.usage?.totalTokens > 0 ? qualityScore*1000/record.usage.totalTokens : null,
    budgetPass: record.usage?.outputTokens == null ? null : record.usage.outputTokens <= record.task.budget};
}
