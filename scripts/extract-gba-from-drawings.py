#!/usr/bin/env python3
"""
Extract schedule data from GBA Excel files that contain grouped drawing objects.
These files store schedule information in drawing shapes rather than cells.
"""

import zipfile
import xml.etree.ElementTree as ET
import os
import re
import json
from datetime import datetime

def extract_text_from_drawings(file_path):
    """Extract all text from drawing objects in Excel file"""
    
    texts = []
    
    with zipfile.ZipFile(file_path, 'r') as zip_file:
        # Check if drawing file exists
        if 'xl/drawings/drawing1.xml' in zip_file.namelist():
            with zip_file.open('xl/drawings/drawing1.xml') as drawing_file:
                content = drawing_file.read().decode('utf-8')
                
                # Parse XML
                root = ET.fromstring(content)
                
                # Define namespaces
                namespaces = {
                    'xdr': 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing',
                    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'
                }
                
                # Find all shape elements with their positions
                shapes = []
                for shape in root.findall('.//xdr:sp', namespaces):
                    # Get position
                    from_elem = shape.find('../xdr:from', namespaces)
                    if from_elem is not None:
                        col = int(from_elem.find('xdr:col', namespaces).text) if from_elem.find('xdr:col', namespaces) is not None else 0
                        row = int(from_elem.find('xdr:row', namespaces).text) if from_elem.find('xdr:row', namespaces) is not None else 0
                    else:
                        col, row = 0, 0
                    
                    # Extract text from shape
                    text_elements = shape.findall('.//a:t', namespaces)
                    if text_elements:
                        # Combine all text elements in this shape
                        shape_text = ''.join([elem.text for elem in text_elements if elem.text])
                        if shape_text.strip():
                            shapes.append({
                                'text': shape_text.strip(),
                                'row': row,
                                'col': col
                            })
                
                # Sort by position (row, then column)
                shapes.sort(key=lambda x: (x['row'], x['col']))
                texts = shapes
    
    return texts

def parse_schedule_from_shapes(shapes, filename):
    """Parse schedule data from extracted shapes"""
    
    schedule_data = []
    
    # Patterns for identification
    time_pattern = re.compile(r'^\d{1,2}:\d{2}$')
    classroom_pattern = re.compile(r'^[PGLC]\d+\.\d+')
    day_pattern = re.compile(r'^(DILLUNS|DIMARTS|DIMECRES|DIJOUS|DIVENDRES)')
    
    # Group shapes by approximate row position
    rows = {}
    for shape in shapes:
        row_key = shape['row'] // 2  # Group nearby rows
        if row_key not in rows:
            rows[row_key] = []
        rows[row_key].append(shape)
    
    # Process each row group
    current_time = None
    current_semester = None
    
    for row_key in sorted(rows.keys()):
        row_shapes = sorted(rows[row_key], key=lambda x: x['col'])
        
        for shape in row_shapes:
            text = shape['text']
            
            # Skip short texts
            if len(text) < 3:
                continue
            
            # Identify semester
            if '1r semestre' in text.lower():
                current_semester = 1
                continue
            elif '2n semestre' in text.lower():
                current_semester = 2
                continue
            
            # Skip times, days, and other non-subject texts
            if (time_pattern.match(text) or 
                day_pattern.match(text) or
                text in ['tutories', 'Tutories', 'CURS', 'GRAU EN BELLES ARTS'] or
                text.isdigit()):
                continue
            
            # Check if it's a classroom
            if classroom_pattern.match(text):
                continue
            
            # At this point, it might be a subject
            # Clean up the text
            text = re.sub(r'\s+', ' ', text)
            
            # Skip if too short to be a subject name
            if len(text) < 10:
                continue
            
            # Try to identify professor and classroom in next shapes
            professor = None
            classrooms = []
            
            # Look at next few shapes in same row group
            current_idx = row_shapes.index(shape)
            for next_shape in row_shapes[current_idx + 1:current_idx + 3]:
                next_text = next_shape['text']
                
                # Check if it's a classroom
                classroom_matches = re.findall(r'[PGLC]\d+\.\d+', next_text)
                if classroom_matches:
                    classrooms.extend(classroom_matches)
                    # Remove classroom from text to get professor
                    prof_text = next_text
                    for classroom in classroom_matches:
                        prof_text = prof_text.replace(classroom, '')
                    prof_text = prof_text.strip()
                    if len(prof_text) > 3:
                        professor = prof_text
                elif len(next_text) > 5 and not time_pattern.match(next_text):
                    # Might be professor name
                    professor = next_text
            
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
            
            # Create entry
            entry = {
                'asignatura': text,
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
    """Main function to extract GBA schedules from drawing objects"""
    
    excel_dir = '/Users/josepmarimon/Documents/github/bau-assist/csv/excelhorari'
    output_file = '/Users/josepmarimon/Documents/github/bau-assist/csv/extracted_gba_schedules.json'
    
    gba_files = ['Horaris_GBA_1r_2526.xlsx', 'Horaris_GBA_2n_2526.xlsx', 
                 'Horaris_GBA_3r_2526.xlsx', 'Horaris_GBA_4t_2526.xlsx']
    
    all_schedules = []
    
    print("Extracting GBA schedules from drawing objects...")
    print("=" * 80)
    
    for filename in gba_files:
        file_path = os.path.join(excel_dir, filename)
        print(f"\nProcessing: {filename}")
        
        try:
            # Extract text from drawings
            shapes = extract_text_from_drawings(file_path)
            print(f"  Found {len(shapes)} text shapes")
            
            # Parse schedule data
            schedule_data = parse_schedule_from_shapes(shapes, filename)
            print(f"  Extracted {len(schedule_data)} schedule entries")
            
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
    
    # Save results
    output_data = {
        'extraction_date': datetime.now().isoformat(),
        'extraction_method': 'drawing_objects',
        'total_entries': len(all_schedules),
        'data': all_schedules
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n{'='*80}")
    print(f"Total GBA schedule entries extracted: {len(all_schedules)}")
    print(f"Data saved to: {output_file}")
    
    # Summary by course
    by_course = {}
    for entry in all_schedules:
        course = entry['curso'] or 'Unknown'
        if course not in by_course:
            by_course[course] = 0
        by_course[course] += 1
    
    print("\nEntries by course:")
    for course, count in sorted(by_course.items()):
        print(f"  {course}: {count}")

if __name__ == "__main__":
    main()