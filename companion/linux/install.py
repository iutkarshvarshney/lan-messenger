#!/usr/bin/env python3
"""Install/uninstall the fixed-action desktop launcher for the current user only."""
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

from terminal_launcher import terminal_command

DESKTOP_ID = 'org.lanmessenger.Terminal.desktop'
MIME = 'x-scheme-handler/lan-messenger'


def paths():
    def base(name, default):
        value = Path(os.environ.get(name, str(default)))
        return value if value.is_absolute() else default
    data = base('XDG_DATA_HOME', Path.home() / '.local/share')
    config = base('XDG_CONFIG_HOME', Path.home() / '.config')
    for value in (str(data), str(config)):
        if '\n' in value or '\r' in value:
            raise RuntimeError('The desktop data/config path contains an unsupported newline.')
    return data / 'lan-messenger-terminal', data / 'applications' / DESKTOP_ID, config


def run_mime(*arguments):
    return subprocess.run(['xdg-mime', *arguments], check=True, text=True,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout.strip()


def check_user():
    if not sys.platform.startswith('linux') or os.geteuid() == 0:
        raise RuntimeError('Run this installer as your normal Linux desktop user, without sudo.')
    if not shutil.which('xdg-mime'):
        raise RuntimeError('Install xdg-utils for your Linux desktop, then run this installer again.')


def exec_argument(value):
    # Desktop Entry escaping is applied before Exec argument quoting/field codes.
    value = str(value).replace('\\', '\\\\\\\\').replace('"', '\\\\"')
    value = value.replace('`', '\\\\`').replace('$', '\\\\$').replace('%', '%%')
    return '"' + value + '"'


def remove_our_association(config, desktop):
    for location in (config / 'mimeapps.list', desktop.parent / 'mimeapps.list'):
        if not location.is_file() or location.is_symlink():
            continue
        lines = location.read_text().splitlines(keepends=True)
        result = []
        for line in lines:
            if line.startswith(MIME + '='):
                values = [value for value in line.rstrip('\r\n').split('=', 1)[1].split(';') if value and value != DESKTOP_ID]
                if values:
                    result.append(MIME + '=' + ';'.join(values) + ';\n')
            else:
                result.append(line)
        if result != lines:
            location.write_text(''.join(result))


def install():
    check_user()
    terminal_command()
    directory, desktop, config = paths()
    if directory.is_symlink() or desktop.is_symlink():
        raise RuntimeError('Refusing to replace a symbolic-link launcher location.')
    state_file = directory / 'installation.json'
    if desktop.exists() and not state_file.is_file():
        raise RuntimeError('A different desktop launcher already uses this filename; no files were changed.')
    current_default = run_mime('query', 'default', MIME)
    previous = current_default
    if previous == DESKTOP_ID and state_file.is_file():
        previous = json.loads(state_file.read_text()).get('previous', '')
    if previous and not re.fullmatch(r'[A-Za-z0-9_.-]+\.desktop', previous):
        previous = ''
    original = {}
    for item in (directory / 'terminal_launcher.py', state_file, desktop):
        if item.is_symlink():
            raise RuntimeError('Refusing to replace symbolic-link launcher files.')
        original[item] = (item.read_bytes(), item.stat().st_mode & 0o777) if item.exists() else None
    try:
        directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        directory.chmod(0o700)
        desktop.parent.mkdir(parents=True, exist_ok=True)
        target = directory / 'terminal_launcher.py'
        shutil.copyfile(Path(__file__).with_name('terminal_launcher.py'), target)
        target.chmod(0o700)
        # Use the desktop's system Python, not a temporary download/virtualenv.
        python = '/usr/bin/python3' if Path('/usr/bin/python3').is_file() else sys.executable
        desktop.write_text('[Desktop Entry]\nType=Application\nName=LAN Messenger local terminal\n'
                           'Comment=Open your own terminal from LAN Messenger\n'
                           'Exec=' + exec_argument(python) + ' ' + exec_argument(target) + ' %u\n'
                           'Terminal=false\nNoDisplay=true\nMimeType=' + MIME + ';\n')
        desktop.chmod(0o644)
        state_file.write_text(json.dumps({'version': 1, 'previous': previous}))
        state_file.chmod(0o600)
        run_mime('default', DESKTOP_ID, MIME)
        if run_mime('query', 'default', MIME) != DESKTOP_ID:
            raise RuntimeError('The desktop did not accept the launcher association.')
    except Exception:
        remove_our_association(config, desktop)
        if current_default:
            try:
                run_mime('default', current_default, MIME)
            except (subprocess.CalledProcessError, OSError):
                pass
        for item, old in original.items():
            if old:
                item.write_bytes(old[0]); item.chmod(old[1])
            elif item.exists():
                item.unlink()
        try:
            directory.rmdir()
        except OSError:
            pass
        raise
    return directory


def uninstall():
    check_user()
    directory, desktop, config = paths()
    if directory.is_symlink() or desktop.is_symlink():
        raise RuntimeError('Refusing to remove symbolic-link launcher locations.')
    state = directory / 'installation.json'
    if state.is_symlink():
        raise RuntimeError('Refusing to remove a symbolic-link installation record.')
    if not state.is_file():
        if desktop.exists() or directory.exists():
            raise RuntimeError('No matching installation record was found; existing files were not removed.')
        return
    record = json.loads(state.read_text())
    if record.get('version') != 1:
        raise RuntimeError('The installation record is not recognised; no files were removed.')
    previous = record.get('previous', '')
    if run_mime('query', 'default', MIME) == DESKTOP_ID:
        remove_our_association(config, desktop)
        if re.fullmatch(r'[A-Za-z0-9_.-]+\.desktop', previous):
            run_mime('default', previous, MIME)
    for item in (desktop, directory / 'terminal_launcher.py', state):
        if item.is_file() and not item.is_symlink():
            item.unlink()
    try:
        directory.rmdir()
    except OSError:
        pass


def main():
    try:
        if sys.argv[1:] == ['--uninstall']:
            uninstall(); print('LAN Messenger terminal launcher removed.')
        elif not sys.argv[1:]:
            install(); print('Installed for this desktop user. Return to Messenger and choose Open local terminal. Your browser may ask permission.')
        else:
            print('Usage: python3 install.py [--uninstall]', file=sys.stderr); return 2
        return 0
    except (RuntimeError, OSError, ValueError, subprocess.CalledProcessError) as error:
        print('Installation was not completed: ' + str(error), file=sys.stderr); return 1


if __name__ == '__main__':
    raise SystemExit(main())
