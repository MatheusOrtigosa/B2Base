export const criteria = [
  { key: 'problem', label: 'Problema e impacto confirmados', weight: 25 },
  { key: 'decision', label: 'Decisor e apoio interno identificados', weight: 20 },
  { key: 'fit', label: 'Adequação da solução validada', weight: 20 },
  { key: 'budget', label: 'Orçamento ou aprovação confirmados', weight: 15 },
  { key: 'timing', label: 'Prazo e processo de compra definidos', weight: 10 },
  { key: 'next_step', label: 'Próximo passo acordado com o cliente', weight: 10 },
] as const;
export type Qualification = Record<string, { confirmed: boolean; evidence: string }>;
export function score(q: Qualification = {}) {
  return criteria.reduce((total, c) => total + (q[c.key]?.confirmed && q[c.key]?.evidence?.trim() ? c.weight : 0), 0);
}
export function leadScore(fit: number, intent: number) {
  return Math.round(Math.max(0, Math.min(100, fit)) * .6 + Math.max(0, Math.min(100, intent)) * .4);
}
