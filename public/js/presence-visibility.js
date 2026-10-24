(function exposePresenceVisibility(root) {
    function getPresenceAvailability(visibilityState, screenState = 'unlocked') {
        return visibilityState === 'visible' && screenState !== 'locked';
    }

    const api = { getPresenceAvailability };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root) root.PresenceVisibility = api;
})(typeof window !== 'undefined' ? window : globalThis);
