(function exposeNotificationPrivacy(root) {
    function buildPrivateMessageNotification(message = {}) {
        return {
            title: message.sender_name || 'LAN Messenger',
            body: 'Private message'
        };
    }

    const api = { buildPrivateMessageNotification };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.NotificationPrivacy = api;
    }
})(typeof window !== 'undefined' ? window : globalThis);
