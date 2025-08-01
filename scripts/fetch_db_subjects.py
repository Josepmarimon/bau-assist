#!/usr/bin/env python3
"""
Fetch all subjects from the Supabase database
"""

import os
import json
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required")
    exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Fetch subjects
print("Fetching subjects from database...")
response = supabase.table('assignatura').select("*").execute()

subjects = []
for row in response.data:
    subjects.append({
        'id': row['id'],
        'codi': row['codi'],
        'nom': row['nom'],
        'credits': row.get('credits'),
        'hores': row.get('hores')
    })

# Sort by code
subjects.sort(key=lambda x: x['codi'])

# Save to JSON
output_file = '/Users/josepmarimon/Documents/github/bau-assist/csv/db_subjects.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(subjects, f, ensure_ascii=False, indent=2)

print(f"Saved {len(subjects)} subjects to {output_file}")

# Show sample
print("\nSample subjects:")
for subject in subjects[:5]:
    print(f"  {subject['codi']}: {subject['nom']}")