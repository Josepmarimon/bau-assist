#!/usr/bin/env python3
"""
Fix and clean the extracted Excel data to correct misidentified subjects.
This script manually fixes known issues in the extraction.
"""

import json
import re
from datetime import datetime

# File paths
INPUT_FILE = '/Users/josepmarimon/Documents/github/bau-assist/csv/extracted_excel_data.json'
OUTPUT_FILE = '/Users/josepmarimon/Documents/github/bau-assist/csv/extracted_excel_data_fixed.json'

def fix_extracted_data(data):
    """Fix known issues in extracted data"""
    
    # List of entries to remove (false positives - not real subjects)
    entries_to_remove = [
        # These are professor names, not subjects
        "Mireia Carbonell",
        "Mónica Rikic Luis Colaço",
        "Núria Costa",
        "Pierino dal Pozzo",
        "Joan Ros\n+",
        "Guarin",
        
        # These are group codes, not subjects
        "Gm2",
        "Gm1a\nDavid Torrents P1.7",
        
        # These are fragments or incomplete
        "Expressió",  # Fragment of "Expressió Gràfica"
        "Iniciació als",  # Fragment
        "Projectes de",  # Fragment
        "Disseny i",  # Fragment
        "Comunicació",  # Fragment (when standalone)
        "d'Artista",  # Fragment of "Taller d'Edicions d'Artista"
        "Pedagogies",  # Fragment
    ]
    
    # Manual corrections for incomplete subject names
    name_corrections = {
        # Fix fragments that should be complete names
        "Taller d'Expressió\ni Comunicació": "Taller d'Expressió i Comunicació",
        "Iconografia\ni Comunicació": "Iconografia i Comunicació",
        "Estètica i Teoria de les Arts": "Estètica i Teoria de les Arts",
        "Eines Informatiques I\nAnna Ferré Elisenda Fontarnau Pau Pericas\nP1.2+P1.3+P1.8 P1.12+G2.1+\nPlatós+Sala": "Eines Informatiques I",
        "Eines Informatiques II\nGlòria Deumal Ricard Marimon Daniel Tahmaz P1.2+P1.3+P1.12 P1.8+G2.1+\nPlatós+Sala Carolines": "Eines Informatiques II",
    }
    
    # Clean professor names that include classroom info
    professor_cleaning_patterns = [
        (r'\s*P[0-9]\.[0-9]+(?:/[0-9]+)?', ''),  # Remove classroom codes
        (r'\s*G[0-9]\.[0-9]+', ''),  # Remove G classrooms
        (r'\s*L[0-9]\.[0-9]+', ''),  # Remove L classrooms
        (r'\s*Platós.*', ''),  # Remove Platós and everything after
        (r'\s*Sala\s+\w+.*', ''),  # Remove Sala and everything after
        (r'\s+\+\s+', ' '),  # Replace + with space
        (r'\s+', ' '),  # Normalize spaces
    ]
    
    # Process the data
    fixed_data = []
    removed_count = 0
    fixed_count = 0
    
    for entry in data:
        subject_name = entry.get('asignatura', '')
        
        # Check if this entry should be removed
        should_remove = False
        for remove_pattern in entries_to_remove:
            if subject_name == remove_pattern or subject_name.strip() == remove_pattern:
                should_remove = True
                removed_count += 1
                break
        
        if should_remove:
            continue
        
        # Apply name corrections
        if subject_name in name_corrections:
            entry['asignatura'] = name_corrections[subject_name]
            fixed_count += 1
        
        # Clean up subject names
        cleaned_name = subject_name
        # Remove line breaks
        cleaned_name = cleaned_name.replace('\n', ' ')
        # Remove multiple spaces
        cleaned_name = re.sub(r'\s+', ' ', cleaned_name).strip()
        
        # Only update if changed
        if cleaned_name != subject_name:
            entry['asignatura'] = cleaned_name
            fixed_count += 1
        
        # Clean professor names
        if entry.get('profesor'):
            professor = entry['profesor']
            for pattern, replacement in professor_cleaning_patterns:
                professor = re.sub(pattern, replacement, professor)
            professor = professor.strip()
            
            # Remove if professor name is too short or looks like a code
            if len(professor) < 3 or re.match(r'^[A-Z][0-9]', professor):
                professor = None
            
            entry['profesor'] = professor
        
        # Fix classroom codes (remove dots where there shouldn't be)
        if entry.get('aulas'):
            fixed_aulas = []
            for aula in entry['aulas']:
                # P0.5/0 should be P0.5/0.7
                if aula == 'P0.5/0':
                    aula = 'P0.5/0.7'
                # P0.2/0 should be P0.2/0.4
                elif aula == 'P0.2/0':
                    aula = 'P0.2/0.4'
                fixed_aulas.append(aula)
            entry['aulas'] = fixed_aulas
        
        # Add the fixed entry
        fixed_data.append(entry)
    
    return fixed_data, removed_count, fixed_count

def main():
    """Main function"""
    print("Loading extracted Excel data...")
    
    # Load data
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        excel_data = json.load(f)
    
    original_count = len(excel_data['data'])
    print(f"Original entries: {original_count}")
    
    # Fix the data
    print("\nFixing known issues...")
    fixed_entries, removed_count, fixed_count = fix_extracted_data(excel_data['data'])
    
    # Update the data
    excel_data['data'] = fixed_entries
    excel_data['extraction_date'] = datetime.now().isoformat()
    excel_data['fixed'] = True
    excel_data['fix_summary'] = {
        'original_entries': original_count,
        'removed_entries': removed_count,
        'fixed_entries': fixed_count,
        'final_entries': len(fixed_entries)
    }
    
    # Update summary statistics
    summary = excel_data.get('summary', {})
    summary['total_entries'] = len(fixed_entries)
    
    # Recalculate statistics
    by_grado = {}
    by_curso = {}
    by_itinerari = {}
    
    for entry in fixed_entries:
        # By grado
        grado = entry.get('grado_code', 'Unknown')
        by_grado[f'grado_{grado}'] = by_grado.get(f'grado_{grado}', 0) + 1
        
        # By curso
        curso = entry.get('curso', 'Unknown')
        by_curso[f'curso_{curso}'] = by_curso.get(f'curso_{curso}', 0) + 1
        
        # By itinerari
        if entry.get('itinerari'):
            iti = entry['itinerari']
            by_itinerari[f'itinerari_{iti}'] = by_itinerari.get(f'itinerari_{iti}', 0) + 1
    
    # Update summary
    summary.update(by_grado)
    summary.update(by_curso)
    summary.update(by_itinerari)
    excel_data['summary'] = summary
    
    # Save fixed data
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(excel_data, f, ensure_ascii=False, indent=2)
    
    print(f"\nFixed data saved to: {OUTPUT_FILE}")
    print(f"\nSummary:")
    print(f"- Original entries: {original_count}")
    print(f"- Removed entries: {removed_count}")
    print(f"- Fixed entries: {fixed_count}")
    print(f"- Final entries: {len(fixed_entries)}")
    
    # Show some examples of removed entries
    print("\nExamples of removed entries:")
    examples = ["Mireia Carbonell", "Gm2", "Expressió", "Núria Costa", "Pierino dal Pozzo"]
    for ex in examples[:5]:
        print(f"  - {ex}")

if __name__ == "__main__":
    main()