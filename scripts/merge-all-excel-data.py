#!/usr/bin/env python3
"""
Merge all extracted Excel data from different sources into a single comprehensive file.
Combines GDIS data (from cells) and GBA data (from drawing objects).
"""

import json
import os
from datetime import datetime

def clean_gba_entries(gba_data):
    """Clean and fix GBA entries extracted from drawings"""
    
    cleaned = []
    
    # Known subject names from the database
    known_subjects = {
        "2D, Llenguatges,Tècniquesi Tecnologies": "2D. Llenguatges, Tècniques i Tecnologies",
        "3D, Llenguatges,Tècniquesi Tecnologies": "3D. Llenguatges, Tècniques i Tecnologies", 
        "4D, Llenguatges,Tècniquesi Tecnologies": "4D. Llenguatges, Tècniques i Tecnologies",
        "2D, Llenguatges,Tecniquesi Tecnologies lnstal•lades": "2D. Llenguatges, Tècniques i Tecnologies Instal·lades",
        "3D, Llenguatges,Tecniquesi Tecnologies lnstal•lades": "3D. Llenguatges, Tècniques i Tecnologies Instal·lades",
        "4D, Llenguatges,Tecniquesi Tecnologies lnstal•lades": "4D. Llenguatges, Tècniques i Tecnologies Instal·lades",
        "Laboratori de Processosi Projectes 11": "Laboratori de Processos i Projectes II",
        "Laboratori de Processosi Projectes VI": "Laboratori de Processos i Projectes VI",
        "Pensament Contemporani i Practiques Artístiques": "Pensament Contemporani i Pràctiques Crítiques"
    }
    
    # Process each entry
    seen_subjects = set()
    
    for entry in gba_data:
        subject = entry['asignatura']
        
        # Skip obvious non-subjects
        if subject in ['Optativitat', 'tutories', 'Tutories'] or len(subject) < 5:
            continue
        
        # Clean up subject name
        if subject in known_subjects:
            subject = known_subjects[subject]
        else:
            # Fix spacing issues
            subject = subject.replace('Tècniquesi', 'Tècniques i')
            subject = subject.replace('Tecniquesi', 'Tècniques i')
            subject = subject.replace('Processosi', 'Processos i')
            subject = subject.replace('lnstal•lades', 'Instal·lades')
            subject = subject.replace('Practiques', 'Pràctiques')
        
        # Check if professor field contains another subject name
        professor = entry.get('profesor', '')
        if professor and professor in known_subjects:
            # This is another subject, not a professor
            cleaned.append({
                'asignatura': known_subjects[professor],
                'grado': entry['grado'],
                'grado_code': entry['grado_code'],
                'curso': entry['curso'],
                'semestre': entry['semestre'],
                'tipo': 'Obligatoria',
                'itinerari': None,
                'grupo': 'M1' if entry['curso'] else 'Unknown',
                'aulas': [],
                'profesor': None,
                'es_placeholder': False,
                'archivo': entry['archivo']
            })
        
        # Add the main subject
        key = f"{subject}_{entry['curso']}_{entry.get('semestre', 'NA')}"
        if key not in seen_subjects:
            seen_subjects.add(key)
            cleaned.append({
                'asignatura': subject,
                'grado': entry['grado'],
                'grado_code': entry['grado_code'],
                'curso': entry['curso'],
                'semestre': entry['semestre'],
                'tipo': 'Obligatoria',
                'itinerari': None,
                'grupo': 'M1' if entry['curso'] else 'Unknown',
                'aulas': entry.get('aulas', []),
                'profesor': None if professor in known_subjects else professor,
                'es_placeholder': False,
                'archivo': entry['archivo']
            })
    
    return cleaned

