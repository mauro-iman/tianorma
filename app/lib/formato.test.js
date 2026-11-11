import { test } from 'node:test';
import assert from 'node:assert/strict';
import { precio, esc } from './formato.js';

test('precio con formato argentino', () => {
  assert.equal(precio(0), '$ 0');
  assert.equal(precio(950), '$ 950');
  assert.equal(precio(1000), '$ 1.000');
  assert.equal(precio(15000), '$ 15.000');
  assert.equal(precio(125000), '$ 125.000');
  assert.equal(precio(1250000), '$ 1.250.000');
});

test('precio rechaza valores raros', () => {
  assert.throws(() => precio(12.5));
  assert.throws(() => precio(-1));
  assert.throws(() => precio('15000'));
});

test('esc escapa HTML', () => {
  assert.equal(esc('<b>"Jarrón" & \'taza\'</b>'), '&lt;b&gt;&quot;Jarrón&quot; &amp; &#39;taza&#39;&lt;/b&gt;');
  assert.equal(esc(null), '');
});
