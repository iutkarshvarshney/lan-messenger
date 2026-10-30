# Embedded Web SSH Terminal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans task-by-task.

**Goal:** Replace launcher installation with an authenticated SSH terminal inside Messenger.
**Architecture:** SSH2 client sessions scoped to a separate same-port Socket.IO transport; parent connection UI; opaque sandboxed xterm iframe; explicit per-connection SSH host verification.
**Tech Stack:** Node20+, Socket.IO, ssh2@1.17.0, @xterm/xterm@6.0.0, @xterm/addon-fit@0.11.0.
**Spec:** docs/superpowers/specs/2026-10-30-web-ssh-terminal-design.md

## Global Constraints
- No client download/install/custom protocol in normal UI; target PC requires reachable SSH.
- No credentials/commands/output saved or logged; no server OS shell/agent/default credentials.
- Literal RFC1918 IPv4 only; configured allowed ports default22; loopback QA only outsideproduction.
-1session/socket,2/user,32total; input16KiB,transport64KiB; output window256KiB/hardcap1MiB.
-20minute inactivity,60second connect,30second host trust; owning socket+current auth version required for all operations.
- Keep production ports, data volumes and existing features intact.

## Review Focus
- Session ids and callbacks arriving after close/logout/reconnect must not revive or attach a stale shell.
- Host keys must be confirmed before target auth; cancelled/timed-out verifier resolves false and closes.
- Slow/hidden clients or fast remote output must not grow unbounded buffers; UTF8 chunks and resize must stay correct.
- Password change/account deletion must stop output as well as input, independent of cooperative clients.
- Remote terminal data must not execute DOM/script/clipboard/link actions or access Messenger storage.

### Task1: SSH gateway
Files web-terminal-policy.js,web-terminal-service.js,test/web-terminal.test.js,server.js.
Interfaces gateway.attach(terminalIO), revokeUser(id), shutdown(); injected db.getAuthState/verifyToken. Separate /terminal-socket transport; connect(requestId,host,port,username,auth,rows,cols,expectedFingerprint) returns sessionId; trust/input/resize/ack/disconnect all session-scoped.
- [x] Add failing tests for policy, owner/auth/origin/TLS, host confirmation, stale teardown, backpressure and quotas.
- [x] Implement server gateway + revocation wiring; run focused/full tests.

### Task2: Embedded terminal UI
Files replace public/js/local-terminal.js/CSS; create terminal-view.html,terminal-frame.js; vendor xterm through scripts/build-terminal-assets.mjs; update index/menu/README/envexample.
Interfaces sandbox messages require source identity+random frame nonce; only data/resize/render acknowledgements cross iframe, never JWT/credentials. Parent owns transport, connection/trust UI, cancel/disconnect/minimise, serialized input and memory-only secrets.
- [x] Verify vendored licenses; implement guarded parent/frame state and clear all connection secrets on submit/close/logout.
- [x] Browser QA for interactive echo/ANSI/UTF8/paste/resize/close/reconnect, stale responses and mobile layout; ensure no launcher download card.

### Task3: Real SSH integration and release
- [x] Isolated SSH2 server tests for password/key authentication, fingerprint rejection/approval, PTY I/O/resize, owner separation/revocation and cleanup; native OpenSSH test if available without changing user configuration.
- [x] Run existing recovery/group/call/game suites, full Node/Python checks and source audit; one fresh whole-branch review and regressions for findings.
- [x] Package new pure JS runtime dependencies and static vendor assets, preserve native SQLite; stage tests + backup/rollback deploy on same ports, verify live hashes and data/env preservation.
- [x] Merge/push authorized public source; verify remote ref and document SSH-on-target requirement.