def main():
    """Merge all Excel data sources"""
    
    # File paths
    gdis_file = '/Users/josepmarimon/Documents/github/bau-assist/csv/extracted_excel_data_v2.json'
    gba_file = '/Users/josepmarimon/Documents/github/bau-assist/csv/extracted_gba_schedules.json'
    gba_optatives_file = '/Users/josepmarimon/Documents/github/bau-assist/csv/extracted_excel_data_v2.json'  # Already includes optatives
    output_file = '/Users/josepmarimon/Documents/github/bau-assist/csv/all_excel_schedules_merged.json'
    
    all_data = []
    
    print("Merging all Excel schedule data...")
    print("=" * 80)
    
    # Load GDIS data (includes GBA optatives)
    if os.path.exists(gdis_file):
        with open(gdis_file, 'r', encoding='utf-8') as f:
            gdis_data = json.load(f)
            gdis_entries = gdis_data['data']
            print(f"Loaded {len(gdis_entries)} entries from GDIS extraction (includes optatives)")
            all_data.extend(gdis_entries)
    
    # Load GBA data from drawings
    if os.path.exists(gba_file):
        with open(gba_file, 'r', encoding='utf-8') as f:
            gba_data = json.load(f)
            gba_entries = clean_gba_entries(gba_data['data'])
            print(f"Loaded and cleaned {len(gba_entries)} entries from GBA drawings")
            all_data.extend(gba_entries)
    
    # Remove duplicates
    unique_entries = {}
    for entry in all_data:
        # Create unique key
        key = f"{entry['grado_code']}_{entry['curso']}_{entry.get('semestre', 'NA')}_{entry['asignatura']}"
        if key not in unique_entries:
            unique_entries[key] = entry
    
    all_data = list(unique_entries.values())
    
    # Calculate summary statistics
    summary = {
        'total_entries': len(all_data),
        'by_grado': {},
        'by_curso': {},
        'by_tipo': {},
        'with_professor': 0,
        'with_classroom': 0
    }
    
    for entry in all_data:
        # By grado
        grado = entry['grado_code']
        summary['by_grado'][grado] = summary['by_grado'].get(grado, 0) + 1
        
        # By curso
        curso = entry['curso'] or 'Unknown'
        summary['by_curso'][curso] = summary['by_curso'].get(curso, 0) + 1
        
        # By tipo
        tipo = entry.get('tipo', 'Obligatoria')
        summary['by_tipo'][tipo] = summary['by_tipo'].get(tipo, 0) + 1
        
        # With data
        if entry.get('profesor'):
            summary['with_professor'] += 1
        if entry.get('aulas'):
            summary['with_classroom'] += 1
    
    # Save merged data
    output_data = {
        'extraction_date': datetime.now().isoformat(),
        'version': 'merged_final',
        'sources': ['GDIS cells', 'GBA drawings', 'GBA optatives'],
        'summary': summary,
        'data': all_data
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    # Print summary
    print("\n" + "=" * 80)
    print("MERGE SUMMARY")
    print("=" * 80)
    print(f"Total unique entries: {summary['total_entries']}")
    
    print("\nBy degree:")
    for grado, count in sorted(summary['by_grado'].items()):
        print(f"  {grado}: {count}")
    
    print("\nBy course:")
    for curso, count in sorted(summary['by_curso'].items()):
        print(f"  {curso}: {count}")
    
    print("\nBy type:")
    for tipo, count in sorted(summary['by_tipo'].items()):
        print(f"  {tipo}: {count}")
    
    print(f"\nWith professor assigned: {summary['with_professor']}")
    print(f"With classroom assigned: {summary['with_classroom']}")
    
    print(f"\nData saved to: {output_file}")
    
    # Show GBA subjects
    gba_subjects = [e for e in all_data if e['grado_code'] == 'GBA']
    print(f"\nTotal GBA subjects: {len(gba_subjects)}")
    
    gba_by_course = {}
    for entry in gba_subjects:
        curso = entry['curso'] or 'Unknown'
        if curso not in gba_by_course:
            gba_by_course[curso] = []
        gba_by_course[curso].append(entry['asignatura'])
    
    print("\nGBA subjects by course:")
    for curso in sorted(gba_by_course.keys()):
        print(f"\n{curso} ({len(gba_by_course[curso])} subjects):")
        for subject in sorted(set(gba_by_course[curso]))[:10]:
            print(f"  - {subject}")
        if len(set(gba_by_course[curso])) > 10:
            print(f"  ... and {len(set(gba_by_course[curso])) - 10} more")

if __name__ == "__main__":
    main()