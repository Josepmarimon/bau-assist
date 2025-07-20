import pandas as pd

# Llegir el fitxer Excel
file_path = '/Users/josepmarimon/Documents/Assigantures uniques.xlsx'
df = pd.read_excel(file_path)

print('=== ANÀLISI DE DISCREPÀNCIA: 131 FILES VS 101 ASSIGNATURES ÚNIQUES ===\n')

# Informació bàsica
print('1. INFORMACIÓ BÀSICA')
print(f'   - Total de files: {len(df)}')
print(f'   - Nombre de columnes: {len(df.columns)}')
print(f'   - IDs únics d\'assignatura: {df["ID Assignatura"].nunique()}')

# Distribució per Pla
print('\n2. DISTRIBUCIÓ PER PLA')
plan_counts = df['Pla'].value_counts()
for pla, count in plan_counts.items():
    print(f'   - {pla}: {count} files')

# Analitzar assignatures per pla
print('\n3. ASSIGNATURES PER PLA')
gdis_ids = set(df[df['Pla'] == 'GDIS']['ID Assignatura'])
gba_ids = set(df[df['Pla'] == 'GBA']['ID Assignatura'])

print(f'   - Assignatures úniques GDIS: {len(gdis_ids)}')
print(f'   - Assignatures úniques GBA: {len(gba_ids)}')

# Trobar assignatures compartides
compartides = gdis_ids.intersection(gba_ids)
print(f'   - Assignatures compartides: {len(compartides)}')

# Mostrar exemples d'assignatures compartides
if compartides:
    print('\n4. EXEMPLES D\'ASSIGNATURES COMPARTIDES')
    for i, id_assignatura in enumerate(sorted(list(compartides))[:10], 1):
        rows = df[df['ID Assignatura'] == id_assignatura]
        print(f'\n   {i}. {id_assignatura}:')
        for _, row in rows.iterrows():
            print(f'      - Pla: {row["Pla"]}, Curs: {row["Curs"]}, Nom: {row["Nom assignatura"]}')

# Càlcul final
print('\n5. EXPLICACIÓ DE LA DISCREPÀNCIA')
print(f'   - Files totals: {len(df)}')
print(f'   - Assignatures GDIS: {len(gdis_ids)}')
print(f'   - Assignatures GBA: {len(gba_ids)}')
print(f'   - Assignatures compartides: {len(compartides)}')
print(f'   - Total únic real: {len(gdis_ids)} + {len(gba_ids)} - {len(compartides)} = {len(gdis_ids) + len(gba_ids) - len(compartides)}')

print('\n6. CONCLUSIÓ')
print(f'   Hi ha {len(df)} files perquè algunes assignatures apareixen en ambdós plans (GDIS i GBA).')
print(f'   Les {len(compartides)} assignatures compartides es compten dues vegades (una per cada pla).')
print(f'   Per això, el nombre real d\'assignatures úniques és {len(gdis_ids.union(gba_ids))}.')

# Verificació addicional
unique_total = len(gdis_ids.union(gba_ids))
if unique_total == 101:
    print(f'\n   ✓ VERIFICAT: {unique_total} assignatures úniques = 101 esperades')
else:
    print(f'\n   ⚠ ATENCIÓ: {unique_total} assignatures úniques ≠ 101 esperades')