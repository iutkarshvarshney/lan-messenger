(function exposeCallSounds(root) {
    const SILENT_PATTERN = Object.freeze({ loop: false, repeatAfterMs: 0, notes: [] });
    const PATTERNS = Object.freeze({
        outgoing: Object.freeze({
            loop: true,
            repeatAfterMs: 2600,
            notes: Object.freeze([
                Object.freeze({ frequency: 440, delayMs: 0, durationMs: 420, volume: 0.11 }),
                Object.freeze({ frequency: 480, delayMs: 0, durationMs: 420, volume: 0.08 }),
                Object.freeze({ frequency: 440, delayMs: 620, durationMs: 420, volume: 0.11 }),
                Object.freeze({ frequency: 480, delayMs: 620, durationMs: 420, volume: 0.08 })
            ])
        }),
        incoming: Object.freeze({
            loop: true,
            repeatAfterMs: 2200,
            notes: Object.freeze([
                Object.freeze({ frequency: 880, delayMs: 0, durationMs: 260, volume: 0.15 }),
                Object.freeze({ frequency: 660, delayMs: 330, durationMs: 260, volume: 0.15 }),
                Object.freeze({ frequency: 880, delayMs: 660, durationMs: 340, volume: 0.15 })
            ])
        }),
        connected: Object.freeze({
            loop: false,
            repeatAfterMs: 0,
            notes: Object.freeze([
                Object.freeze({ frequency: 660, delayMs: 0, durationMs: 120, volume: 0.12 }),
                Object.freeze({ frequency: 880, delayMs: 130, durationMs: 190, volume: 0.12 })
            ])
        }),
        hangup: Object.freeze({
            loop: false,
            repeatAfterMs: 0,
            notes: Object.freeze([
                Object.freeze({ frequency: 660, delayMs: 0, durationMs: 150, volume: 0.13 }),
                Object.freeze({ frequency: 440, delayMs: 150, durationMs: 240, volume: 0.13 })
            ])
        }),
        ended: Object.freeze({
            loop: false,
            repeatAfterMs: 0,
            notes: Object.freeze([
                Object.freeze({ frequency: 520, delayMs: 0, durationMs: 180, volume: 0.12 }),
                Object.freeze({ frequency: 390, delayMs: 190, durationMs: 260, volume: 0.12 })
            ])
        }),
        declined: Object.freeze({
            loop: false,
            repeatAfterMs: 0,
            notes: Object.freeze([
                Object.freeze({ frequency: 260, delayMs: 0, durationMs: 180, volume: 0.13 }),
                Object.freeze({ frequency: 220, delayMs: 240, durationMs: 280, volume: 0.13 })
            ])
        })
    });

    function getCallTonePattern(kind) {
        const pattern = PATTERNS[kind];
        if (!pattern) return { ...SILENT_PATTERN };
        return {
            loop: pattern.loop,
            repeatAfterMs: pattern.repeatAfterMs,
            notes: pattern.notes.map(note => ({ ...note }))
        };
    }

    function createCallSoundManager() {
        let context = null;
        let repeatTimer = null;
        const activeOscillators = new Set();

        function getContext() {
            if (context) return context;
            const AudioContextClass = root?.AudioContext || root?.webkitAudioContext;
            if (!AudioContextClass) return null;
            context = new AudioContextClass();
            return context;
        }

        async function unlock() {
            const ctx = getContext();
            if (ctx?.state === 'suspended') {
                try { await ctx.resume(); } catch (e) { }
            }
        }

        function stop() {
            if (repeatTimer) clearInterval(repeatTimer);
            repeatTimer = null;
            activeOscillators.forEach(oscillator => {
                try { oscillator.stop(); } catch (e) { }
            });
            activeOscillators.clear();
        }

        function playNotes(notes) {
            const ctx = getContext();
            if (!ctx) return;
            if (ctx.state === 'suspended') ctx.resume().catch(() => { });

            notes.forEach(note => {
                const startAt = ctx.currentTime + (note.delayMs / 1000);
                const endAt = startAt + (note.durationMs / 1000);
                const oscillator = ctx.createOscillator();
                const gain = ctx.createGain();
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(note.frequency, startAt);
                gain.gain.setValueAtTime(0.0001, startAt);
                gain.gain.exponentialRampToValueAtTime(note.volume, startAt + 0.02);
                gain.gain.setValueAtTime(note.volume, Math.max(startAt + 0.02, endAt - 0.05));
                gain.gain.exponentialRampToValueAtTime(0.0001, endAt);
                oscillator.connect(gain);
                gain.connect(ctx.destination);
                activeOscillators.add(oscillator);
                oscillator.onended = () => activeOscillators.delete(oscillator);
                oscillator.start(startAt);
                oscillator.stop(endAt + 0.01);
            });
        }

        function play(kind) {
            stop();
            const pattern = getCallTonePattern(kind);
            if (!pattern.notes.length) return;
            playNotes(pattern.notes);
            if (pattern.loop) {
                repeatTimer = setInterval(() => playNotes(pattern.notes), pattern.repeatAfterMs);
            }
        }

        return {
            unlock,
            stop,
            playOutgoing: () => play('outgoing'),
            playIncoming: () => play('incoming'),
            playConnected: () => play('connected'),
            playHangup: () => play('hangup'),
            playEnded: () => play('ended'),
            playDeclined: () => play('declined')
        };
    }

    const api = { getCallTonePattern, createCallSoundManager };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root) root.CallSounds = api;
})(typeof window !== 'undefined' ? window : globalThis);
