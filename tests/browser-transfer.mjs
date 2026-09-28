import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import console from 'node:console';

// Uses seeded fictional accounts and moves $10; run against a disposable demo DB.
const base = process.argv[2] ?? 'http://127.0.0.1:3000';
const session = `transfer-regression-${process.pid}`;
function browser(...args) {
  const result = JSON.parse(execFileSync('agent-browser', ['--session', session, '--json', ...args], { encoding: 'utf8' }));
  assert.equal(result.success, true, result.error);
  return result.data;
}
const accounts = () => globalThis.fetch(`${base}/api/accounts`).then(response => response.json());
const before = await accounts();
try {
  browser('open', `${base}/#/transfer`);
  browser('set', 'viewport', '320', '844');
  browser('wait', '#source');
  browser('click', 'button[type=submit]');
  assert.equal(browser('eval', 'document.activeElement.id').result, 'source');
  browser('select', '#destination', 'savings');
  browser('select', '#source', 'savings');
  assert.equal(browser('eval', 'document.querySelector("#destination").value').result, '');
  browser('select', '#source', 'everyday');
  browser('select', '#destination', 'savings');
  browser('fill', '#amount', '1.001');
  browser('click', 'button[type=submit]');
  assert.equal(browser('eval', 'document.activeElement.id').result, 'amount');
  browser('fill', '#amount', '10.00');
  browser('click', 'button[type=submit]');
  browser('wait', '--text', 'Review transfer');
  assert.match(browser('eval', 'document.querySelector("main").textContent').result, /Everyday Checking.*Rainy Day Savings.*\$10\.00/);
  const width = browser('eval', '({scroll:document.documentElement.scrollWidth,width:innerWidth})').result;
  assert.equal(width.scroll, width.width);
  browser('click', 'button:not(.primary)');
  browser('wait', '#amount');
  assert.equal(browser('eval', 'document.querySelector("#amount").value').result, '10.00');
  assert.deepEqual(await accounts(), before);
  browser('click', 'button[type=submit]');
  browser('click', 'button.primary');
  browser('wait', '--text', 'Transfer complete');
  const receipt = browser('eval', '({hash:location.hash,text:document.querySelector("main").textContent})').result;
  assert.match(receipt.text, /FromEveryday Checking.*ToRainy Day Savings.*Amount\$10\.00.*Transaction ID/);
  const reference = receipt.hash.split('/').at(-1);
  assert.equal((await (await globalThis.fetch(`${base}/api/transfers/${reference}`)).json()).id, reference);
  browser('eval', 'location.reload()');
  browser('wait', '--text', 'Transfer complete');
  assert.match(browser('eval', 'document.querySelector("main").textContent').result, new RegExp(reference));
  const after = await accounts();
  for (const [id, delta] of [['everyday', -1000], ['savings', 1000]]) {
    assert.equal(after.find(account => account.id === id).balanceCents, before.find(account => account.id === id).balanceCents + delta);
    const entries = await (await globalThis.fetch(`${base}/api/accounts/${id}/transactions`)).json();
    const postings = entries.filter(entry => entry.transferId === reference);
    assert.equal(postings.length, 1);
    assert.equal(postings[0].amountCents, delta);
  }
  console.log('PASS validation/focus, review/edit, 320px layout, $10 transfer, durable receipt and both linked postings');
} finally { browser('close'); }
