#!/usr/bin/env python3
"""
Improved extraction of schedule data from GBA Excel files with grouped drawing objects.
This version better handles text reconstruction and subject/professor/classroom matching.
"""

import zipfile
import xml.etree.ElementTree as ET
import os
import re
import json
from datetime import datetime
from collections import defaultdict

def extract_shapes_with_details(file_path):
    """Extract all shapes with text, position, and formatting details"""
    
    shapes = []
    
    with zipfile.ZipFile(file_path, 'r') as zip_file:
        if 'xl/drawings/drawing1.xml' in zip_file.namelist():
            with zip_file.open('xl/drawings/drawing1.xml') as drawing_file:
                content = drawing_file.read().decode('utf-8')
                root = ET.fromstring(content)
                
                namespaces = {
                    'xdr': 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing',
                    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'
                }
                
                # Process each two-cell anchor (shape container)
                for anchor in root.findall('.//xdr:twoCellAnchor', namespaces):
                    # Get position
                    from_elem = anchor.find('xdr:from', namespaces)
                    to_elem = anchor.find('xdr:to', namespaces)
                    
                    if from_elem is not None:
                        from_col = int(from_elem.find('xdr:col', namespaces).text) if from_elem.find('xdr:col', namespaces) is not None else 0
                        from_row = int(from_elem.find('xdr:row', namespaces).text) if from_elem.find('xdr:row', namespaces) is not None else 0
                    else:
                        from_col, from_row = 0, 0
                    
                    if to_elem is not None:
                        to_col = int(to_elem.find('xdr:col', namespaces).text) if to_elem.find('xdr:col', namespaces) is not None else 0
                        to_row = int(to_elem.find('xdr:row', namespaces).text) if to_elem.find('xdr:row', namespaces) is not None else 0
                    else:
                        to_col, to_row = from_col, from_row
                    
                    # Get shape and its text
                    shape_elem = anchor.find('.//xdr:sp', namespaces)
                    if shape_elem is not None:
                        # Extract all text runs
                        text_runs = []
                        for paragraph in shape_elem.findall('.//a:p', namespaces):
                            para_text = []
                            for run in paragraph.findall('.//a:r', namespaces):
                                text_elem = run.find('a:t', namespaces)
                                if text_elem is not None and text_elem.text:
                                    para_text.append(text_elem.text)
                            if para_text:
                                text_runs.append(''.join(para_text))
                        
                        if text_runs:
                            # Join with spaces where appropriate
                            full_text = ' '.join(text_runs)
                            
                            # Fix common text issues
                            full_text = re.sub(r'([a-z])([A-Z])', r'\1 \2', full_text)  # Add space between camelCase
                            full_text = re.sub(r'(\d)([A-Za-z])', r'\1 \2', full_text)  # Add space between numbers and letters
                            full_text = re.sub(r'([a-z])(\d)', r'\1 \2', full_text)  # Add space between letters and numbers
                            full_text = re.sub(r'\s+', ' ', full_text).strip()  # Normalize spaces
                            
                            shapes.append({
                                'text': full_text,
                                'from_row': from_row,
                                'from_col': from_col,
                                'to_row': to_row,
                                'to_col': to_col,
                                'width': to_col - from_col,
                                'height': to_row - from_row
                            })
    
    return shapes

def group_shapes_by_position(shapes):
    """Group shapes that are likely to be related based on position"""
    
    # Sort by row first, then column
    shapes.sort(key=lambda x: (x['from_row'], x['from_col']))
    
    # Group by approximate row position
    row_groups = defaultdict(list)
    for shape in shapes:
        # Use a row bucket (group shapes within 2 rows of each other)
        row_bucket = shape['from_row'] // 2
        row_groups[row_bucket].append(shape)
    
    return row_groups

