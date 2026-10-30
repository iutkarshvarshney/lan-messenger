#!/usr/bin/env python3
"""Open this desktop user's terminal. No commands or data are accepted from URLs."""
from pathlib import Path
import shutil
import subprocess
import sys

URI = 'lan-messenger://terminal'
TERMINALS = (
    ('x-terminal-emulator', ()), ('gnome-terminal', ('--window',)),
    ('konsole', ('--new-window',)), ('xfce4-terminal', ('--window',)),
    ('mate-terminal', ('--window',)), ('kgx', ()), ('ptyxis', ('--new-window',)),
    ('kitty', ()), ('alacritty', ()), ('xterm', ()),
)


def terminal_command():
    for name, arguments in TERMINALS:
        executable = shutil.which(name)
        if executable:
            return [executable, *arguments]
    raise RuntimeError('No supported terminal was found. Install a Linux terminal emulator, then try again.')


def launch(uri):
    if not isinstance(uri, str) or uri not in (URI, URI + '/'):
        raise ValueError('Only the fixed LAN Messenger terminal action is supported.')
    if not sys.platform.startswith('linux'):
        raise RuntimeError('This launcher supports Linux desktops only.')
    return subprocess.Popen(terminal_command(), cwd=str(Path.home()), shell=False,
                            start_new_session=True, close_fds=True,
                            stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL)


def main(arguments=None):
    arguments = sys.argv[1:] if arguments is None else arguments
    if len(arguments) != 1:
        print('Open the Terminal action from LAN Messenger.', file=sys.stderr)
        return 2
    try:
        launch(arguments[0])
        return 0
    except (ValueError, RuntimeError, OSError) as error:
        print(str(error), file=sys.stderr)
        notifier = shutil.which('notify-send')
        if notifier:
            subprocess.run([notifier, 'LAN Messenger terminal', str(error)], check=False)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
