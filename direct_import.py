#!/usr/bin/env python3

import pandas as pd
import uuid
import os

# Llegir el fitxer Excel
df = pd.read_excel('/Users/josepmarimon/Documents/Assigantures uniques.xlsx')

# Mapejar els valors de Curs a anys numèrics
curs_mapping = {
    'GR1': 1, 'GB1': 1,
    'GR2': 2, 'GB2': 2,
    'GR3': 3, 'GB3': 3,
    'GR4': 4, 'GB4': 4,
    'GB3-GB4': 3  # Assumeixo curs 3 per aquests casos
}

# Mapejar degree values
degree_mapping = {
    'GDIS': 'Disseny',
    'GBA': 'Belles Arts'
}

# Preparar les dades per SQL
sql_statements = []
existing_subjects = set()

for _, row in df.iterrows():
    # Generar UUID per cada assignatura
    subject_id = str(uuid.uuid4())
    
    # Obtenir el curs numèric
    year = curs_mapping.get(row['Curs'], None)
    
    # Processar valors que podrien ser NaN
    id_itinerari = row['ID Itinerari'] if pd.notna(row['ID Itinerari']) else None
    area_coord = row['Area Coord'] if pd.notna(row['Area Coord']) else None
    
    # Mapejar degree
    degree = degree_mapping.get(row['Pla'], row['Pla'])
    
    # Comprovar si ja hem processat aquesta assignatura
    subject_key = row['ID Assignatura']
    if subject_key not in existing_subjects:
        existing_subjects.add(subject_key)
        
        # Crear SQL
        sql = f"""INSERT INTO subjects (
    id, code, name, credits, year, type, degree, 
    "ID Itinerari", "Area Coord", active
) VALUES (
    '{subject_id}',
    '{row['ID Assignatura']}',
    '{row['Nom assignatura'].replace("'", "''")}',
    {int(row['Crèdits'])},
    {year},
    'obligatoria',
    '{degree}',
    {f"'{id_itinerari}'" if id_itinerari else 'NULL'},
    {f"'{area_coord}'" if area_coord else 'NULL'},
    true
);"""
        sql_statements.append(sql)

# Guardar totes les declaracions SQL
with open('clean_import.sql', 'w') as f:
    f.write('\n'.join(sql_statements))

print(f"Total assignatures úniques a importar: {len(sql_statements)}")
print("Fitxer clean_import.sql creat amb èxit")