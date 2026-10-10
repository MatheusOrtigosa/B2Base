import assert from 'node:assert/strict';
import { test } from 'node:test';
import { criteria, score, leadScore } from '../lib/score.ts';
test('unknown and unsupported claims do not receive points', () => {
 assert.equal(score(), 0);
 assert.equal(score({ problem: { confirmed: true, evidence: '   ' } }), 0);
 assert.equal(score({ problem: { confirmed: false, evidence: 'cliente confirmou' } }), 0);
});
test('confirmed evidence earns the defined weight and full qualification totals 100', () => {
 assert.equal(score({ problem: { confirmed: true, evidence: 'Reunião de discovery' } }), 25);
 assert.equal(score(Object.fromEntries(criteria.map(c => [c.key, { confirmed: true, evidence: 'Validado' }]))), 100);
});
test('lead scoring is weighted and bounded', () => {
 assert.equal(leadScore(100, 0), 60);
 assert.equal(leadScore(0, 100), 40);
 assert.equal(leadScore(200, -50), 60);
});
