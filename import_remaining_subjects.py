#!/usr/bin/env python3

import os
import time

# Llegir tots els fitxers exec_batch
all_inserts = []
for i in range(5):
    filename = f'exec_batch_{i}.sql'
    if os.path.exists(filename):
        with open(filename, 'r') as f:
            content = f.read()
            # Separar per INSERT statements
            inserts = content.split(';')
            for insert in inserts:
                if 'INSERT INTO' in insert:
                    all_inserts.append(insert.strip() + ';')

print(f"Total d'inserts a processar: {len(all_inserts)}")

# Crear un sol fitxer amb tots els inserts
with open('final_import.sql', 'w') as f:
    f.write('\n'.join(all_inserts))

print("Fitxer final_import.sql creat amb tots els inserts restants")
print(f"Mida del fitxer: {os.path.getsize('final_import.sql')} bytes")