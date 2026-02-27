#!/usr/bin/env python3
"""
Sync exercise GIFs from OneDrive/Aspira into public/gifs/ and update the manifest.

Usage:
    # Activate specific exercises by Aspira name:
    python scripts/sync_exercises.py "Archer Pull-Up" "Band Biceps Curl"

    # Activate all exercises in a muscle group:
    python scripts/sync_exercises.py --group Biceps

    # Activate all exercises:
    python scripts/sync_exercises.py --all

    # Dry run (show what would change):
    python scripts/sync_exercises.py --dry-run "Archer Pull-Up"

    # List all groups:
    python scripts/sync_exercises.py --list-groups

    # Show stats:
    python scripts/sync_exercises.py --stats
"""

import argparse
import json
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = REPO_ROOT / "public" / "gifs" / "_exercise_manifest.json"
GIF_DIR = REPO_ROOT / "public" / "gifs"

# OneDrive source for Aspira GIFs
ONEDRIVE_ASPIRA = Path.home() / "OneDrive" / "Aspira"


def load_manifest():
    with open(MANIFEST_PATH) as f:
        return json.load(f)


def save_manifest(data):
    with open(MANIFEST_PATH, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")


def aspira_gif_filename(gif_file: str) -> str:
    """Strip the as_ prefix to get the original Aspira filename."""
    if gif_file.startswith("as_"):
        return gif_file[3:]
    return gif_file


def activate_exercise(entry, dry_run=False):
    """Copy GIF from OneDrive and mark exercise as active. Returns True if successful."""
    if entry["active"]:
        return True  # already active

    aspira_name = aspira_gif_filename(entry["gifFile"])
    source = ONEDRIVE_ASPIRA / aspira_name

    if not source.exists():
        print(f"  WARNING: Source GIF not found: {source}")
        return False

    dest = GIF_DIR / entry["gifFile"]

    if dry_run:
        size_mb = source.stat().st_size / (1024 * 1024)
        print(f"  Would copy: {aspira_name} -> {entry['gifFile']} ({size_mb:.1f} MB)")
        return True

    shutil.copy2(source, dest)
    entry["active"] = True
    entry["imageUrl"] = f"/gifs/{entry['gifFile']}"
    print(f"  Activated: {entry['name']} -> {entry['gifFile']}")
    return True


def main():
    parser = argparse.ArgumentParser(description="Sync exercise GIFs from OneDrive")
    parser.add_argument("names", nargs="*", help="Exercise names to activate")
    parser.add_argument("--group", help="Activate all exercises in a muscle group")
    parser.add_argument("--all", action="store_true", help="Activate all exercises")
    parser.add_argument("--dry-run", action="store_true", help="Show what would change")
    parser.add_argument("--list-groups", action="store_true", help="List all groups")
    parser.add_argument("--stats", action="store_true", help="Show manifest stats")
    args = parser.parse_args()

    manifest = load_manifest()

    if args.stats:
        active = sum(1 for e in manifest if e["active"])
        groups = {}
        for e in manifest:
            g = e["group"]
            if g not in groups:
                groups[g] = {"total": 0, "active": 0}
            groups[g]["total"] += 1
            if e["active"]:
                groups[g]["active"] += 1
        print(f"Total: {len(manifest)}, Active: {active}, Inactive: {len(manifest) - active}\n")
        for g in sorted(groups):
            info = groups[g]
            print(f"  {g}: {info['active']}/{info['total']} active")
        return

    if args.list_groups:
        groups = sorted(set(e["group"] for e in manifest))
        for g in groups:
            count = sum(1 for e in manifest if e["group"] == g)
            print(f"  {g} ({count})")
        return

    if not ONEDRIVE_ASPIRA.exists():
        print(f"ERROR: OneDrive Aspira folder not found: {ONEDRIVE_ASPIRA}")
        sys.exit(1)

    # Determine which exercises to activate
    targets = []
    if args.all:
        targets = [e for e in manifest if not e["active"]]
    elif args.group:
        targets = [e for e in manifest if e["group"].lower() == args.group.lower() and not e["active"]]
        if not targets:
            print(f"No inactive exercises found in group '{args.group}'")
            return
    elif args.names:
        name_set = set(n.lower() for n in args.names)
        targets = [e for e in manifest if e["name"].lower() in name_set]
        if not targets:
            print("No matching exercises found. Check spelling against manifest names.")
            return
    else:
        parser.print_help()
        return

    print(f"{'[DRY RUN] ' if args.dry_run else ''}Activating {len(targets)} exercise(s):\n")

    success = 0
    for entry in targets:
        if activate_exercise(entry, dry_run=args.dry_run):
            success += 1

    if not args.dry_run:
        save_manifest(manifest)
        print(f"\nDone. {success}/{len(targets)} activated. Manifest updated.")
    else:
        print(f"\n[DRY RUN] {success}/{len(targets)} would be activated.")


if __name__ == "__main__":
    main()