def identify_shape_type(text):
    """Identify what type of content a shape contains"""
    
    # Patterns
    time_pattern = re.compile(r'^\d{1,2}:\d{2}')
    classroom_pattern = re.compile(r'[PGLC]\d+\.\d+')
    day_pattern = re.compile(r'(DILLUNS|DIMARTS|DIMECRES|DIJOUS|DIVENDRES)')
    
    # Classifications
    if time_pattern.match(text):
        return 'time'
    elif day_pattern.search(text):
        return 'day'
    elif classroom_pattern.search(text) and len(text) < 20:
        return 'classroom'
    elif text in ['tutories', 'Tutories', 'CURS', 'GRAU EN BELLES ARTS', 'GRAU EN BELLESARTS']:
        return 'header'
    elif '1r semestre' in text.lower() or '2n semestre' in text.lower():
        return 'semester'
    elif text.isdigit() or re.match(r'^\d+\s*[MT]\d*$', text):
        return 'group'
    elif len(text) < 5:
        return 'misc'
    elif len(text) > 100:  # Very long text is likely multiple subjects
        return 'multi_subject'
    elif len(text) > 20:  # Medium length is likely a subject
        return 'subject'
    else:
        return 'professor'  # Short-medium text might be professor name

def parse_multi_subject_text(text):
    """Parse text that contains multiple subjects"""
    subjects = []
    
    # Split by common delimiters
    parts = re.split(r'\s*[-–—]\s*|\s*\n\s*', text)
    
    current_subject = None
    current_professor = None
    current_classrooms = []
    
    for part in parts:
        part = part.strip()
        if not part:
            continue
        
        # Extract classrooms from this part
        classrooms = re.findall(r'[PGLC]\d+\.\d+', part)
        
        # Remove classrooms to get the remaining text
        remaining = part
        for classroom in classrooms:
            remaining = remaining.replace(classroom, '')
        remaining = remaining.strip()
        
        # If this part has classrooms and text, it's likely professor + classroom
        if classrooms and remaining and current_subject:
            subjects.append({
                'name': current_subject,
                'professor': remaining if len(remaining) > 3 else None,
                'classrooms': classrooms
            })
            current_subject = None
        # If no classrooms and long enough, it's likely a subject name
        elif not classrooms and len(remaining) > 15:
            if current_subject:  # Save previous subject if any
                subjects.append({
                    'name': current_subject,
                    'professor': current_professor,
                    'classrooms': current_classrooms
                })
            current_subject = remaining
            current_professor = None
            current_classrooms = []
        # Short text with no classrooms might be professor
        elif not classrooms and len(remaining) > 3 and current_subject:
            current_professor = remaining
    
    # Don't forget the last subject
    if current_subject:
        subjects.append({
            'name': current_subject,
            'professor': current_professor,
            'classrooms': current_classrooms
        })
    
    return subjects

def extract_schedule_from_shapes(shapes, filename):
    """Extract schedule data from shapes with improved logic"""
    
    schedule_data = []
    row_groups = group_shapes_by_position(shapes)
    
    # Parse filename for metadata
    curso = None
    if '_1r_' in filename:
        curso = '1r'
    elif '_2n_' in filename:
        curso = '2n'
    elif '_3r_' in filename:
        curso = '3r'
    elif '_4t_' in filename:
        curso = '4t'
    
    current_semester = None
    
    # Process each row group
    for row_bucket in sorted(row_groups.keys()):
        shapes_in_row = row_groups[row_bucket]
        
        # Classify shapes in this row
        classified = defaultdict(list)
        for shape in shapes_in_row:
            shape_type = identify_shape_type(shape['text'])
            classified[shape_type].append(shape)
        
        # Update semester if found
        for semester_shape in classified['semester']:
            if '1r semestre' in semester_shape['text'].lower():
                current_semester = 1
            elif '2n semestre' in semester_shape['text'].lower():
                current_semester = 2
        
        # Process multi-subject shapes
        for multi_shape in classified['multi_subject']:
            subjects = parse_multi_subject_text(multi_shape['text'])
            for subj in subjects:
                if subj['name'] and 'Optativitat' not in subj['name']:
                    entry = {
                        'asignatura': subj['name'],
                        'grado': 'Belles Arts',
                        'grado_code': 'GBA',
                        'curso': curso,
                        'semestre': current_semester,
                        'tipo': 'Obligatoria',
                        'profesor': subj['professor'],
                        'aulas': subj['classrooms'],
                        'archivo': filename
                    }
                    schedule_data.append(entry)
        
        # Process single subjects
        for subject_shape in classified['subject']:
            subject_name = subject_shape['text']
            
            # Skip if it's just "Optativitat"
            if subject_name == 'Optativitat':
                continue
            
            # Look for associated professor/classroom
            professor = None
            classrooms = []
            
            # Check shapes in same row that come after this subject
            subject_col = subject_shape['from_col']
            for other_shape in shapes_in_row:
                if other_shape['from_col'] > subject_col:
                    other_type = identify_shape_type(other_shape['text'])
                    if other_type == 'professor':
                        professor = other_shape['text']
                    elif other_type == 'classroom':
                        classrooms = re.findall(r'[PGLC]\d+\.\d+', other_shape['text'])
            
            entry = {
                'asignatura': subject_name,
                'grado': 'Belles Arts',
                'grado_code': 'GBA',
                'curso': curso,
                'semestre': current_semester,
                'tipo': 'Obligatoria',
                'profesor': professor,
                'aulas': classrooms,
                'archivo': filename
            }
            schedule_data.append(entry)
    
    return schedule_data

