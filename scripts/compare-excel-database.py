#!/usr/bin/env python3
"""
Compare data extracted from Excel schedules with data from the Supabase database.
Generates a detailed report of differences and inconsistencies.
"""

import json
import os
from datetime import datetime
from collections import defaultdict
import re
from difflib import SequenceMatcher

# File paths
EXCEL_DATA_FILE = '/Users/josepmarimon/Documents/github/bau-assist/csv/extracted_excel_data_fixed.json'
DATABASE_DATA_FILE = '/Users/josepmarimon/Documents/github/bau-assist/csv/extracted_database_data.json'
REPORT_FILE = '/Users/josepmarimon/Documents/github/bau-assist/csv/comparison_report.md'

def normalize_string(s):
    """Normalize string for comparison"""
    if not s:
        return ""
    # Convert to lowercase, remove extra spaces, remove accents
    s = s.lower().strip()
    s = re.sub(r'\s+', ' ', s)
    # Common replacements
    replacements = {
        'á': 'a', 'à': 'a', 'ä': 'a',
        'é': 'e', 'è': 'e', 'ë': 'e',
        'í': 'i', 'ì': 'i', 'ï': 'i',
        'ó': 'o', 'ò': 'o', 'ö': 'o',
        'ú': 'u', 'ù': 'u', 'ü': 'u',
        'ñ': 'n', 'ç': 'c',
        "d'": 'd', "l'": 'l', "s'": 's'
    }
    for old, new in replacements.items():
        s = s.replace(old, new)
    return s

def similarity_ratio(s1, s2):
    """Calculate similarity ratio between two strings"""
    return SequenceMatcher(None, normalize_string(s1), normalize_string(s2)).ratio()

def find_best_match(name, candidates, threshold=0.8):
    """Find best matching candidate for a given name"""
    best_match = None
    best_ratio = 0
    
    for candidate in candidates:
        ratio = similarity_ratio(name, candidate)
        if ratio > best_ratio and ratio >= threshold:
            best_ratio = ratio
            best_match = candidate
    
    return best_match, best_ratio

def compare_subjects(excel_subjects, db_subjects):
    """Compare subjects between Excel and database"""
    comparison = {
        'excel_only': [],
        'db_only': [],
        'matched': [],
        'itinerari_differences': [],
        'type_differences': [],
        'year_differences': []
    }
    
    # Create lookup dictionaries
    excel_by_name = {}
    for subj in excel_subjects:
        name = subj['asignatura']
        if name not in excel_by_name:
            excel_by_name[name] = []
        excel_by_name[name].append(subj)
    
    db_by_name = {subj['name']: subj for subj in db_subjects}
    
    # Find matches and differences
    matched_db = set()
    
    for excel_name, excel_subjs in excel_by_name.items():
        # Try exact match first
        db_match = None
        if excel_name in db_by_name:
            db_match = db_by_name[excel_name]
            matched_db.add(excel_name)
        else:
            # Try fuzzy match
            best_match, ratio = find_best_match(excel_name, db_by_name.keys())
            if best_match:
                db_match = db_by_name[best_match]
                matched_db.add(best_match)
        
        if db_match:
            for excel_subj in excel_subjs:
                match_info = {
                    'excel_name': excel_name,
                    'db_name': db_match['name'],
                    'excel_data': excel_subj,
                    'db_data': db_match
                }
                comparison['matched'].append(match_info)
                
                # Check for differences
                # Year
                excel_year = int(excel_subj['curso'][0]) if excel_subj['curso'] else None
                if excel_year and db_match.get('year') != excel_year:
                    comparison['year_differences'].append({
                        'subject': excel_name,
                        'excel_year': excel_year,
                        'db_year': db_match.get('year')
                    })
                
                # Type
                excel_type = excel_subj.get('tipo', 'Obligatoria').lower()
                db_type = db_match.get('type', '').lower()
                if excel_type == 'obligatoria' and db_type != 'obligatoria':
                    comparison['type_differences'].append({
                        'subject': excel_name,
                        'excel_type': excel_type,
                        'db_type': db_type
                    })
                
                # Itinerari
                if excel_subj.get('itinerari') and db_match.get('itinerari') != excel_subj['itinerari']:
                    comparison['itinerari_differences'].append({
                        'subject': excel_name,
                        'excel_itinerari': excel_subj['itinerari'],
                        'db_itinerari': db_match.get('itinerari')
                    })
        else:
            comparison['excel_only'].append({
                'name': excel_name,
                'data': excel_subjs[0]  # Use first occurrence
            })
    
    # Find subjects only in database
    for db_name, db_subj in db_by_name.items():
        if db_name not in matched_db:
            comparison['db_only'].append({
                'name': db_name,
                'data': db_subj
            })
    
    return comparison

