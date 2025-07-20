#!/usr/bin/env python3

# Llegir el fitxer SQL amb les assignatures que falten
with open('missing_subjects.sql', 'r') as f:
    sql_content = f.read()

# Separar en statements individuals
statements = []
current_statement = []

for line in sql_content.split('\n'):
    current_statement.append(line)
    if line.strip().endswith(');'):
        statements.append('\n'.join(current_statement))
        current_statement = []

# Els primers 25 ja estan importats, agafar la resta
remaining_statements = statements[25:]

print(f"Total statements restants: {len(remaining_statements)}")

# Crear batches de 30 statements
batch_size = 30
batches = []

for i in range(0, len(remaining_statements), batch_size):
    batch = remaining_statements[i:i+batch_size]
    batches.append('\n'.join(batch))

print(f"Dividit en {len(batches)} lots")

# Guardar cada lot
for i, batch in enumerate(batches):
    filename = f'final_batch_{i}.sql'
    with open(filename, 'w') as f:
        f.write(batch)
    print(f"Lot {i}: {batch.count('INSERT INTO')} inserts guardats a {filename}")