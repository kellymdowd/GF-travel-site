#!/usr/bin/env python3
"""
Export matched photos from Apple Photos into organized folders.
Target structure: photos/[country]/[city]/[place-name]/
"""

import json
import os
import subprocess
import time
import re
import sys

BASE_DIR = "/Users/kellydowd/claude_code/travel_site/photos"
MATCH_FILE = "/tmp/all_photo_matches.json"
BATCH_SIZE = 5  # photos per batch
BATCH_DELAY = 2  # seconds between batches
EXPORT_TIMEOUT = 60  # seconds per photo export

def slugify(text):
    """Convert text to lowercase hyphenated slug."""
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    text = re.sub(r'-+', '-', text)
    return text.strip('-')

def export_photo(photo_id, dest_folder):
    """Export a single photo from Apple Photos via AppleScript."""
    # Escape the photo ID for AppleScript
    escaped_id = photo_id.replace('"', '\\"')
    escaped_path = dest_folder.replace('"', '\\"')

    applescript = f'''
    tell application "Photos"
        set theItem to media item id "{escaped_id}"
        export {{theItem}} to POSIX file "{escaped_path}" with original
    end tell
    '''

    try:
        result = subprocess.run(
            ["osascript", "-e", applescript],
            capture_output=True,
            text=True,
            timeout=EXPORT_TIMEOUT
        )
        if result.returncode != 0:
            return False, result.stderr.strip()
        return True, None
    except subprocess.TimeoutExpired:
        return False, "Timeout"
    except Exception as e:
        return False, str(e)

def main():
    with open(MATCH_FILE) as f:
        data = json.load(f)

    # Count totals
    total_photos = sum(
        pinfo['photo_count']
        for city_info in data.values()
        for pinfo in city_info['matches'].values()
    )

    print(f"Starting export of {total_photos} photos across {len(data)} cities")
    print(f"Batch size: {BATCH_SIZE}, delay between batches: {BATCH_DELAY}s")
    print("=" * 60)

    exported_count = 0
    failed_count = 0
    skipped_count = 0
    failed_log = []

    for city_name, city_info in data.items():
        country = city_info['country']
        matches = city_info['matches']

        if not matches:
            continue

        country_slug = slugify(country)
        city_slug = slugify(city_name)

        city_manifest = {}

        print(f"\n>>> {city_name}, {country} ({city_info['matched_count']} photos, {city_info['places_with_photos']} places)")

        for place_name, place_info in matches.items():
            photos = place_info['photos']
            if not photos:
                continue

            place_slug = place_info.get('slug', slugify(place_name))
            dest_folder = os.path.join(BASE_DIR, country_slug, city_slug, place_slug)
            os.makedirs(dest_folder, exist_ok=True)

            place_exported = []
            place_failed = []

            print(f"  {place_name} ({len(photos)} photos) -> {place_slug}/")

            for i, photo in enumerate(photos):
                photo_id = photo['id']
                filename = photo['filename']

                # Check if already exported
                expected_path = os.path.join(dest_folder, filename)
                if os.path.exists(expected_path):
                    place_exported.append(photo)
                    skipped_count += 1
                    continue

                success, error = export_photo(photo_id, dest_folder)

                if success:
                    place_exported.append(photo)
                    exported_count += 1
                else:
                    failed_count += 1
                    failed_log.append({
                        'city': city_name,
                        'place': place_name,
                        'photo_id': photo_id,
                        'filename': filename,
                        'error': error
                    })
                    place_failed.append(filename)
                    print(f"    FAILED: {filename} - {error}")

                # Batch delay
                if (i + 1) % BATCH_SIZE == 0 and i < len(photos) - 1:
                    time.sleep(BATCH_DELAY)

            # Record in manifest
            city_manifest[place_name] = {
                'slug': place_slug,
                'place_type': place_info['place_type'],
                'folder': place_slug,
                'photos': [
                    {
                        'filename': p['filename'],
                        'date': p['date'],
                        'distance_m': p['distance_m']
                    }
                    for p in place_exported
                ],
                'failed': place_failed
            }

            ok = len(place_exported)
            fail = len(place_failed)
            status = f"    -> {ok} exported"
            if fail:
                status += f", {fail} failed"
            print(status)

            # Small delay between places
            time.sleep(1)

        # Write city manifest
        manifest_path = os.path.join(BASE_DIR, country_slug, city_slug, "photo_manifest.json")
        with open(manifest_path, 'w') as f:
            json.dump(city_manifest, f, indent=2)
        print(f"  Manifest written: {manifest_path}")

    # Summary
    print("\n" + "=" * 60)
    print(f"EXPORT COMPLETE")
    print(f"  Exported: {exported_count}")
    print(f"  Skipped (already existed): {skipped_count}")
    print(f"  Failed: {failed_count}")

    if failed_log:
        failed_path = "/tmp/photo_export_failures.json"
        with open(failed_path, 'w') as f:
            json.dump(failed_log, f, indent=2)
        print(f"  Failure details saved to: {failed_path}")

if __name__ == "__main__":
    main()
