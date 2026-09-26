export const RUBRIC=[['recognizability','物种辨识','0 无法辨认 · 50 大致像 · 100 特征明确'],['motion','动作可信','0 脱离或僵硬 · 50 可运转 · 100 重心与关节自然'],['morphology','身体结构','0 错误肢体 · 50 部分适配 · 100 物种结构合理'],['craft','视觉完成度','0 草稿 · 50 基本完整 · 100 轮廓、层次、细节统一']];
export function reviewScore(scores,validation){
  if(!RUBRIC.every(([k])=>Number.isFinite(scores[k])&&scores[k]>=0&&scores[k]<=100))return null;
  return validation?.pass===true?RUBRIC.reduce((n,[k])=>n+scores[k],0)/4:validation?.pass===false?0:null;
}
export function pareto(records){return records.filter(a=>Number.isFinite(a.tokens)&&a.tokens>0&&Number.isFinite(a.quality)&&!records.some(b=>Number.isFinite(b.tokens)&&b.tokens>0&&Number.isFinite(b.quality)&&b.tokens<=a.tokens&&b.quality>=a.quality&&(b.tokens<a.tokens||b.quality>a.quality)));}
