#!/usr/bin/env python3
"""
Create a CSV file with subject codes and passwords for easy import
"""

import json
import csv

# File paths
MAPPING_FILE = '/Users/josepmarimon/Documents/github/bau-assist/csv/subject_password_mapping.json'
OUTPUT_CSV = '/Users/josepmarimon/Documents/github/bau-assist/csv/subject_passwords.csv'

def main():
    """Create CSV from mapping"""
    # Load mapping
    with open(MAPPING_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    matches = data['matches']
    
    # Create CSV
    with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        
        # Header
        writer.writerow(['subject_code', 'subject_name', 'username', 'password', 'confidence_score'])
        
        # Data rows
        for match in matches:
            writer.writerow([
                match['subject_code'],
                match['subject_name'],
                match['username'],
                match['password'],
                match['confidence_score']
            ])
    
    print(f"CSV created with {len(matches)} entries")
    print(f"Saved to: {OUTPUT_CSV}")

if __name__ == "__main__":
    main()