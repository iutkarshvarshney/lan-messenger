"""Vendor the supplied applets' public assets for LAN-only play."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import re, urllib.request

root=Path(__file__).resolve().parent.parent
jobs={}
for slug,folder,base in [
 ('desk-racer','desk-racer','https://www.gstatic.com/aistudio/starter-apps/desk-racer/'),
 ('rally-club','argon-tennis','https://www.gstatic.com/aistudio/starter-apps/tennis/')]:
 source=root/'games-src'/folder
 paths=set()
 for file in source.rglob('*'):
  if 'node_modules' in file.parts or file.suffix not in ['.js','.css','.html']:continue
  text=file.read_text()
  for url in re.findall(r'https://www\.gstatic\.com/aistudio/starter-apps/[^\s\x27"`<>]+',text):
   if url.startswith(base):
    value=url[len(base):].split('?')[0]
    if re.search(r'\.(glb|png|mp3|wav)$',value):paths.add(value)
 if slug=='desk-racer':paths.update('models/'+x for x in ['desk_props.glb','track_coaster.glb','kart_1to87.glb','room_environment.glb'])
 for rel in paths:jobs[(source/'public'/'assets'/rel)]=base+rel

def fetch(job):
 path,url=job
 if path.exists() and path.stat().st_size:return str(path.relative_to(root))+' cached'
 try:
  with urllib.request.urlopen(url,timeout=50) as response:data=response.read()
  path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
  return str(path.relative_to(root))+': '+str(len(data))
 except Exception as e:return 'FAILED '+url+' '+str(e)

with ThreadPoolExecutor(max_workers=8) as pool:
 for result in pool.map(fetch,jobs.items()):print(result,flush=True)
