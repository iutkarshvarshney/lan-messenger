class PresenceTracker {
    constructor() {
        this.sessions = new Map();
    }

    isOnline(userId) {
        for (const session of this.sessions.values()) {
            if (session.userId === userId && session.available) return true;
        }
        return false;
    }

    transition(userId, wasOnline) {
        const isOnline = this.isOnline(userId);
        return { userId, wasOnline, isOnline, changed: wasOnline !== isOnline };
    }

    connect(socketId, userId, available = true) {
        const wasOnline = this.isOnline(userId);
        this.sessions.set(socketId, { userId, available: Boolean(available) });
        return this.transition(userId, wasOnline);
    }

    update(socketId, available) {
        const session = this.sessions.get(socketId);
        if (!session) return null;
        const wasOnline = this.isOnline(session.userId);
        session.available = Boolean(available);
        return this.transition(session.userId, wasOnline);
    }

    disconnect(socketId) {
        const session = this.sessions.get(socketId);
        if (!session) return null;
        const wasOnline = this.isOnline(session.userId);
        this.sessions.delete(socketId);
        return this.transition(session.userId, wasOnline);
    }
}

module.exports = PresenceTracker;
