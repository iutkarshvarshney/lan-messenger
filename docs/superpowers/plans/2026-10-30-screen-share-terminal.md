# Screen Share and Linux Terminal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Share screens during existing private calls and launch each Linux user's own terminal from Messenger.
**Architecture:** Reserve a WebRTC video transceiver in outgoing offers; reusable browser capture controller owns media cleanup; a scoped server call relay owns identities and socket endpoints. Fixed-action Linux desktop protocol launcher opens the user's native terminal with no command transport.
**Tech Stack:** Existing Express/Socket.IO, browser WebRTC/getDisplayMedia, Python3, freedesktop desktop associations. No new Node runtime dependencies.
**Spec:** docs/superpowers/specs/2026-10-30-screen-share-terminal-design.md

## Global Constraints
- Preserve HTTPS3443/HTTP3000/control3090 and all persistent volumes/account data.
- Browser capture requires explicit native picker; no recording or server storage.
- Local terminal runs as the desktop user; no SSH passwords/commands sent through Messenger.
- Native launcher accepts only lan-messenger://terminal (optional trailing slash), no query/fragment/alternate action/arguments; no shell=True.
- Work in isolated branch; isolated localhost QA only, never production QA users/conversations.

## Review Focus
- Picker resolves after call teardown: acquired tracks stop, no new-call contamination.
- A different socket/account or stale callId attempts signals: no relay/control of active session.
- Callee transceiver reuse: video works in both directions without dropping microphone audio.
- Stop/restart/native stop/minimise: predictable viewer and complete cleanup on end/logout/disconnect.
- Protocol injection and installation failure: no URL-derived commands, no false installed/success state.

### Task1: Scoped call signaling
Files: create call-service.js, test/call-service.test.js; modify server.js call event wiring.
Interfaces: CallRelay({io,db,timeoutMs=45000}).attach(socket); authenticated socket.user; offer/answer/ICE/screen/end/reject all carry callId, conversationId, targetUserId. SDP descriptions and ICE bounded/validated, participant/socket identity checked. pending timeout/missed logs once, accepted calls cleared on disconnect. notify other same-account devices when one answers.
- [ ] Add failing tests for private membership, busy/self/outsider/stale call rejection, owner sockets, screen boolean validation, cleanup/replay.
- [ ] Run node --test test/call-service.test.js (RED).
- [ ] Implement CallRelay and replace generic call relay registration in server.js.
- [ ] Run focused and full npm test (GREEN); commit.

### Task2: Screen sharing in calls
Files: create public/js/screen-share.js, public/css/screen-share.css, test/screen-share.test.js; modify app.js/index.html.
Interfaces: ScreenShare.Controller({peer,mediaDevices,isCurrent,signal,onChange,makeStream}).setSender(sender), start(), stop(), receive(track), setRemoteSharing(bool), close(), snapshot(). Call id lives on state.call. onChange updates call share controls/local preview/remote viewer. Outgoing peer reserves video; incoming peer reuses negotiated video before answer. ICE queued until offer/answer sent; errors and events scoped by callId/peer identity.
- [ ] Failing tests for replaceTrack, microphone preservation, cancel/late capture/stop race, native ended, remote track visibility/cleanup.
- [ ] Implement controller and UI with fullscreen/minimise, responsive sizing, unsupported/cancel states and SVG icons.
- [ ] Verify browser real two-peer audio/video exchange, both directions, stop/restart/end, chat still usable, mobile widths. Run full tests; commit.

### Task3: Linux local terminal
Files: create companion/linux/terminal_launcher.py, install.py, README.md; public/js/local-terminal.js, public/css/local-terminal.css; scripts/build-linux-launcher.py; test/terminal_launcher_test.py; modify index.html/README.
Interfaces: exact fixed URI, installed desktop handler; installer installs for current user only via XDG paths, rejects root, verifies desktop association, no network service. Archive public/downloads/lan-messenger-linux-terminal.tar.gz generated deterministically from sources.
- [ ] Add failing tests for rejected command/query/encoded/newline/multiple arguments and fixed safe terminal launch; isolated XDG install/rollback checks.
- [ ] Implement launcher/installer and responsive download/open/setup dialog, never accepting URL commands.
- [ ] Run python3 -m unittest discover -s test -p '*_test.py'; actual desktop validation where available, plus browser UI/download checks; npm test; commit.

### Task4: Review and release
- [ ] Fresh read-only whole-branch review, fix important findings with focused regression checks.
- [ ] Verify full suite, launcher archive, clean source/secret audit, browser screenshots and isolated signaling/media integration.
- [ ] Sync tested files to deployment source, extend existing staging bundle and executable checks, backup/deploy with rollback, verify live file hashes/ports/volume preservation.
- [ ] Integrate authorized branch into public GitHub source and verify pushed ref; leave local terminal installation to each user's explicit setup action.
