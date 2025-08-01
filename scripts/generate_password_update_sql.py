import json

# Load the mapping data
with open('csv/subject_password_mapping.json', 'r', encoding='utf-8') as f:
    mapping_data = json.load(f)

# Generate UPDATE statements
sql_statements = []
sql_statements.append("-- Update passwords for subjects based on Excel data")
sql_statements.append("-- Generated from usuaris-guies-docents.xlsx matching")
sql_statements.append("")

# Track statistics
updated_count = 0

# Process the matches
for match in mapping_data['matches']:
    # Escape single quotes in password
    password = match['password'].replace("'", "''")
    subject_code = match['subject_code']
    
    sql = f"UPDATE subjects SET password = '{password}' WHERE code = '{subject_code}';"
    sql_statements.append(sql)
    updated_count += 1

# Add statistics comment
sql_statements.append("")
sql_statements.append(f"-- Total updates: {updated_count}")
sql_statements.append(f"-- Unmatched users: {mapping_data['metadata']['statistics']['unmatched']}")

# Add verification query
sql_statements.append("")
sql_statements.append("-- Verify the updates:")
sql_statements.append("SELECT code, name, password FROM subjects WHERE password IS NOT NULL ORDER BY code;")

# Write to file
with open('supabase/migrations/20250201_update_subject_passwords.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_statements))

print(f"Generated SQL file with {updated_count} UPDATE statements")
print(f"Unmatched users: {mapping_data['metadata']['statistics']['unmatched']}")