#!/usr/bin/env python3
"""
Generate a comprehensive preview of all changes to be applied to the database.
Reviews and filters out false positives before generating final SQL scripts.
"""

import json
import os
from datetime import datetime
import re

def is_valid_subject_name(name):
    """Check if a string is likely a valid subject name"""
    # Skip time patterns
    if re.match(r'^\d+:\d+', name):
        return False
    
    # Skip single words that are likely codes or fragments
    if name in ['Gm1', 'Gm2', 'Gm1a', 'Gm1b', 'Ga1', 'Ga2', 'M1', 'M2', 'T1', 'T2']:
        return False
    
    # Skip professor names that were mistaken for subjects
    false_professors = [
        'Mireia Carbonell', 'Núria Costa', 'Pierino dal Pozzo', 
        'Alba Font Villar P0.10', 'Alejandra López GabrielidisP0.6',
        'Joan Ros', 'Mónica Rikic Luis Colaço'
    ]
    if any(prof in name for prof in false_professors):
        return False
    
    # Skip classroom codes
    if re.match(r'^[PGLC]\d+\.\d+', name):
        return False
    
    # Skip very short names
    if len(name) < 8:
        return False
    
    # Skip time slots
    if 'Hernández' in name or 'tutories' in name.lower():
        return False
    
    # Skip fragments
    if name.endswith(' de') or name.startswith('de ') or name == "d'Artista":
        return False
    
    return True

def is_valid_teacher_name(name):
    """Check if a string is likely a valid teacher name"""
    # Skip obvious non-teachers
    if name in ['Tutories', 'Gràfica II', 'Projectes de', 'Disseny II']:
        return False
    
    # Skip time patterns
    if re.match(r'^\d+:\d+', name):
        return False
    
    # Skip classroom codes
    if re.match(r'^[PGLC]\d+\.\d+', name):
        return False
    
    # Must have at least 2 parts (first and last name)
    parts = name.split()
    if len(parts) < 2:
        return False
    
    # Skip if contains numbers (except Roman numerals)
    if re.search(r'\d', name) and not re.search(r'\b[IVX]+\b', name):
        return False
    
    return True

