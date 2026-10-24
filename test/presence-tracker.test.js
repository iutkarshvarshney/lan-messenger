const test = require('node:test');
const assert = require('node:assert/strict');

const PresenceTracker = require('../presence-tracker');

test('locking the only session changes the user from online to offline', () => {
    const tracker = new PresenceTracker();
    tracker.connect('socket-1', 7, true);

    const transition = tracker.update('socket-1', false);

    assert.deepEqual(transition, { userId: 7, wasOnline: true, isOnline: false, changed: true });
});

test('an unlocked second session keeps the account online', () => {
    const tracker = new PresenceTracker();
    tracker.connect('socket-1', 7, true);
    tracker.connect('socket-2', 7, true);

    const transition = tracker.update('socket-1', false);

    assert.deepEqual(transition, { userId: 7, wasOnline: true, isOnline: true, changed: false });
});

test('unlocking a session changes an offline user back to online', () => {
    const tracker = new PresenceTracker();
    tracker.connect('socket-1', 7, false);

    const transition = tracker.update('socket-1', true);

    assert.deepEqual(transition, { userId: 7, wasOnline: false, isOnline: true, changed: true });
});

test('disconnecting the last available session changes the user to offline', () => {
    const tracker = new PresenceTracker();
    tracker.connect('socket-1', 7, true);

    const transition = tracker.disconnect('socket-1');

    assert.deepEqual(transition, { userId: 7, wasOnline: true, isOnline: false, changed: true });
});
