#!/usr/bin/env python3

import pandas as pd
import uuid

# Assignatures ja existents
existing_codes = {
    'GDB001', 'GDB002', 'GDB011', 'GDB012', 'GDB022', 'GDB032', 'GDB042', 
    'GDB052', 'GDB062', 'GDB072', 'GDF001', 'GDF002', 'GDF011', 'GDF012', 
    'GDF021', 'GDF031', 'GDF041', 'GDF051', 'GDF061', 'GDF071', 'GDVA03', 
    'GDVA13', 'GDVA23', 'GDVA33', 'GDVA43'
}

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

for _, row in df.iterrows():
    # Comprovar si ja existeix
    if row['ID Assignatura'] in existing_codes:
        continue
        
    # Generar UUID per cada assignatura
    subject_id = str(uuid.uuid4())
    
    # Obtenir el curs numèric
    year = curs_mapping.get(row['Curs'], None)
    
    # Processar valors que podrien ser NaN
    id_itinerari = row['ID Itinerari'] if pd.notna(row['ID Itinerari']) else None
    area_coord = row['Area Coord'] if pd.notna(row['Area Coord']) else None
    
    # Mapejar degree
    degree = degree_mapping.get(row['Pla'], row['Pla'])
    
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
with open('missing_subjects.sql', 'w') as f:
    f.write('\n'.join(sql_statements))

print(f"Total assignatures que falten per importar: {len(sql_statements)}")
print("Fitxer missing_subjects.sql creat amb èxit")