import pandas as pd
import json

# Llegir l'Excel
file_path = '/Users/josepmarimon/Documents/github/bau-assist/csv/usuaris-guies-docents.xlsx'
df = pd.read_excel(file_path)

# Eliminar columna buida i files amb valors nuls
df = df.drop('Unnamed: 3', axis=1)
df_clean = df.dropna()

print(f'Total registres nets: {len(df_clean)}\n')

# Extreure dades
users_data = []

for _, row in df_clean.iterrows():
    users_data.append({
        'username': row['usuario'],
        'email': row['email'],
        'password': row['password']
    })

# Guardar a JSON
output_file = '/Users/josepmarimon/Documents/github/bau-assist/csv/extracted_guide_users.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(users_data, f, ensure_ascii=False, indent=2)

print(f'Dades extretes i guardades a: {output_file}')
print(f'Total usuaris: {len(users_data)}')

# Mostrar estadístiques
print('\nESTADÍSTIQUES:')

# Usuaris d'assignatures vs altres
usuaris_assignatures = [u for u in users_data if '_' in u['username']]
usuaris_altres = [u for u in users_data if '_' not in u['username']]

print(f'- Usuaris d\'assignatures (amb _): {len(usuaris_assignatures)}')
print(f'- Altres usuaris: {len(usuaris_altres)}')

# Mostrar exemples
print('\nEXEMPLES D\'USUARIS D\'ASSIGNATURES:')
for user in usuaris_assignatures[:10]:
    print(f'- {user["username"]}')