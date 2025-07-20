#!/usr/bin/env python3
"""
Check Belles Arts subjects in database that are not in Excel
"""

import json

# Load database data
with open('/Users/josepmarimon/Documents/github/bau-assist/csv/extracted_database_data.json', 'r') as f:
    db_data = json.load(f)

# Load fixed Excel data
with open('/Users/josepmarimon/Documents/github/bau-assist/csv/extracted_excel_data_fixed.json', 'r') as f:
    excel_data = json.load(f)

# Get Excel subject names
excel_subjects = {entry['asignatura'] for entry in excel_data['data']}

# Find Belles Arts subjects in DB not in Excel
ba_subjects = []
for subject in db_data['subjects']:
    # Check if it's a Belles Arts subject (by code pattern)
    if subject['code'].startswith('BA'):
        if subject['name'] not in excel_subjects:
            ba_subjects.append(subject)

# Sort by year and name
ba_subjects.sort(key=lambda x: (x['year'], x['name']))

print('ASIGNATURAS DE BELLES ARTS EN BD QUE NO ESTÁN EN EXCEL:')
print('=' * 80)

current_year = None
for subject in ba_subjects:
    if subject['year'] != current_year:
        current_year = subject['year']
        print(f'\n{current_year}º CURSO:')
        print('-' * 40)
    
    print(f'  • {subject["name"]}')
    print(f'    Código: {subject["code"]}, Créditos: {subject["credits"]}, Tipo: {subject["type"]}')
    if subject.get('itinerari'):
        print(f'    Itinerari: {subject["itinerari"]}')

print(f'\n\nTotal asignaturas Belles Arts no encontradas en Excel: {len(ba_subjects)}')

# Also check how many BA subjects are in Excel
ba_in_excel = [entry for entry in excel_data['data'] if entry['grado_code'] == 'GBA']
print(f'\nAsignaturas de Belles Arts en Excel: {len(ba_in_excel)}')
for entry in ba_in_excel:
    print(f'  - {entry["asignatura"]} ({entry["curso"]})')

# Check why BA Excel files are empty
print('\n\nAnálisis de archivos Excel de Belles Arts:')
print('-' * 40)
excel_files = ['Horaris_GBA_1r_2526.xlsx', 'Horaris_GBA_2n_2526.xlsx', 
               'Horaris_GBA_3r_2526.xlsx', 'Horaris_GBA_4t_2526.xlsx']
for filename in excel_files:
    entries = [e for e in excel_data['data'] if e['archivo'] == filename]
    print(f'{filename}: {len(entries)} entradas')