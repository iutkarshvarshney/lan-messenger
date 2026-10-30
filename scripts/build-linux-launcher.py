"""Build the source-visible Linux launcher archive, with reproducible metadata."""
from pathlib import Path
import gzip
import hashlib
import io
import tarfile

root = Path(__file__).resolve().parent.parent
source = root / 'companion' / 'linux'
destination = root / 'public' / 'downloads'
destination.mkdir(parents=True, exist_ok=True)
filename = 'lan-messenger-linux-terminal.tar.gz'
buffer = io.BytesIO()
with gzip.GzipFile(fileobj=buffer, mode='wb', filename='', mtime=0) as compressed:
    with tarfile.open(fileobj=compressed, mode='w') as archive:
        for name in ('README.md', 'install.py', 'terminal_launcher.py'):
            data = (source / name).read_bytes()
            info = tarfile.TarInfo('lan-messenger-linux-terminal/' + name)
            info.size = len(data)
            info.mode = 0o755 if name.endswith('.py') else 0o644
            info.mtime = 0
            archive.addfile(info, io.BytesIO(data))
data = buffer.getvalue()
(destination / filename).write_bytes(data)
(destination / (filename + '.sha256')).write_text(hashlib.sha256(data).hexdigest() + '  ' + filename + '\n')
print('Built', filename, len(data), 'bytes')
