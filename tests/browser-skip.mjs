import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import console from 'node:console';

// Run against a built, running application with agent-browser installed.
const baseUrl = process.argv[2] ?? 'http://127.0.0.1:3000';
const session = `skip-regression-${process.pid}`;
function browser(...args) {
  const response = JSON.parse(execFileSync('agent-browser', ['--session', session, '--json', ...args], { encoding: 'utf8' }));
  assert.equal(response.success, true, response.error);
  return response.data;
}
try {
  for (const route of ['#/accounts', '#/accounts/everyday']) {
    browser('open', `${baseUrl}/${route}`);
    browser('wait', 'h1');
    const title = browser('eval', 'document.querySelector("h1").textContent').result;
    browser('eval', 'document.querySelector(".skip-link").focus()');
    browser('press', 'Enter');
    browser('wait', 'main:focus');
    const state = browser('eval', '({hash:location.hash, focus:document.activeElement.id, title:document.querySelector("h1").textContent})').result;
    assert.deepEqual(state, { hash: route, focus: 'main', title });
    console.log(`PASS keyboard skip preserves ${route} and focuses main`);
  }
} finally {
  browser('close');
}
