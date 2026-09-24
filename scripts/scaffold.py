#!/usr/bin/env python3
"""Copy the self-contained website template into a new project directory."""
from pathlib import Path
import argparse, shutil
p=argparse.ArgumentParser(description=__doc__);p.add_argument('destination',type=Path);a=p.parse_args()
destination=a.destination.expanduser().resolve()
if destination.exists() and any(destination.iterdir()):p.error('Destination must be empty; existing projects are never overwritten.')
source=Path(__file__).resolve().parents[1]/'assets/template'
shutil.copytree(source,destination,dirs_exist_ok=True,ignore=shutil.ignore_patterns('node_modules','dist','__pycache__','models','vision','photos'))
for name in ['LICENSE','THIRD_PARTY_NOTICES.md']:
    shutil.copy2(source.parents[1]/name,destination/name)
print(f'Created {destination}\nNext: cd into this directory, then npm ci && npm run dev')
