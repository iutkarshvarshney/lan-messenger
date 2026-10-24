const test = require('node:test');
const assert = require('node:assert/strict');

const { getCallTonePattern } = require('../public/js/call-sounds');

test('outgoing and incoming ringing use distinct repeating sound patterns', () => {
    const outgoing = getCallTonePattern('outgoing');
    const incoming = getCallTonePattern('incoming');

    assert.equal(outgoing.loop, true);
    assert.equal(incoming.loop, true);
    assert.notDeepEqual(outgoing.notes, incoming.notes);
    assert.ok(outgoing.repeatAfterMs > 0);
    assert.ok(incoming.repeatAfterMs > 0);
});

test('connected sound is a short one-time confirmation tone', () => {
    const connected = getCallTonePattern('connected');

    assert.equal(connected.loop, false);
    assert.equal(connected.notes.length, 2);
    assert.ok(connected.notes.every(note => note.durationMs <= 250));
});

test('hangup, remote end, and declined calls use distinct one-time sounds', () => {
    const hangup = getCallTonePattern('hangup');
    const ended = getCallTonePattern('ended');
    const declined = getCallTonePattern('declined');

    assert.equal(hangup.loop, false);
    assert.equal(ended.loop, false);
    assert.equal(declined.loop, false);
    assert.ok(hangup.notes.length > 0);
    assert.ok(ended.notes.length > 0);
    assert.ok(declined.notes.length > 0);
    assert.notDeepEqual(hangup.notes, ended.notes);
    assert.notDeepEqual(hangup.notes, declined.notes);
    assert.notDeepEqual(ended.notes, declined.notes);
});

test('unknown call sound has no audible notes', () => {
    assert.deepEqual(getCallTonePattern('unknown'), {
        loop: false,
        repeatAfterMs: 0,
        notes: []
    });
});
