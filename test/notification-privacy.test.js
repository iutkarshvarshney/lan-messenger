const test = require('node:test');
const assert = require('node:assert/strict');

const { buildPrivateMessageNotification } = require('../public/js/notification-privacy');

test('incoming-message notification exposes the sender but never message content', () => {
    const notification = buildPrivateMessageNotification({
        sender_name: 'Priya',
        content: 'quarterly salary details',
        ciphertext: 'encrypted-secret',
        _decrypted: 'meet me beside the main gate',
        file_name: 'confidential-payroll.xlsx',
        caption: 'do not share this file'
    });

    assert.deepEqual(notification, {
        title: 'Priya',
        body: 'Private message'
    });

    const visiblePopupText = JSON.stringify(notification);
    assert.doesNotMatch(visiblePopupText, /salary|encrypted-secret|main gate|payroll|do not share/i);
});

test('incoming-message notification uses a private fallback when the sender name is absent', () => {
    assert.deepEqual(buildPrivateMessageNotification({
        _decrypted: 'hidden text'
    }), {
        title: 'LAN Messenger',
        body: 'Private message'
    });
});
