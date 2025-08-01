import json
import re
from difflib import SequenceMatcher
from datetime import datetime

# Load data
print("Loading data...")
with open('csv/extracted_guide_users.json', 'r', encoding='utf-8') as f:
    guide_users = json.load(f)

with open('csv/subjects_correct_from_db.json', 'r', encoding='utf-8') as f:
    db_subjects = json.load(f)

print(f"Loaded {len(guide_users)} users and {len(db_subjects)} subjects")

# Create a mapping for Roman numerals
roman_to_arabic = {
    'i': '1', 'ii': '2', 'iii': '3', 'iv': '4', 'v': '5', 'vi': '6',
    'I': '1', 'II': '2', 'III': '3', 'IV': '4', 'V': '5', 'VI': '6'
}

# Function to normalize text for matching
def normalize_text(text):
    # Remove special characters and convert to lowercase
    text = text.lower()
    text = re.sub(r'[_\-\s]+', ' ', text)
    text = re.sub(r'[àá]', 'a', text)
    text = re.sub(r'[èé]', 'e', text)
    text = re.sub(r'[ìí]', 'i', text)
    text = re.sub(r'[òó]', 'o', text)
    text = re.sub(r'[ùú]', 'u', text)
    text = re.sub(r'[ñ]', 'n', text)
    text = re.sub(r'[ç]', 'c', text)
    text = text.strip()
    return text

# Function to extract Roman numeral from text
def extract_roman_numeral(text):
    # Look for Roman numerals at the end of the text
    match = re.search(r'\b(i{1,3}|iv|v|vi)\b\s*$', text.lower())
    if match:
        return match.group(1)
    return None

# Function to convert username to subject name format
def username_to_subject_name(username):
    # Replace underscores with spaces
    name = username.replace('_', ' ')
    
    # Check for Roman numeral at the end
    roman = extract_roman_numeral(name)
    if roman:
        # Replace Roman with Arabic in uppercase
        name = re.sub(r'\b' + roman + r'\b\s*$', roman.upper(), name)
    
    return name

# Create normalized mappings for database subjects
db_normalized = {}
for subject in db_subjects:
    # Use nom_ca (Catalan name) for matching
    normalized = normalize_text(subject['nom_ca'])
    db_normalized[normalized] = subject
    subject['name'] = subject['nom_ca']  # Add alias for compatibility

# Process matches
matches = []
unmatched = []
statistics = {
    'total_users': 0,
    'matched': 0,
    'unmatched': 0,
    'high_confidence': 0,
    'medium_confidence': 0,
    'low_confidence': 0
}

# Filter out non-subject users (exclude admin and system users)
subject_users = [u for u in guide_users if not any(keyword in u['username'] for keyword in ['admin', 'webmaster', 'direccio', 'recerca', 'biblio', 'coordinacio', 'guiadocent'])]
statistics['total_users'] = len(subject_users)

print(f"\nProcessing {len(subject_users)} subject users...")

for user in subject_users:
    username = user['username']
    password = user['password']
    
    # Convert username to potential subject name
    potential_name = username_to_subject_name(username)
    normalized_username = normalize_text(potential_name)
    
    best_match = None
    best_score = 0
    best_subject = None
    
    # Try exact match first
    if normalized_username in db_normalized:
        best_match = normalized_username
        best_score = 1.0
        best_subject = db_normalized[normalized_username]
    else:
        # Try fuzzy matching
        for db_norm, subject in db_normalized.items():
            # Calculate similarity
            score = SequenceMatcher(None, normalized_username, db_norm).ratio()
            
            # Special handling for numbered courses
            # Check if both have numbers and if the base name matches
            user_base = re.sub(r'\s*(i{1,3}|iv|v|vi|\d+)\s*$', '', normalized_username)
            db_base = re.sub(r'\s*(i{1,3}|iv|v|vi|\d+)\s*$', '', db_norm)
            
            if user_base == db_base:
                # If base names match exactly, boost score
                score = max(score, 0.85)
                
                # Check if the numbers match
                user_num = extract_roman_numeral(username)
                db_match = re.search(r'\b(i{1,3}|iv|v|vi)\b', subject['name'].lower())
                if user_num and db_match and user_num.upper() == db_match.group(1).upper():
                    score = 0.95
            
            if score > best_score:
                best_score = score
                best_match = db_norm
                best_subject = subject
    
    if best_subject and best_score >= 0.6:
        match_entry = {
            'username': username,
            'password': password,
            'subject_code': best_subject['codi'],
            'subject_name': best_subject['name'],
            'confidence': best_score,
            'matched': True
        }
        matches.append(match_entry)
        statistics['matched'] += 1
        
        if best_score >= 0.9:
            statistics['high_confidence'] += 1
        elif best_score >= 0.7:
            statistics['medium_confidence'] += 1
        else:
            statistics['low_confidence'] += 1
    else:
        unmatched_entry = {
            'username': username,
            'password': password,
            'matched': False,
            'reason': 'No match found with sufficient confidence'
        }
        unmatched.append(unmatched_entry)
        statistics['unmatched'] += 1