def compare_classrooms(excel_data, db_classrooms):
    """Compare classrooms between Excel and database"""
    # Extract unique classrooms from Excel
    excel_classrooms = set()
    for entry in excel_data:
        excel_classrooms.update(entry.get('aulas', []))
    
    # Get database classroom codes
    db_codes = {c['code'] for c in db_classrooms}
    
    comparison = {
        'excel_only': list(excel_classrooms - db_codes),
        'db_only': list(db_codes - excel_classrooms),
        'matched': list(excel_classrooms & db_codes)
    }
    
    return comparison

def compare_teachers(excel_data, db_teachers):
    """Compare teachers between Excel and database"""
    # Extract unique teachers from Excel
    excel_teachers = set()
    for entry in excel_data:
        if entry.get('profesor'):
            excel_teachers.add(entry['profesor'])
    
    # Create database teacher full names
    db_teacher_names = {f"{t['first_name']} {t['last_name']}": t for t in db_teachers}
    
    comparison = {
        'excel_only': [],
        'db_only': [],
        'matched': [],
        'possible_matches': []
    }
    
    matched_db = set()
    
    for excel_teacher in excel_teachers:
        # Try exact match
        if excel_teacher in db_teacher_names:
            comparison['matched'].append({
                'excel_name': excel_teacher,
                'db_data': db_teacher_names[excel_teacher]
            })
            matched_db.add(excel_teacher)
        else:
            # Try fuzzy match
            best_match, ratio = find_best_match(excel_teacher, db_teacher_names.keys(), threshold=0.7)
            if best_match:
                comparison['possible_matches'].append({
                    'excel_name': excel_teacher,
                    'db_name': best_match,
                    'similarity': f"{ratio:.2%}"
                })
                matched_db.add(best_match)
            else:
                comparison['excel_only'].append(excel_teacher)
    
    # Find teachers only in database
    for db_name in db_teacher_names:
        if db_name not in matched_db:
            comparison['db_only'].append(db_name)
    
    return comparison

def compare_groups(excel_data, db_groups):
    """Compare student groups between Excel and database"""
    # Extract unique groups from Excel
    excel_groups = set()
    for entry in excel_data:
        if entry.get('grupo') and entry['grupo'] != 'Unknown':
            excel_groups.add(entry['grupo'])
    
    # Get database group names
    db_group_names = {g['name'] for g in db_groups}
    
    comparison = {
        'excel_only': list(excel_groups - db_group_names),
        'db_only': list(db_group_names - excel_groups),
        'matched': list(excel_groups & db_group_names)
    }
    
    return comparison

