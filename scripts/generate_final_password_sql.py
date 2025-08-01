import json
from datetime import datetime

# Load the mapping data
with open('csv/subject_password_mapping_v2.json', 'r', encoding='utf-8') as f:
    mapping_data = json.load(f)

# Generate UPDATE statements - only one password per subject with high confidence
sql_statements = []
sql_statements.append("-- Update passwords for subjects based on Excel data")
sql_statements.append("-- Generated from usuaris-guies-docents.xlsx matching")
sql_statements.append("-- Using only high-confidence matches (>= 0.9) and one password per subject")
sql_statements.append("")

# Track statistics
updated_count = 0
seen_subjects = set()
skipped_low_confidence = 0
skipped_duplicates = 0

# Process only high confidence matches
high_confidence_matches = [m for m in mapping_data['matches'] if m['confidence'] >= 0.9]

# Sort by confidence to ensure we get the best match for each subject
high_confidence_matches.sort(key=lambda x: x['confidence'], reverse=True)

for match in high_confidence_matches:
    subject_code = match['subject_code']
    
    # Skip if we've already processed this subject
    if subject_code in seen_subjects:
        skipped_duplicates += 1
        continue
    
    seen_subjects.add(subject_code)
    
    # Escape single quotes in password
    password = match['password'].replace("'", "''")
    
    sql = f"UPDATE subjects SET password = '{password}' WHERE code = '{subject_code}';"
    sql_statements.append(sql)
    updated_count += 1

# Count low confidence skipped
skipped_low_confidence = len([m for m in mapping_data['matches'] if m['confidence'] < 0.9])

# Add statistics comment
sql_statements.append("")
sql_statements.append(f"-- Total unique subjects updated: {updated_count}")
sql_statements.append(f"-- Duplicate passwords skipped: {skipped_duplicates}")
sql_statements.append(f"-- Low confidence matches skipped: {skipped_low_confidence}")
sql_statements.append(f"-- Unmatched users: {mapping_data['metadata']['statistics']['unmatched']}")

# Add verification query
sql_statements.append("")
sql_statements.append("-- Verify the updates:")
sql_statements.append("SELECT code, name, password FROM subjects WHERE password IS NOT NULL ORDER BY code;")
sql_statements.append("")
sql_statements.append("-- Count total subjects with passwords:")
sql_statements.append("SELECT COUNT(*) as total_with_passwords FROM subjects WHERE password IS NOT NULL;")

# Write to file
with open('supabase/migrations/20250201_update_subject_passwords_final.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_statements))

print(f"Generated SQL file with {updated_count} unique UPDATE statements")
print(f"Skipped {skipped_duplicates} duplicate entries")
print(f"Skipped {skipped_low_confidence} low confidence matches")

# Generate detailed report
with open('csv/final_password_assignment_report.txt', 'w', encoding='utf-8') as f:
    f.write("Final Password Assignment Report\n")
    f.write("================================\n\n")
    f.write(f"Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
    
    f.write("STATISTICS\n")
    f.write("----------\n")
    f.write(f"Total unique subjects with passwords: {updated_count}\n")
    f.write(f"Duplicate entries removed: {skipped_duplicates}\n")
    f.write(f"Low confidence matches excluded: {skipped_low_confidence}\n\n")
    
    f.write("ASSIGNED PASSWORDS (High Confidence Only)\n")
    f.write("-----------------------------------------\n")
    
    # Reset seen subjects to track what we actually assigned
    seen_subjects = set()
    for match in high_confidence_matches:
        if match['subject_code'] not in seen_subjects:
            seen_subjects.add(match['subject_code'])
            f.write(f"{match['subject_code']} - {match['subject_name']} <- {match['username']}\n")

print("Generated final report")