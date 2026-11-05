// node teste.mjs  — confere as respostas principais
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
globalThis.document = { getElementById: () => ({ addEventListener() {}, setAttribute() {} }) };
globalThis.window = {};
const { responder } = createRequire(import.meta.url)('./app.js');
const terca20h = new Date(2026, 10, 10, 20, 0), segunda = new Date(2026, 10, 9, 20, 0);
assert.match(responder('Vocês estão abertos?', terca20h), /abertos agora/);
assert.match(responder('estão abertos?', segunda), /fechados/);
assert.match(responder('quanto custa o bacon smash?'), /34,90/);
assert.match(responder('e a batata cheddar?'), /24,90/);
assert.match(responder('tem opção vegetariana?'), /Veggie/);
assert.match(responder('qual a taxa de entrega'), /6,00/);
assert.match(responder('boa noite'), /atendente da Chapa Sete/);
assert.match(responder('xyz'), /não entendi/);
console.log('ok: 8 respostas conferidas');
