#!/usr/bin/env python3
"""
Match subjects from database with passwords from Excel file
by comparing normalized username strings with subject names
"""

import json
import re
import unicodedata
from difflib import SequenceMatcher
from datetime import datetime

# File paths
USERS_JSON = '/Users/josepmarimon/Documents/github/bau-assist/csv/extracted_guide_users.json'
SUBJECTS_JSON = '/Users/josepmarimon/Documents/github/bau-assist/csv/subjects_from_db.json'
OUTPUT_MAPPING = '/Users/josepmarimon/Documents/github/bau-assist/csv/subject_password_mapping.json'
OUTPUT_REPORT = '/Users/josepmarimon/Documents/github/bau-assist/csv/matching_report.txt'

def remove_accents(text):
    """Remove accents from text"""
    return ''.join(c for c in unicodedata.normalize('NFD', text) 
                   if unicodedata.category(c) != 'Mn')

def normalize_text(text):
    """Normalize text for comparison"""
    # Remove accents
    text = remove_accents(text)
    
    # Convert to lowercase
    text = text.lower()
    
    # Replace common variations
    replacements = {
        'i': '_',  # Convert 'i' conjunctions to underscore
        ' ': '_',
        '-': '_',
        ',': '',
        '.': '',
        "'": '',
        '(': '',
        ')': '',
        ':': '',
        ';': '',
        '!': '',
        '?': '',
        '/': '_',
        '\\': '_'
    }
    
    for old, new in replacements.items():
        text = text.replace(old, new)
    
    # Clean multiple underscores
    text = re.sub(r'_+', '_', text)
    text = text.strip('_')
    
    return text

def extract_key_parts(username):
    """Extract key parts from username for matching"""
    parts = username.split('_')
    
    # Filter out common words that might not help matching
    stop_words = ['de', 'del', 'la', 'les', 'el', 'els', 'en', 'i', 'a', 'per']
    key_parts = [p for p in parts if p not in stop_words and len(p) > 2]
    
    return key_parts

def calculate_similarity(str1, str2):
    """Calculate similarity between two strings"""
    return SequenceMatcher(None, str1, str2).ratio()

def find_best_match(username, subjects):
    """Find the best matching subject for a username"""
    normalized_username = normalize_text(username)
    username_parts = extract_key_parts(normalized_username)
    
    best_match = None
    best_score = 0
    match_details = []
    
    for subject in subjects:
        subject_name = subject['nom_ca'] or subject['nom_es'] or ''
        normalized_subject = normalize_text(subject_name)
        
        # Calculate different similarity metrics
        
        # 1. Full string similarity
        full_similarity = calculate_similarity(normalized_username, normalized_subject)
        
        # 2. Check if all username parts are in subject
        parts_found = sum(1 for part in username_parts if part in normalized_subject)
        parts_ratio = parts_found / len(username_parts) if username_parts else 0
        
        # 3. Check for key terms match
        key_terms_score = 0
        if 'tipografia' in normalized_username and 'tipografia' in normalized_subject:
            key_terms_score += 0.3
        if 'audiovisual' in normalized_username and 'audiovisual' in normalized_subject:
            key_terms_score += 0.3
        if 'disseny' in normalized_username and 'disseny' in normalized_subject:
            key_terms_score += 0.2
        if 'projectes' in normalized_username and 'projectes' in normalized_subject:
            key_terms_score += 0.2
        if 'taller' in normalized_username and 'taller' in normalized_subject:
            key_terms_score += 0.2
        
        # 4. Check for Roman numerals
        roman_pattern = r'(_i{1,3}$|_iv$|_v$)'
        username_roman = re.search(roman_pattern, normalized_username)
        subject_roman = re.search(roman_pattern, normalized_subject)
        
        roman_match = 0
        if username_roman and subject_roman:
            if username_roman.group() == subject_roman.group():
                roman_match = 0.3
            else:
                roman_match = -0.2  # Penalize if different Roman numerals
        
        # Calculate final score
        final_score = (full_similarity * 0.4 + 
                      parts_ratio * 0.3 + 
                      key_terms_score * 0.2 +
                      roman_match * 0.1)
        
        if final_score > best_score:
            best_score = final_score
            best_match = subject
            match_details = {
                'full_similarity': full_similarity,
                'parts_ratio': parts_ratio,
                'key_terms_score': key_terms_score,
                'roman_match': roman_match,
                'final_score': final_score
            }
    
    return best_match, best_score, match_details

