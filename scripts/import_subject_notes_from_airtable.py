"""
Importa les notes/comentaris de les taules "Graus Disseny Perfil tècnic" i
"Graus BBAA Perfil tècnic" d'Airtable cap a la taula `subject_notes` de la BD local.

Mapeja noms d'assignatures d'Airtable amb subjects.name (o subjects.code) de la BD.
Per a cada (subject, academic_year, category), fa UPSERT del content.
"""
import json
import os
import re
import subprocess
import sys
import uuid

KEY = os.environ.get('AIRTABLE_API_KEY')
BASE = os.environ.get('AIRTABLE_BASE_ID', 'apphuizLcPkF8mOfd')
DB = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@127.0.0.1:54322/postgres')

if not KEY:
    print('ERROR: cal exportar AIRTABLE_API_KEY (el pots trobar al .mcp.json local)', file=sys.stderr)
    sys.exit(1)

YEAR_ID_TO_NAME_4 = {
    'reclbzi9kmsXmhAIU': '2024-2025',
    'recMZTZ62zV0cFdBM': '2025-2026',
    'recySH5D7a3OKZ6Pp': '2026-2027',
}

TABLES = {
    'Disseny': {
        'id': 'tblF17h9OsJknHKvC',
        'assig_table': 'tblJajoJ32epJXM8D',
        'fields': {
            'Tecnologia Audiovisual del servei de prèstec': 'tecnologia_av_prestec',
            'Altres': 'altres',
            'Activitats planificades al taller': 'activitats_taller',
            'Materials Professor': 'materials_professor',
            'Materials estudiants': 'materials_estudiants',
            'Altres Consideracions': 'altres_consideracions',
            'Anotacions': 'anotacions',
        },
    },
    'BBAA': {
        'id': 'tblZnBhzqIPZA9U5m',
        'assig_table': 'tblgTlgWAbpYGN7b3',
        'fields': {
            'Tecnologia Audiovisual del servei de prèstec': 'tecnologia_av_prestec',
            'Altres': 'altres',
            'Altre software no llistat': 'altre_software',
            'Matèries necessàries': 'materies_necessaries',
            'Materies estudiant': 'materials_estudiants',
            'Altres consideracions': 'altres_consideracions',
        },
    },
}


def fetch_all(table_id):
    out = []
    offset = None
    while True:
        url = f'https://api.airtable.com/v0/{BASE}/{table_id}?pageSize=100'
        if offset:
            url += f'&offset={offset}'
        r = subprocess.run(
            ['curl', '-s', '-H', f'Authorization: Bearer {KEY}', url],
            capture_output=True, text=True,
        )
        d = json.loads(r.stdout)
        out.extend(d.get('records', []))
        offset = d.get('offset')
        if not offset:
            break
    return out


def sql_escape(s):
    return s.replace("'", "''")


def db_run(sql):
    r = subprocess.run(['psql', DB, '-c', sql, '-A', '-F', '\t', '--pset=footer=off'],
                       capture_output=True, text=True)
    if r.returncode != 0:
        print(f'SQL ERROR: {r.stderr}', file=sys.stderr)
        sys.exit(1)
    lines = [l for l in r.stdout.strip().split('\n') if l]
    if not lines:
        return []
    header = lines[0].split('\t')
    return [dict(zip(header, ln.split('\t'))) for ln in lines[1:]]


# 1. Construïm mapping nom→subject_id des de la BD
print('Carregant subjects de la BD...')
db_subjects = db_run("SELECT id, code, name FROM public.subjects")
name_to_id = {}
code_to_id = {}
for s in db_subjects:
    name_to_id[s['name'].lower()] = s['id']
    code_to_id[s['code'].lower()] = s['id']
print(f'  {len(db_subjects)} assignatures a la BD')


# 2. Per cada taula Airtable, carreguem assignatures (mapping rec→nom)
def load_assig_map(table_id):
    m = {}
    for r in fetch_all(table_id):
        n = r.get('fields', {}).get('Name') or ''
        m[r['id']] = n.strip()
    return m


# 3. Importem
total_inserted = 0
total_skipped = 0
unmatched_names = set()

for grau_label, info in TABLES.items():
    print(f"\n=== {grau_label} ===")
    assig_map = load_assig_map(info['assig_table'])
    records = fetch_all(info['id'])
    print(f"  {len(records)} files de Perfil tècnic a Airtable")

    for r in records:
        f = r.get('fields', {})

        # Resolver subject
        a_ids = f.get('Assignatures', [])
        if not a_ids:
            continue
        airtable_name = assig_map.get(a_ids[0], '').strip()
        if not airtable_name:
            continue

        # Match per prefix amb el nom de la BD
        subject_id = name_to_id.get(airtable_name.lower())
        if not subject_id:
            for db_name, sid in name_to_id.items():
                if (db_name == airtable_name.lower() or
                        airtable_name.lower().startswith(db_name + ' ') or
                        db_name.startswith(airtable_name.lower() + ' ')):
                    subject_id = sid
                    break
        if not subject_id:
            unmatched_names.add(airtable_name)
            continue

        # Resoldre any acadèmic
        y_ids = f.get('Anys-Curs', [])
        if not y_ids:
            continue
        year = YEAR_ID_TO_NAME_4.get(y_ids[0])
        if not year:
            continue

        # Per cada camp multilineText, fer UPSERT
        for at_field, category in info['fields'].items():
            content = (f.get(at_field) or '').strip()
            if not content:
                continue
            sql = f"""
                INSERT INTO public.subject_notes (subject_id, academic_year, category, content)
                VALUES ('{subject_id}', '{year}', '{category}', '{sql_escape(content)}')
                ON CONFLICT (subject_id, academic_year, category)
                DO UPDATE SET content = EXCLUDED.content, updated_at = now();
            """
            r2 = subprocess.run(['psql', DB, '-c', sql], capture_output=True, text=True)
            if r2.returncode != 0:
                total_skipped += 1
                print(f'  ⚠ {airtable_name} / {category}: {r2.stderr.strip()[:80]}')
            else:
                total_inserted += 1

print(f'\n\nInserts/Updates: {total_inserted}')
print(f'Errors: {total_skipped}')
print(f'Noms Airtable sense match a la BD ({len(unmatched_names)}):')
for n in sorted(unmatched_names):
    print(f'  · {n}')
