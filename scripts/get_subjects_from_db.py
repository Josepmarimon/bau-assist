#!/usr/bin/env python3
"""
Get all subjects from the database
"""

import json
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase credentials
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("ERROR: Please set SUPABASE_URL and SUPABASE_KEY environment variables")
    exit(1)

# Create Supabase client
supabase: Client = create_client(url, key)

def get_all_subjects():
    """Get all subjects from the database"""
    try:
        # Query all subjects
        response = supabase.table('assignatura').select('*').execute()
        subjects = response.data
        
        print(f"Total subjects retrieved: {len(subjects)}")
        
        # Count unique subjects by code
        unique_codes = set(s['codi'] for s in subjects if s.get('codi'))
        print(f"Unique subject codes: {len(unique_codes)}")
        
        return subjects
        
    except Exception as e:
        print(f"Error getting subjects: {str(e)}")
        return []

def main():
    """Main function"""
    print("Retrieving subjects from database...")
    
    subjects = get_all_subjects()
    
    if subjects:
        # Save to JSON
        output_file = '/Users/josepmarimon/Documents/github/bau-assist/csv/subjects_from_db.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(subjects, f, ensure_ascii=False, indent=2)
        
        print(f"\nSubjects saved to: {output_file}")
        
        # Show sample
        print("\nSample subjects:")
        for subject in subjects[:5]:
            print(f"  - {subject.get('codi', 'N/A')}: {subject.get('nom_ca', subject.get('nom_es', 'N/A'))}")
    else:
        print("No subjects retrieved")

if __name__ == "__main__":
    main()