def main():
    """Main matching process"""
    # Load data
    print("Loading data...")
    with open(USERS_JSON, 'r', encoding='utf-8') as f:
        users = json.load(f)
    
    with open(SUBJECTS_JSON, 'r', encoding='utf-8') as f:
        subjects = json.load(f)
    
    print(f"Loaded {len(users)} users and {len(subjects)} subjects")
    
    # Process matching
    print("\nProcessing matches...")
    
    matches = []
    unmatched_users = []
    report_lines = []
    
    # Statistics
    stats = {
        'total_users': len(users),
        'total_subjects': len(subjects),
        'matched': 0,
        'unmatched': 0,
        'high_confidence': 0,  # score > 0.8
        'medium_confidence': 0,  # score 0.6-0.8
        'low_confidence': 0,  # score < 0.6
    }
    
    report_lines.append("SUBJECT TO PASSWORD MATCHING REPORT")
    report_lines.append("=" * 80)
    report_lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report_lines.append(f"Total users: {len(users)}")
    report_lines.append(f"Total subjects: {len(subjects)}")
    report_lines.append("=" * 80)
    report_lines.append("")
    
    # Process each user
    for user in users:
        username = user['username']
        
        # Skip non-assignment users
        if '_' not in username or username in ['practiques_externes', 'tfg-gba', 
                                               'master-design-research', 'gestio', 
                                               'producte', 'antropologia', 'estetica']:
            continue
        
        best_match, score, details = find_best_match(username, subjects)
        
        if best_match and score > 0.5:  # Threshold for acceptance
            match_data = {
                'username': username,
                'password': user['password'],
                'subject_code': best_match['codi'],
                'subject_name': best_match['nom_ca'] or best_match['nom_es'],
                'confidence_score': round(score, 3),
                'match_details': details
            }
            matches.append(match_data)
            stats['matched'] += 1
            
            # Categorize by confidence
            if score > 0.8:
                stats['high_confidence'] += 1
                confidence = "HIGH"
            elif score > 0.6:
                stats['medium_confidence'] += 1
                confidence = "MEDIUM"
            else:
                stats['low_confidence'] += 1
                confidence = "LOW"
            
            report_lines.append(f"[{confidence}] {username}")
            report_lines.append(f"  → {best_match['codi']}: {best_match['nom_ca'] or best_match['nom_es']}")
            report_lines.append(f"  Score: {score:.3f}")
            report_lines.append(f"  Password: {user['password']}")
            report_lines.append("")
        else:
            unmatched_users.append(username)
            stats['unmatched'] += 1
    
    # Add unmatched users to report
    if unmatched_users:
        report_lines.append("\nUNMATCHED USERS:")
        report_lines.append("-" * 40)
        for username in unmatched_users:
            report_lines.append(f"  - {username}")
    
    # Add statistics to report
    report_lines.append("\n" + "=" * 80)
    report_lines.append("STATISTICS:")
    report_lines.append(f"  Total assignment users processed: {stats['matched'] + stats['unmatched']}")
    report_lines.append(f"  Successfully matched: {stats['matched']} ({stats['matched']/(stats['matched']+stats['unmatched'])*100:.1f}%)")
    report_lines.append(f"  Unmatched: {stats['unmatched']}")
    report_lines.append(f"  High confidence matches: {stats['high_confidence']}")
    report_lines.append(f"  Medium confidence matches: {stats['medium_confidence']}")
    report_lines.append(f"  Low confidence matches: {stats['low_confidence']}")
    
    # Save results
    output_data = {
        'metadata': {
            'generated_at': datetime.now().isoformat(),
            'total_matches': len(matches),
            'statistics': stats
        },
        'matches': sorted(matches, key=lambda x: x['confidence_score'], reverse=True)
    }
    
    with open(OUTPUT_MAPPING, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    with open(OUTPUT_REPORT, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report_lines))
    
    print(f"\nResults saved to:")
    print(f"  - Mapping: {OUTPUT_MAPPING}")
    print(f"  - Report: {OUTPUT_REPORT}")
    
    print(f"\nSummary:")
    print(f"  Matched: {stats['matched']} subjects")
    print(f"  Unmatched: {stats['unmatched']} users")
    print(f"  Success rate: {stats['matched']/(stats['matched']+stats['unmatched'])*100:.1f}%")

if __name__ == "__main__":
    main()