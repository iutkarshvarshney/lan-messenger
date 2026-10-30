# LAN Messenger — Linux local terminal launcher

This opens your normal Linux terminal as your desktop user. SSH commands, SSH
keys, passwords and terminal output stay on your PC. It does not expose a shell
to Messenger, start a background service, listen on a port or contact a server.

## Install once

1. Extract the downloaded archive.
2. Open a terminal in its `lan-messenger-linux-terminal` folder.
3. Run `python3 install.py` as your normal desktop user, **without sudo**.
4. Return to Messenger, open **Terminal**, then **Open local terminal**.
5. Allow the browser to open the installed launcher if it asks.

Requires Python3, xdg-utils and an installed Linux terminal emulator. The
launcher first uses the system's `x-terminal-emulator` alternative, with common
GNOME, KDE, XFCE and other terminal emulators as fallbacks. Your existing shell,
SSH configuration and SSH agent remain available in the terminal.

This is a native terminal window on your PC, not an embedded web terminal or a
terminal on the Messenger server. Only the exact `lan-messenger://terminal`
action is accepted. URLs cannot supply commands, hosts, passwords or arguments.

The installer writes only this user's XDG data/application files and registers
the URL handler through xdg-mime. It does not install packages or change system
files. If your desktop/browser blocks external handlers, use its Open/Allow
prompt, or open the terminal normally from your applications menu.

## Uninstall

From this extracted folder, run `python3 install.py --uninstall`. This removes
the launcher and restores the previous handler, when one was registered.