def main():
    """Main function"""
    
    excel_dir = '/Users/josepmarimon/Documents/github/bau-assist/csv/excelhorari'
    output_file = '/Users/josepmarimon/Documents/github/bau-assist/csv/extracted_gba_schedules_improved.json'
    
    gba_files = ['Horaris_GBA_1r_2526.xlsx', 'Horaris_GBA_2n_2526.xlsx', 
                 'Horaris_GBA_3r_2526.xlsx', 'Horaris_GBA_4t_2526.xlsx']
    
    all_schedules = []
    
    print("Extracting GBA schedules from drawing objects (Improved Version)...")
    print("=" * 80)
    
    for filename in gba_files:
        file_path = os.path.join(excel_dir, filename)
        print(f"\nProcessing: {filename}")
        
        try:
            # Extract shapes
            shapes = extract_shapes_with_details(file_path)
            print(f"  Found {len(shapes)} shapes")
            
            # Parse schedule data
            schedule_data = extract_schedule_from_shapes(shapes, filename)
            
            # Remove duplicates
            unique_subjects = {}
            for entry in schedule_data:
                key = f"{entry['asignatura']}_{entry['semestre']}"
                if key not in unique_subjects:
                    unique_subjects[key] = entry
            
            schedule_data = list(unique_subjects.values())
            print(f"  Extracted {len(schedule_data)} unique schedule entries")
            
            all_schedules.extend(schedule_data)
            
            # Show sample entries
            if schedule_data:
                print("  Sample entries:")
                for entry in schedule_data[:3]:
                    print(f"    - {entry['asignatura']}")
                    if entry['profesor']:
                        print(f"      Professor: {entry['profesor']}")
                    if entry['aulas']:
                        print(f"      Aulas: {', '.join(entry['aulas'])}")
            
        except Exception as e:
            print(f"  ERROR: {str(e)}")
            import traceback
            traceback.print_exc()
    
    # Save results
    output_data = {
        'extraction_date': datetime.now().isoformat(),
        'extraction_method': 'drawing_objects_improved',
        'total_entries': len(all_schedules),
        'data': all_schedules
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n{'='*80}")
    print(f"Total GBA schedule entries extracted: {len(all_schedules)}")
    print(f"Data saved to: {output_file}")
    
    # Summary by course
    by_course = defaultdict(int)
    for entry in all_schedules:
        course = entry['curso'] or 'Unknown'
        by_course[course] += 1
    
    print("\nEntries by course:")
    for course, count in sorted(by_course.items()):
        print(f"  {course}: {count}")
    
    # Show all unique subjects
    print("\nUnique subjects found:")
    unique_subjects = sorted(set(entry['asignatura'] for entry in all_schedules))
    for i, subject in enumerate(unique_subjects, 1):
        print(f"  {i}. {subject}")

if __name__ == "__main__":
    main()