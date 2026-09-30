import test from 'node:test';
import assert from 'node:assert/strict';
import { esc } from '../assets/js/escape.js';

test('esc neutralizuje HTML v IGN', () => {
  assert.equal(esc('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
});
test('esc escapuje uvozovky a ampersand (atributy)', () => {
  assert.equal(esc(`a"b'c&d`), 'a&quot;b&#39;c&amp;d');
});
test('esc zvládne ne-řetězce', () => {
  assert.equal(esc(42), '42');
  assert.equal(esc(null), 'null');
});