def clean_teacher_mappings(mappings_file):
    """Clean teacher mappings to remove false positives"""
    with open(mappings_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    cleaned_mappings = []
    for mapping in data['mappings']:
        if mapping['needs_creation'] and is_valid_teacher_name(mapping['excel_name']):
            cleaned_mappings.append(mapping)
        elif not mapping['needs_creation']:
            cleaned_mappings.append(mapping)
    
    return cleaned_mappings

def clean_subject_mappings(mappings_file):
    """Clean subject mappings to remove false positives"""
    with open(mappings_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    cleaned_mappings = []
    for mapping in data['mappings']:
        if not mapping['exists_in_db'] and is_valid_subject_name(mapping['excel_name']):
            cleaned_mappings.append(mapping)
        elif mapping['exists_in_db']:
            cleaned_mappings.append(mapping)
    
    return cleaned_mappings

def generate_preview_report():
    """Generate comprehensive preview report"""
    
    base_dir = '/Users/josepmarimon/Documents/github/bau-assist'
    csv_dir = os.path.join(base_dir, 'csv')
    
    # Load all mapping files
    classroom_mappings = json.load(open(os.path.join(csv_dir, 'classroom_mappings.json'), 'r'))
    teacher_mappings = json.load(open(os.path.join(csv_dir, 'teacher_mappings.json'), 'r'))
    subject_mappings = json.load(open(os.path.join(csv_dir, 'subject_mappings.json'), 'r'))
    
    # Clean mappings
    cleaned_teachers = clean_teacher_mappings(os.path.join(csv_dir, 'teacher_mappings.json'))
    cleaned_subjects = clean_subject_mappings(os.path.join(csv_dir, 'subject_mappings.json'))
    
    # Generate report
    report_lines = []
    report_lines.append("# PREVIEW: Database Synchronization Changes")
    report_lines.append(f"\nGenerated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report_lines.append("\n## Summary of Changes")
    
    # Classrooms
    new_classrooms = [m for m in classroom_mappings['mappings'] if not m['exists_in_db']]
    report_lines.append(f"\n### Classrooms")
    report_lines.append(f"- Mapped successfully: {classroom_mappings['mapped_count']}")
    report_lines.append(f"- To be created: {len(new_classrooms)}")
    if new_classrooms:
        report_lines.append("\nNew classrooms:")
        for c in new_classrooms[:10]:
            report_lines.append(f"  - {c['excel_code']} → {c['db_code']}")
    
    # Teachers
    new_teachers = [m for m in cleaned_teachers if m.get('needs_creation', False)]
    matched_teachers = [m for m in cleaned_teachers if not m.get('needs_creation', False)]
    report_lines.append(f"\n### Teachers")
    report_lines.append(f"- Matched successfully: {len(matched_teachers)}")
    report_lines.append(f"- To be created: {len(new_teachers)}")
    report_lines.append(f"- Filtered out (false positives): {len(teacher_mappings['mappings']) - len(cleaned_teachers)}")
    
    if new_teachers:
        report_lines.append("\nNew teachers to create:")
        for t in new_teachers[:10]:
            report_lines.append(f"  - {t['excel_name']}")
        if len(new_teachers) > 10:
            report_lines.append(f"  ... and {len(new_teachers) - 10} more")
    
    # Subjects
    new_subjects = [m for m in cleaned_subjects if not m['exists_in_db']]
    itinerari_updates = [m for m in cleaned_subjects if m.get('needs_itinerari_update', False)]
    report_lines.append(f"\n### Subjects")
    report_lines.append(f"- Matched successfully: {len([m for m in cleaned_subjects if m['exists_in_db']])}")
    report_lines.append(f"- To be created: {len(new_subjects)}")
    report_lines.append(f"- Itinerari updates: {len(itinerari_updates)}")
    report_lines.append(f"- Filtered out (false positives): {len(subject_mappings['mappings']) - len(cleaned_subjects)}")
    
    if new_subjects:
        report_lines.append("\nNew subjects to create:")
        by_degree = {}
        for s in new_subjects:
            degree = s['excel_grado']
            if degree not in by_degree:
                by_degree[degree] = []
            by_degree[degree].append(f"{s['excel_name']} ({s['excel_curso']})")
        
        for degree, subjects in by_degree.items():
            report_lines.append(f"\n{degree}:")
            for subj in subjects[:5]:
                report_lines.append(f"  - {subj}")
            if len(subjects) > 5:
                report_lines.append(f"  ... and {len(subjects) - 5} more")
    
    # Estimated impact
    report_lines.append("\n## Estimated Impact")
    report_lines.append(f"- New database records to create: {len(new_classrooms) + len(new_teachers) + len(new_subjects)}")
    report_lines.append(f"- Existing records to update: {len(itinerari_updates)}")
    
    # Save report
    report_path = os.path.join(csv_dir, 'sync_preview_report.md')
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report_lines))
    
    print(f"Preview report saved to: {report_path}")
    
    # Generate final SQL scripts
    generate_final_sql_scripts(new_classrooms, new_teachers, new_subjects, itinerari_updates, csv_dir)
    
    return len(new_classrooms), len(new_teachers), len(new_subjects), len(itinerari_updates)

def generate_final_sql_scripts(new_classrooms, new_teachers, new_subjects, itinerari_updates, output_dir):
    """Generate final SQL scripts after filtering"""
    
    # Combined SQL file
    sql_path = os.path.join(output_dir, 'final_sync_changes.sql')
    with open(sql_path, 'w', encoding='utf-8') as f:
        f.write("-- Final Database Synchronization Script\n")
        f.write(f"-- Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("-- IMPORTANT: Review before executing\n\n")
        
        # Classrooms
        if new_classrooms:
            f.write("-- ========== NEW CLASSROOMS ==========\n")
            for c in new_classrooms:
                code = c['db_code']
                type_map = {'P': 'teoria', 'G': 'taller', 'L': 'informatica'}
                ctype = type_map.get(code[0], 'polivalent')
                capacity = 30
                f.write(f"INSERT INTO classrooms (code, name, capacity, type, is_available) VALUES ('{code}', '{code}', {capacity}, '{ctype}', true);\n")
            f.write("\n")
        
        # Teachers
        if new_teachers:
            f.write("-- ========== NEW TEACHERS ==========\n")
            f.write("-- NOTE: Review and update email addresses\n")
            for t in new_teachers:
                names = t['excel_name'].split()
                first_name = names[0]
                last_name = ' '.join(names[1:])
                code = f"T{datetime.now().strftime('%y%m%d')}_{hash(t['excel_name']) % 1000:03d}"
                email = f"{first_name.lower()}.{last_name.lower().replace(' ', '')}@bau.cat"
                f.write(f"INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('{code}', '{first_name}', '{last_name}', '{email}', 20);\n")
            f.write("\n")
        
        # Subjects
        if new_subjects:
            f.write("-- ========== NEW SUBJECTS ==========\n")
            for s in new_subjects:
                code = f"{s['excel_grado'][:3]}{s['excel_curso'][0]}_{hash(s['excel_name']) % 10000:04d}"
                year = int(s['excel_curso'][0]) if s['excel_curso'][0].isdigit() else 1
                type_val = 'optativa' if s['excel_tipo'].lower() == 'optativa' else 'obligatoria'
                credits = 3 if type_val == 'optativa' else 6
                
                name_escaped = s['excel_name'].replace("'", "''")
                f.write(f"INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES (")
                f.write(f"'{code}', '{name_escaped}', {credits}, {year}, '{type_val}'")
                if s['excel_itinerari']:
                    f.write(f", '{s['excel_itinerari']}'")
                else:
                    f.write(", NULL")
                f.write(");\n")
            f.write("\n")
        
        # Itinerari updates
        if itinerari_updates:
            f.write("-- ========== ITINERARI UPDATES ==========\n")
            for u in itinerari_updates:
                f.write(f"UPDATE subjects SET itinerari = '{u['excel_itinerari']}' WHERE id = '{u['db_id']}';\n")
    
    print(f"Final SQL script saved to: {sql_path}")

def main():
    """Main function"""
    print("Generating synchronization preview...")
    print("=" * 80)
    
    classrooms, teachers, subjects, updates = generate_preview_report()
    
    print(f"\nSummary:")
    print(f"- New classrooms: {classrooms}")
    print(f"- New teachers: {teachers}")
    print(f"- New subjects: {subjects}")
    print(f"- Updates: {updates}")
    print(f"\nTotal changes: {classrooms + teachers + subjects + updates}")

if __name__ == "__main__":
    main()