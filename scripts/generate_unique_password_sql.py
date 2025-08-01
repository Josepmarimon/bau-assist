import json

# Load the mapping data
with open('csv/subject_password_mapping.json', 'r', encoding='utf-8') as f:
    mapping_data = json.load(f)

# Generate UPDATE statements - only one password per subject
sql_statements = []
sql_statements.append("-- Update passwords for subjects based on Excel data")
sql_statements.append("-- Generated from usuaris-guies-docents.xlsx matching")
sql_statements.append("-- NOTE: Using only the first password when multiple exist for a subject")
sql_statements.append("")

# Track statistics
updated_count = 0
seen_subjects = set()
duplicate_count = 0

# Process the matches
for match in mapping_data['matches']:
    subject_code = match['subject_code']
    
    # Skip if we've already processed this subject
    if subject_code in seen_subjects:
        duplicate_count += 1
        continue
    
    seen_subjects.add(subject_code)
    
    # Escape single quotes in password
    password = match['password'].replace("'", "''")
    
    sql = f"UPDATE subjects SET password = '{password}' WHERE code = '{subject_code}';"
    sql_statements.append(sql)
    updated_count += 1

# Add statistics comment
sql_statements.append("")
sql_statements.append(f"-- Total unique subjects updated: {updated_count}")
sql_statements.append(f"-- Duplicate passwords skipped: {duplicate_count}")
sql_statements.append(f"-- Unmatched users: {mapping_data['metadata']['statistics']['unmatched']}")

# Add verification query
sql_statements.append("")
sql_statements.append("-- Verify the updates:")
sql_statements.append("SELECT code, name, password FROM subjects WHERE password IS NOT NULL ORDER BY code;")

# Write to file
with open('supabase/migrations/20250201_update_subject_passwords_unique.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_statements))

print(f"Generated SQL file with {updated_count} unique UPDATE statements")
print(f"Skipped {duplicate_count} duplicate entries")

# Generate report of subjects with multiple passwords
duplicates_report = []
subject_passwords = {}

for match in mapping_data['matches']:
    code = match['subject_code']
    if code not in subject_passwords:
        subject_passwords[code] = []
    subject_passwords[code].append({
        'username': match['username'],
        'password': match['password']
    })

duplicates_report.append("Subjects with multiple passwords:")
duplicates_report.append("================================")
for code, passwords in subject_passwords.items():
    if len(passwords) > 1:
        duplicates_report.append(f"\n{code}: {len(passwords)} passwords")
        for p in passwords:
            duplicates_report.append(f"  - {p['username']}: {p['password']}")

with open('csv/subjects_multiple_passwords_report.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(duplicates_report))

print("Generated report of subjects with multiple passwords")