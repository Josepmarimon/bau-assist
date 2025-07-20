#!/usr/bin/env python3

import re

# Llegir el fitxer amb errors
with open('final_import.sql', 'r') as f:
    content = f.read()

# Arreglar errors comuns
# 1. Eliminar línies incompletes que acaben amb ";" sol
content = re.sub(r'\n\s*\d+\s*,\s*;\s*\n', '', content)

# 2. Arreglar els statements incomplets
lines = content.split('\n')
fixed_lines = []
skip_next = False

for i, line in enumerate(lines):
    if skip_next:
        skip_next = False
        continue
    
    # Si la línia conté només un VALUES incomplet, saltar-la
    if re.match(r'^\s*\'\w+\',\s*;\s*$', line):
        skip_next = True
        continue
    
    # Si trobem un INSERT sense tancar correctament, completar-lo
    if 'INSERT INTO subjects' in line and i+19 < len(lines):
        # Comprovar si els següents 19 línies formen un INSERT complet
        statement_lines = [line]
        for j in range(1, 20):
            if i+j < len(lines):
                statement_lines.append(lines[i+j])
                if lines[i+j].strip().endswith(');'):
                    # INSERT complet trobat
                    fixed_lines.extend(statement_lines)
                    skip_next = j
                    break
    elif not skip_next:
        fixed_lines.append(line)

# Eliminar línies problemàtiques específiques
fixed_content = '\n'.join(fixed_lines)

# Eliminar declaracions incompletes
fixed_content = re.sub(r"VALUES\s*\(\s*'[a-f0-9\-]+',\s*;\s*INSERT", "INSERT", fixed_content)
fixed_content = re.sub(r"'Disseny',\s*;\s*INSERT", "'Disseny',\n        'G',\n        'EINES',\n        True\n    );\nINSERT", fixed_content)
fixed_content = re.sub(r",\s*;\s*INSERT", ",\n        NULL,\n        NULL,\n        True\n    );\nINSERT", fixed_content)
fixed_content = re.sub(r"4,\s*;\s*INSERT", "4,\n        'obligatoria',\n        'Belles Arts',\n        NULL,\n        NULL,\n        True\n    );\nINSERT", fixed_content)

# Guardar el fitxer corregit
with open('fixed_import.sql', 'w') as f:
    f.write(fixed_content)

# Comptar inserts
insert_count = fixed_content.count('INSERT INTO')
print(f"Fitxer corregit amb {insert_count} inserts")