const test = require('node:test');
const assert = require('node:assert/strict');

const { getPresenceAvailability } = require('../public/js/presence-visibility');

test('a hidden messenger page is immediately unavailable', () => {
    assert.equal(getPresenceAvailability('hidden', 'unlocked'), false);
});

test('a locked screen is unavailable even if visibility has not updated yet', () => {
    assert.equal(getPresenceAvailability('visible', 'locked'), false);
});

test('a visible page on an unlocked screen is available', () => {
    assert.equal(getPresenceAvailability('visible', 'unlocked'), true);
});