def generate_report(excel_data, db_data):
    """Generate comprehensive comparison report"""
    report_lines = []
    
    # Header
    report_lines.append("# Informe de Comparación: Horarios Excel vs Base de Datos")
    report_lines.append(f"\n**Fecha de generación:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report_lines.append(f"\n**Archivos analizados:**")
    report_lines.append(f"- Excel: {len(excel_data['data'])} entradas de {excel_data['total_files_processed']} archivos")
    report_lines.append(f"- Base de datos: {db_data['summary']['total_subjects']} asignaturas, "
                       f"{db_data['summary']['total_classrooms']} aulas, "
                       f"{db_data['summary']['total_teachers']} profesores")
    
    # Executive Summary
    report_lines.append("\n## Resumen Ejecutivo")
    
    # Extract subjects for comparison
    excel_subjects = excel_data['data']
    db_subjects = db_data['subjects']
    
    # Compare subjects
    subject_comp = compare_subjects(excel_subjects, db_subjects)
    
    report_lines.append(f"\n### Asignaturas")
    report_lines.append(f"- **Coincidencias encontradas:** {len(subject_comp['matched'])}")
    report_lines.append(f"- **Solo en Excel:** {len(subject_comp['excel_only'])}")
    report_lines.append(f"- **Solo en BD:** {len(subject_comp['db_only'])}")
    report_lines.append(f"- **Diferencias de itinerari:** {len(subject_comp['itinerari_differences'])}")
    report_lines.append(f"- **Diferencias de tipo:** {len(subject_comp['type_differences'])}")
    report_lines.append(f"- **Diferencias de año:** {len(subject_comp['year_differences'])}")
    
    # Compare classrooms
    classroom_comp = compare_classrooms(excel_data['data'], db_data['classrooms'])
    
    report_lines.append(f"\n### Aulas")
    report_lines.append(f"- **Coincidencias:** {len(classroom_comp['matched'])}")
    report_lines.append(f"- **Solo en Excel:** {len(classroom_comp['excel_only'])}")
    report_lines.append(f"- **Solo en BD:** {len(classroom_comp['db_only'])}")
    
    # Compare teachers
    teacher_comp = compare_teachers(excel_data['data'], db_data['teachers'])
    
    report_lines.append(f"\n### Profesores")
    report_lines.append(f"- **Coincidencias exactas:** {len(teacher_comp['matched'])}")
    report_lines.append(f"- **Posibles coincidencias:** {len(teacher_comp['possible_matches'])}")
    report_lines.append(f"- **Solo en Excel:** {len(teacher_comp['excel_only'])}")
    report_lines.append(f"- **Solo en BD:** {len(teacher_comp['db_only'])}")
    
    # Compare groups
    group_comp = compare_groups(excel_data['data'], db_data['student_groups'])
    
    report_lines.append(f"\n### Grupos de Estudiantes")
    report_lines.append(f"- **Coincidencias:** {len(group_comp['matched'])}")
    report_lines.append(f"- **Solo en Excel:** {len(group_comp['excel_only'])}")
    report_lines.append(f"- **Solo en BD:** {len(group_comp['db_only'])}")
    
    # Detailed sections
    report_lines.append("\n## Análisis Detallado")
    
    # Subjects only in Excel
    if subject_comp['excel_only']:
        report_lines.append("\n### Asignaturas Solo en Excel")
        report_lines.append("\n| Asignatura | Grado | Curso | Tipo | Itinerari | Profesor |")
        report_lines.append("|------------|-------|-------|------|-----------|----------|")
        for item in subject_comp['excel_only'][:20]:  # Limit to 20
            data = item['data']
            report_lines.append(f"| {item['name']} | {data['grado']} | {data['curso']} | "
                              f"{data['tipo']} | {data.get('itinerari', 'N/A')} | {data.get('profesor', 'N/A')} |")
        if len(subject_comp['excel_only']) > 20:
            report_lines.append(f"\n*... y {len(subject_comp['excel_only']) - 20} más*")
    
    # Subjects only in database
    if subject_comp['db_only']:
        report_lines.append("\n### Asignaturas Solo en Base de Datos")
        report_lines.append("\n| Código | Nombre | Año | Tipo | Créditos |")
        report_lines.append("|--------|--------|-----|------|----------|")
        for item in subject_comp['db_only'][:20]:
            data = item['data']
            report_lines.append(f"| {data['code']} | {data['name']} | {data['year']} | "
                              f"{data['type']} | {data['credits']} |")
        if len(subject_comp['db_only']) > 20:
            report_lines.append(f"\n*... y {len(subject_comp['db_only']) - 20} más*")
    
    # Itinerari differences
    if subject_comp['itinerari_differences']:
        report_lines.append("\n### Diferencias de Itinerari")
        report_lines.append("\n| Asignatura | Itinerari Excel | Itinerari BD |")
        report_lines.append("|------------|-----------------|--------------|")
        for diff in subject_comp['itinerari_differences'][:15]:
            report_lines.append(f"| {diff['subject']} | {diff['excel_itinerari']} | "
                              f"{diff['db_itinerari'] or 'N/A'} |")
    
    # Classroom differences
    if classroom_comp['excel_only']:
        report_lines.append("\n### Aulas Solo en Excel")
        report_lines.append(f"\n{', '.join(sorted(classroom_comp['excel_only']))}")
    
    if classroom_comp['db_only']:
        report_lines.append("\n### Aulas Solo en Base de Datos")
        report_lines.append(f"\n{', '.join(sorted(classroom_comp['db_only']))}")
    
    # Teacher matches
    if teacher_comp['possible_matches']:
        report_lines.append("\n### Posibles Coincidencias de Profesores")
        report_lines.append("\n| Nombre Excel | Nombre BD | Similitud |")
        report_lines.append("|--------------|-----------|-----------|")
        for match in teacher_comp['possible_matches'][:15]:
            report_lines.append(f"| {match['excel_name']} | {match['db_name']} | {match['similarity']} |")
    
    # Group differences
    if group_comp['excel_only']:
        report_lines.append("\n### Grupos Solo en Excel")
        report_lines.append(f"\n{', '.join(sorted(group_comp['excel_only']))}")
    
    if group_comp['db_only']:
        report_lines.append("\n### Grupos Solo en Base de Datos")
        report_lines.append(f"\n{', '.join(sorted(group_comp['db_only']))}")
    
    # Recommendations
    report_lines.append("\n## Recomendaciones")
    report_lines.append("\n1. **Asignaturas:** Revisar y sincronizar las asignaturas que solo aparecen en Excel")
    report_lines.append("2. **Itinerarios:** Actualizar los itinerarios en la base de datos según los datos de Excel")
    report_lines.append("3. **Profesores:** Verificar los nombres de profesores para asegurar coincidencias")
    report_lines.append("4. **Aulas:** Crear las aulas faltantes en la base de datos")
    report_lines.append("5. **Grupos:** Sincronizar los grupos de estudiantes entre ambos sistemas")
    
    # Statistics by degree and year
    report_lines.append("\n## Estadísticas por Grado y Curso")
    
    # Excel statistics
    excel_stats = defaultdict(lambda: defaultdict(int))
    for entry in excel_data['data']:
        key = f"{entry['grado_code']}_{entry['curso']}"
        excel_stats[entry['grado_code']][entry['curso']] += 1
    
    report_lines.append("\n### Distribución en Excel")
    report_lines.append("\n| Grado | 1r | 2n | 3r | 4t | Total |")
    report_lines.append("|-------|----|----|----|----|-------|")
    
    for grado in sorted(excel_stats.keys()):
        row = f"| {grado} "
        total = 0
        for curso in ['1r', '2n', '3r', '4t']:
            count = excel_stats[grado].get(curso, 0)
            total += count
            row += f"| {count} "
        row += f"| {total} |"
        report_lines.append(row)
    
    return "\n".join(report_lines)

def main():
    """Main function"""
    print("Loading data files...")
    
    # Load Excel data
    with open(EXCEL_DATA_FILE, 'r', encoding='utf-8') as f:
        excel_data = json.load(f)
    
    # Load database data
    with open(DATABASE_DATA_FILE, 'r', encoding='utf-8') as f:
        db_data = json.load(f)
    
    print("Generating comparison report...")
    
    # Generate report
    report = generate_report(excel_data, db_data)
    
    # Save report
    with open(REPORT_FILE, 'w', encoding='utf-8') as f:
        f.write(report)
    
    print(f"Report saved to: {REPORT_FILE}")
    
    # Print summary
    print("\nQuick Summary:")
    print(f"- Excel entries: {len(excel_data['data'])}")
    print(f"- Database subjects: {len(db_data['subjects'])}")
    print(f"- Database classrooms: {len(db_data['classrooms'])}")
    print(f"- Database teachers: {len(db_data['teachers'])}")

if __name__ == "__main__":
    main()