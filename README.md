# LAN Messenger

A self-hosted LAN messenger with private and group conversations, file sharing, voice calls, account recovery and an integrated multiplayer/solo arcade. The interface adapts to mobile and desktop screens.

## Run locally

Use Node.js20 or22 with npm. Native SQLite installation may require a C++ build toolchain.

```sh
npm ci
npm start
```

Development serves HTTP on port3000. The control panel uses port3090; set `ADMIN_PANEL_PASSWORD` explicitly to access it. Development generates a fresh signing secret at startup unless `JWT_SECRET` is set. Production requires a configured signing secret.

## Docker deployment

Copy `.env.example` to `.env`, replace both example secrets with independent random values, and keep that file private. Docker named volumes preserve the database, uploads and certificates.

```sh
cp .env.example .env
# Edit .env before continuing.
./deploy.sh
```

Messenger HTTPS uses port3443; HTTP uses3000; the account control panel uses3090. Voice calls and browser notifications require a trusted secure origin. Set `SERVER_IP` for first certificate generation, or install a certificate for a stable hostname. When changing the server address, renew the HTTPS certificate as needed. Account recovery codes remain valid when the IP changes. Browser-held encryption keys belong to the browser origin, so use a stable HTTPS hostname for continuity.

Never remove the `messenger-db`, `messenger-uploads` or `messenger-certs` volumes to update the app. Back up persistent data before deployment. Keep the control panel restricted to trusted administrators and networks.

## Private password recovery

While signed in, open **Menu → Account security**, confirm your current password and download ten private recovery codes. The server stores hashes and cannot display the codes again. Save them offline before losing access.

**Forgot Password** accepts your username and one unused code. After verification you have two minutes to choose and confirm a new password. Reset credentials cannot open chats or files. A successful reset revokes existing sessions, pending reset requests and old recovery codes. Sign in normally and save a fresh code set. Codes belong to the account; there is no MAC-address, client hardware-ID or server-IP reset shortcut. The control panel lists/deletes accounts but cannot set passwords or generate recovery codes. There is no admin recovery bypass if codes were never saved or all copies were lost.

Password recovery does not reconstruct missing local encryption keys. The project contains an existing Signal integration and legacy fallback behavior; it has not undergone an independent security audit. Do not treat account recovery or transport encryption as a guarantee against a malicious host administrator.

## Screen sharing and Linux terminal

Connect a private voice call, then choose **Share your screen** on the call card. Your browser asks you to select a screen/window each time. The call keeps microphone audio separate. Both participants can share independently; the viewer supports fullscreen and minimise, and chat remains available. Use **Stop sharing**, the browser's native stop button, or end the call to stop capture. No screen recording is stored on the server. Sharing requires a supported desktop browser and HTTPS; viewers do not need a local launcher.

**Menu → Web terminal** (also in the sidebar) opens an SSH terminal directly inside Messenger. Enter your Linux PC’s LAN IPv4 address, SSH username, and password or private key. The target PC must already run SSH and be reachable from the Messenger server. Use HTTPS; the terminal shares Messenger’s existing port. Confirm the target host’s SHA256 fingerprint before authentication, or supply a known fingerprint. On the target PC, check it with `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub -E sha256` (the negotiated host-key algorithm may differ).

SSH credentials, commands and output pass through the trusted Messenger backend in memory; they are not saved or logged by Messenger. The target system may keep its own shell history or audit logs. The terminal renderer is isolated in a sandboxed frame with no Messenger token or network access. Close/disconnect ends SSH; minimise keeps the connection running so chat and calls remain usable. Account revocation closes active sessions. Default limits: two sessions per user, 32 server-wide, 20 minutes of inactivity, and bounded input/output buffers.

By default, targets must be literal private IPv4 addresses and use port 22. Set `WEB_TERMINAL_CIDRS` to narrow permitted LAN subnets and `WEB_TERMINAL_PORTS` to allow other SSH ports. No hostnames, public targets, forwarded SSH agent, or default server credentials are used. The optional loopback override is only available outside production for isolated tests.

Rebuild locally vendored terminal assets and their licenses after updating xterm:

```bash
npm run build:terminal
```

The older native launcher remains in `companion/linux` for previously installed users; the web terminal does not require it.


## Games and UI builds

The repository includes game sources, prebuilt scenes and the React/Vite inbox and dice UI. Multiplayer games include Ludo, Wizard Chess, Rally Club, Scribble, Memory Match, three-round Word Guess, Reversi, Gomoku and arcade classics. Solo games include Desk Racer,2048, Breakout, Snake and Minesweeper.

```sh
npm ci --prefix ui
npm run build:ui
# Install source dependencies before rebuilding the embedded scenes:
npm ci --prefix games-src/wizard-chess-3d
npm ci --prefix games-src/argon-tennis
npm ci --prefix games-src/desk-racer
npm run build:games
npm test
```

The large optional downloaded GIF/meme sticker cache is omitted. Core source, game assets, fonts and icons are included; user databases, uploaded media, certificates, credentials, logs and operational backups are excluded. Keep third-party notices shipped with the game sources and assets.

Integration scripts under `scripts/verify-*.js` create temporary accounts and must run only against an isolated localhost test database on the documented ports. They are not production health checks.
