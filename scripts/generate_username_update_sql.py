import json
from datetime import datetime

# Load the mapping data
with open('csv/subject_password_mapping_v2.json', 'r', encoding='utf-8') as f:
    mapping_data = json.load(f)

# Generate UPDATE statements - only one username per subject with high confidence
sql_statements = []
sql_statements.append("-- Update usernames for subjects based on Excel data")
sql_statements.append("-- Generated from usuaris-guies-docents.xlsx matching")
sql_statements.append("-- Using only high-confidence matches (>= 0.9)")
sql_statements.append("")

# Track statistics
updated_count = 0
seen_subjects = set()

# Process only high confidence matches
high_confidence_matches = [m for m in mapping_data['matches'] if m['confidence'] >= 0.9]

# Sort by confidence to ensure we get the best match for each subject
high_confidence_matches.sort(key=lambda x: x['confidence'], reverse=True)

for match in high_confidence_matches:
    subject_code = match['subject_code']
    
    # Skip if we've already processed this subject
    if subject_code in seen_subjects:
        continue
    
    seen_subjects.add(subject_code)
    
    # Escape single quotes in username
    username = match['username'].replace("'", "''")
    
    sql = f"UPDATE subjects SET username = '{username}' WHERE code = '{subject_code}';"
    sql_statements.append(sql)
    updated_count += 1

# Add statistics comment
sql_statements.append("")
sql_statements.append(f"-- Total unique subjects updated: {updated_count}")

# Add verification query
sql_statements.append("")
sql_statements.append("-- Verify the updates:")
sql_statements.append("SELECT code, name, username, password FROM subjects WHERE username IS NOT NULL ORDER BY code;")

# Write to file
with open('supabase/migrations/20250201_update_subject_usernames.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_statements))

print(f"Generated SQL file with {updated_count} username UPDATE statements")