import pandas as pd

# Llegir el fitxer Excel
file_path = '/Users/josepmarimon/Documents/Assigantures uniques.xlsx'
df = pd.read_excel(file_path)

print('=== INVESTIGACIÓ ADDICIONAL ===\n')

# Comprovar si hi ha algun patró en els IDs
print('1. PATRONS EN ELS IDS D\'ASSIGNATURA')
print('   Primeres 10 assignatures GDIS:')
gdis_df = df[df['Pla'] == 'GDIS'].sort_values('ID Assignatura')
print(gdis_df[['ID Assignatura', 'Nom assignatura']].head(10).to_string(index=False))

print('\n   Primeres 10 assignatures GBA:')
gba_df = df[df['Pla'] == 'GBA'].sort_values('ID Assignatura')
print(gba_df[['ID Assignatura', 'Nom assignatura']].head(10).to_string(index=False))

# Analitzar prefixos dels IDs
print('\n2. ANÀLISI DE PREFIXOS D\'ID')
df['prefix'] = df['ID Assignatura'].str[:3]
print('\n   Prefixos per pla:')
for pla in ['GDIS', 'GBA']:
    print(f'\n   {pla}:')
    prefix_counts = df[df['Pla'] == pla]['prefix'].value_counts()
    print(prefix_counts.to_string())

# Verificar si hi ha alguna altra manera de comptar 101
print('\n3. ALTRES POSSIBLES EXPLICACIONS')
print(f'   - Total assignatures sense comptar cap duplicat: {df["ID Assignatura"].nunique()}')
print(f'   - Si només comptéssim GDIS: {len(df[df["Pla"] == "GDIS"])}')
print(f'   - Si només comptéssim GBA: {len(df[df["Pla"] == "GBA"])}')

# Comprovar assignatures per curs
print('\n4. DISTRIBUCIÓ PER CURS')
curs_counts = df.groupby(['Pla', 'Curs']).size().reset_index(name='count')
print(curs_counts.to_string(index=False))

# Buscar possibles similituds en noms
print('\n5. BUSCAR ASSIGNATURES AMB NOMS SIMILARS')
# Crear llista de noms únics
all_names = df['Nom assignatura'].str.lower().str.strip()
df['nom_normalitzat'] = all_names

# Buscar noms que apareixen en ambdós plans
gdis_names = set(df[df['Pla'] == 'GDIS']['nom_normalitzat'])
gba_names = set(df[df['Pla'] == 'GBA']['nom_normalitzat'])
noms_similars = gdis_names.intersection(gba_names)

if noms_similars:
    print(f'\n   Trobats {len(noms_similars)} noms d\'assignatura similars entre plans:')
    for nom in sorted(list(noms_similars))[:10]:
        print(f'\n   "{nom}":')
        rows = df[df['nom_normalitzat'] == nom][['Pla', 'ID Assignatura', 'Nom assignatura']]
        print(rows.to_string(index=False))

# Comptar assignatures úniques per nom
print(f'\n6. RECOMPTE PER NOM D\'ASSIGNATURA')
print(f'   - Noms únics totals: {df["Nom assignatura"].nunique()}')
print(f'   - Noms únics normalitzats: {df["nom_normalitzat"].nunique()}')