# Generate output
output = {
    'metadata': {
        'generated_at': datetime.now().isoformat(),
        'total_matches': statistics['matched'],
        'statistics': {
            'total_users': statistics['total_users'],
            'total_subjects': len(db_subjects),
            'matched': statistics['matched'],
            'unmatched': statistics['unmatched'],
            'high_confidence': statistics['high_confidence'],
            'medium_confidence': statistics['medium_confidence'],
            'low_confidence': statistics['low_confidence']
        }
    },
    'matches': matches,
    'unmatched': unmatched
}

# Save results
with open('csv/subject_password_mapping_v2.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

# Generate CSV for easy viewing
with open('csv/subject_password_mapping_v2.csv', 'w', encoding='utf-8') as f:
    f.write('Subject Code,Subject Name,Username,Password,Confidence\n')
    for match in matches:
        f.write(f"{match['subject_code']},{match['subject_name']},{match['username']},{match['password']},{match['confidence']:.2f}\n")

# Generate detailed report
with open('csv/matching_report_v2.txt', 'w', encoding='utf-8') as f:
    f.write("Subject Password Matching Report V2\n")
    f.write("===================================\n\n")
    f.write(f"Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
    
    f.write("STATISTICS\n")
    f.write("----------\n")
    f.write(f"Total subject users processed: {statistics['total_users']}\n")
    f.write(f"Successfully matched: {statistics['matched']} ({statistics['matched']/statistics['total_users']*100:.1f}%)\n")
    f.write(f"Unmatched: {statistics['unmatched']}\n")
    f.write(f"High confidence (>= 0.9): {statistics['high_confidence']}\n")
    f.write(f"Medium confidence (0.7-0.9): {statistics['medium_confidence']}\n")
    f.write(f"Low confidence (0.6-0.7): {statistics['low_confidence']}\n\n")
    
    f.write("HIGH CONFIDENCE MATCHES (>= 0.9)\n")
    f.write("--------------------------------\n")
    for match in sorted([m for m in matches if m['confidence'] >= 0.9], key=lambda x: x['confidence'], reverse=True):
        f.write(f"{match['username']} -> {match['subject_code']} ({match['subject_name']}) [Confidence: {match['confidence']:.2f}]\n")
    
    f.write("\nMEDIUM CONFIDENCE MATCHES (0.7-0.9)\n")
    f.write("-----------------------------------\n")
    for match in sorted([m for m in matches if 0.7 <= m['confidence'] < 0.9], key=lambda x: x['confidence'], reverse=True):
        f.write(f"{match['username']} -> {match['subject_code']} ({match['subject_name']}) [Confidence: {match['confidence']:.2f}]\n")
    
    f.write("\nLOW CONFIDENCE MATCHES (0.6-0.7)\n")
    f.write("---------------------------------\n")
    for match in sorted([m for m in matches if m['confidence'] < 0.7], key=lambda x: x['confidence'], reverse=True):
        f.write(f"{match['username']} -> {match['subject_code']} ({match['subject_name']}) [Confidence: {match['confidence']:.2f}]\n")
    
    f.write("\nUNMATCHED USERS\n")
    f.write("---------------\n")
    for item in unmatched:
        f.write(f"{item['username']} - {item['reason']}\n")

print(f"\n✓ Matched {statistics['matched']} subjects ({statistics['matched']/statistics['total_users']*100:.1f}%)")
print(f"  - High confidence: {statistics['high_confidence']}")
print(f"  - Medium confidence: {statistics['medium_confidence']}")
print(f"  - Low confidence: {statistics['low_confidence']}")
print(f"✗ Unmatched: {statistics['unmatched']}")
print(f"\nResults saved to:")
print(f"  - csv/subject_password_mapping_v2.json")
print(f"  - csv/subject_password_mapping_v2.csv")
print(f"  - csv/matching_report_v2.txt")