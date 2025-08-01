#!/usr/bin/env python3
"""
Convert backup subjects to the format needed for matching
"""

import json

# File paths
BACKUP_FILE = '/Users/josepmarimon/Documents/github/bau-assist/csv/backup_2025-07-14T11-33-04-218Z/backup_subjects.json'
OUTPUT_FILE = '/Users/josepmarimon/Documents/github/bau-assist/csv/subjects_from_db.json'

def main():
    """Convert backup subjects"""
    with open(BACKUP_FILE, 'r', encoding='utf-8') as f:
        backup_subjects = json.load(f)
    
    # Convert to needed format
    subjects = []
    for subj in backup_subjects:
        subjects.append({
            'id': subj.get('id'),
            'codi': subj.get('code'),
            'nom_ca': subj.get('name'),  # Assuming name is in Catalan
            'nom_es': None,  # Not available in backup
            'credits': subj.get('credits'),
            'year': subj.get('year'),
            'type': subj.get('type')
        })
    
    # Save converted data
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(subjects, f, ensure_ascii=False, indent=2)
    
    print(f"Converted {len(subjects)} subjects")
    print(f"Saved to: {OUTPUT_FILE}")
    
    # Show sample
    print("\nSample subjects:")
    for subj in subjects[:5]:
        print(f"  - {subj['codi']}: {subj['nom_ca']}")

if __name__ == "__main__":
    main()