import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

SOURCE = Path(__file__).resolve().parents[1] / 'companion' / 'linux'
sys.path.insert(0, str(SOURCE))
import terminal_launcher as launcher
import install as installer


class LocalTerminalTests(unittest.TestCase):
    def test_rejects_commands_queries_encoded_actions_and_extra_arguments(self):
        for uri in ['https://example.com', 'lan-messenger://terminal?cmd=ssh',
                    'lan-messenger://terminal#anything', 'lan-messenger://terminal;id',
                    'lan-messenger://%74erminal', 'lan-messenger://terminal\n',
                    'lan-messenger://terminal/../terminal', 'lan-messenger://other']:
            with self.subTest(uri=uri), self.assertRaises(ValueError):
                launcher.launch(uri)
        self.assertEqual(launcher.main(['lan-messenger://terminal', '--command', 'id']), 2)

    def test_launches_real_fixed_executable_without_passing_any_url_or_command(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            marker = directory / 'started.json'
            terminal = directory / 'terminal-stub'
            terminal.write_text('#!' + sys.executable + '\nimport json,sys\nfrom pathlib import Path\nPath(' + repr(str(marker)) + ').write_text(json.dumps(sys.argv[1:]))\n')
            terminal.chmod(0o700)
            with patch.object(launcher.shutil, 'which', side_effect=lambda name: str(terminal) if name == 'x-terminal-emulator' else None):
                process = launcher.launch('lan-messenger://terminal')
                process.wait(timeout=5)
            self.assertEqual(json.loads(marker.read_text()), [])

    def test_reports_missing_terminal_without_trying_a_shell_command(self):
        with patch.object(launcher.shutil, 'which', return_value=None):
            with self.assertRaises(RuntimeError):
                launcher.launch('lan-messenger://terminal')

    def test_install_and_uninstall_are_user_scoped_and_restore_previous_handler(self):
        with tempfile.TemporaryDirectory(prefix='messenger launcher ') as directory:
            root = Path(directory)
            data, config, tools = root / 'data files', root / 'config', root / 'bin'
            tools.mkdir(); config.mkdir()
            state = config / 'association'
            state.write_text('previous-terminal.desktop')
            cli = tools / 'xdg-mime'
            cli.write_text('#!' + sys.executable + '\nimport os,sys\nfrom pathlib import Path\np=Path(os.environ["XDG_CONFIG_HOME"])/"association"\nif sys.argv[1:3]==["query","default"]:print(p.read_text() if p.exists() else "")\nelse:p.write_text(sys.argv[2])\n')
            cli.chmod(0o700)
            terminal = tools / 'x-terminal-emulator'
            terminal.write_text('#!/bin/sh\nexit 0\n'); terminal.chmod(0o700)
            env = {'XDG_DATA_HOME': str(data), 'XDG_CONFIG_HOME': str(config), 'PATH': str(tools) + os.pathsep + os.environ['PATH']}
            with patch.dict(os.environ, env):
                installed = installer.install()
                self.assertTrue((installed / 'terminal_launcher.py').is_file())
                self.assertEqual(state.read_text(), installer.DESKTOP_ID)
                self.assertEqual(installed.stat().st_mode & 0o777, 0o700)
                installer.uninstall()
                self.assertEqual(state.read_text(), 'previous-terminal.desktop')
                self.assertFalse((data / 'applications' / installer.DESKTOP_ID).exists())
                self.assertFalse(installed.exists())

    def test_refuses_root_installation(self):
        with patch.object(installer.os, 'geteuid', return_value=0), self.assertRaises(RuntimeError):
            installer.install()

    def test_uninstall_does_not_delete_an_unknown_desktop_entry(self):
        with tempfile.TemporaryDirectory() as directory:
            data = Path(directory) / 'data'
            desktop = data / 'applications' / installer.DESKTOP_ID
            desktop.parent.mkdir(parents=True)
            desktop.write_text('Unrelated existing desktop entry')
            with patch.dict(os.environ, {'XDG_DATA_HOME': str(data)}):
                with self.assertRaises(RuntimeError):
                    installer.uninstall()
            self.assertEqual(desktop.read_text(), 'Unrelated existing desktop entry')


if __name__ == '__main__':
    unittest.main()
