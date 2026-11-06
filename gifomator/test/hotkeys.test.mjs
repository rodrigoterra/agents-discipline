/**
 * Hotkey scoping policy.
 *
 * Regression: v0.1.2–0.1.5 registered the stop key (Ctrl+Shift+S) and discard key
 * (Ctrl+.) globally at startup. On Windows a global registration consumes the
 * keystroke, so Save As and VS Code Quick Fix stopped working everywhere while
 * Gifomator ran. They must only be held during a capture.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { activeHotkeys } from '../dist/policy/hotkey-policy.js';

const STATES = ['idle', 'selecting', 'recording', 'encoding'];

test('stop, discard and Esc are NOT held while idle', () => {
  const idle = activeHotkeys('idle');
  for (const action of ['stop', 'discard', 'escape']) {
    assert.ok(!idle.includes(action), `${action} must not be grabbed system-wide while idle`);
  }
});

test('stop, discard and Esc are NOT held during selection', () => {
  // The selection overlay handles its own Esc as a focused window; a global grab would
  // be redundant and would leak the key from other apps.
  const selecting = activeHotkeys('selecting');
  for (const action of ['stop', 'discard', 'escape']) {
    assert.ok(!selecting.includes(action));
  }
});

test('every way to end a recording is live while recording', () => {
  const recording = activeHotkeys('recording');
  for (const action of ['stop', 'escape', 'discard', 'region', 'window', 'screen']) {
    assert.ok(recording.includes(action), `${action} must be bound while recording`);
  }
});

test('only discard is added while encoding — stop and Esc have nothing to stop', () => {
  const encoding = activeHotkeys('encoding');
  assert.ok(encoding.includes('discard'), 'discard aborts an in-flight encode');
  assert.ok(!encoding.includes('stop'));
  assert.ok(!encoding.includes('escape'));
});

test('capture keys are available in every state', () => {
  for (const state of STATES) {
    for (const action of ['region', 'window', 'screen']) {
      assert.ok(activeHotkeys(state).includes(action), `${action} missing in ${state}`);
    }
  }
});

test('no state binds the same action twice', () => {
  for (const state of STATES) {
    const actions = activeHotkeys(state);
    assert.equal(new Set(actions).size, actions.length, `duplicate in ${state}`);
  }
});
