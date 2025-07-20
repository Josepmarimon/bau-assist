# Guia d'Importació d'Horaris amb IDs Únics (Matching 100%)

## Per què utilitzar IDs?

Utilitzar IDs únics (UUIDs) garanteix:
- ✅ **Matching 100% precís** - Cap error d'interpretació
- ✅ **Eliminació d'ambigüitats** - No hi ha problemes amb noms similars
- ✅ **Validació completa** - Es verifica que totes les entitats existeixen
- ✅ **Rendiment òptim** - No cal fer cerques complexes

## Procés d'Importació

### Pas 1: Exportar els IDs de la Base de Dades

```bash
npm run export-ids
```

Això generarà dos fitxers a la carpeta `data/`:
- `database-ids-YYYY-MM-DD.json` - Conté tots els IDs amb informació descriptiva
- `database-lookup-YYYY-MM-DD.json` - Taules de cerca per trobar IDs per nom

### Pas 2: Crear el Fitxer d'Importació

Utilitza la plantilla `schedule-import-template-with-ids.json` com a base:

```json
{
  "version": "2.0",
  "schedules": [
    {
      "student_group_id": "550e8400-e29b-41d4-a716-446655440001",
      "semester_id": "550e8400-e29b-41d4-a716-446655440002",
      "classes": [
        {
          "subject_id": "550e8400-e29b-41d4-a716-446655440003",
          "group_type": "THEORY",
          "teacher_ids": ["550e8400-e29b-41d4-a716-446655440004"],
          "classroom_ids": ["550e8400-e29b-41d4-a716-446655440005"],
          "day_of_week": 1,
          "start_time": "09:00:00",
          "end_time": "11:00:00"
        }
      ]
    }
  ]
}
```

### Pas 3: Com Trobar els IDs Correctes

#### Opció A: Utilitzar el fitxer database-ids.json

```json
{
  "student_groups": {
    "123e4567-e89b-12d3-a456-426614174000": {
      "name": "1r Matí M1",
      "year": 1,
      "shift": "MORNING"
    }
  }
}
```

#### Opció B: Utilitzar el fitxer database-lookup.json

```json
{
  "lookup_helpers": {
    "student_groups_by_name": {
      "1r Matí M1": "123e4567-e89b-12d3-a456-426614174000"
    }
  }
}
```

### Pas 4: Executar la Importació

```bash
npm run import-schedule-ids data/el-meu-horari.json
```

## Camps Obligatoris

### Nivell Grup d'Estudiants

| Camp | Tipus | Descripció |
|------|-------|------------|
| `student_group_id` | UUID | ID del grup d'estudiants |
| `semester_id` | UUID | ID del semestre |
| `classes` | Array | Llista de classes a importar |

### Nivell Classe

| Camp | Tipus | Valors | Descripció |
|------|-------|--------|------------|
| `subject_id` | UUID | - | ID de l'assignatura |
| `group_type` | String | THEORY, PRACTICE, LABORATORY, SEMINAR | Tipus de grup |
| `teacher_ids` | Array[UUID] | - | IDs dels professors (pot ser buit) |
| `classroom_ids` | Array[UUID] | - | IDs de les aules (obligatori) |
| `day_of_week` | Number | 1-5 | 1=Dilluns, 5=Divendres |
| `start_time` | String | HH:MM:SS | Hora d'inici (24h) |
| `end_time` | String | HH:MM:SS | Hora de fi (24h) |
| `notes` | String | - | Notes opcionals |

## Validacions Automàtiques

### 1. Validació de Format
- ✓ Tots els IDs són UUIDs vàlids
- ✓ Format de temps correcte (HH:MM:SS)
- ✓ Dia entre 1 i 5
- ✓ Tipus de grup vàlid

### 2. Validació d'Existència
- ✓ Tots els IDs existeixen a la BD
- ✓ El semestre està actiu
- ✓ Les aules estan disponibles

### 3. Validació de Conflictes
- ✓ El grup no té altra classe simultània
- ✓ Els professors no estan ocupats
- ✓ Les aules no estan ocupades

## Exemple Complet

### 1. Exportar IDs
```bash
npm run export-ids
```

### 2. Consultar IDs necessaris

Obre `data/database-ids-2025-07-18.json`:
```json
{
  "student_groups": {
    "abc123...": { "name": "1r Matí M1", "year": 1 },
    "def456...": { "name": "2n Tarda T1", "year": 2 }
  },
  "subjects": {
    "ghi789...": { "code": "GDIS101", "name": "Fonaments del Disseny" }
  },
  "teachers": {
    "jkl012...": { "full_name": "Joan Pérez", "email": "joan@bau.cat" }
  },
  "classrooms": {
    "mno345...": { "code": "P.05", "capacity": 40 }
  }
}
```

### 3. Crear fitxer d'importació

`data/horari-1r-mati.json`:
```json
{
  "version": "2.0",
  "schedules": [
    {
      "student_group_id": "abc123...",
      "semester_id": "xyz999...",
      "classes": [
        {
          "subject_id": "ghi789...",
          "group_type": "THEORY",
          "teacher_ids": ["jkl012..."],
          "classroom_ids": ["mno345..."],
          "day_of_week": 1,
          "start_time": "09:00:00",
          "end_time": "11:00:00",
          "notes": "Classe magistral de Fonaments"
        }
      ]
    }
  ]
}
```

### 4. Importar
```bash
npm run import-schedule-ids data/horari-1r-mati.json
```

## Sortida Esperada

```
🚀 IMPORTACIÓ D'HORARIS AMB IDs ÚNICS
=====================================

⚡ Mode: Matching 100% garantit amb IDs
📄 Fitxer: data/horari-1r-mati.json

📊 Total grups a processar: 1

👥 Grup: 1r Matí M1 (abc123...)
📅 Classes a importar: 1

   📚 Fonaments del Disseny (THEORY)
      📅 Dilluns, 09:00:00-11:00:00
      ✅ Importat correctament
         Professors: Joan Pérez
         Aules: P.05
         Notes: Classe magistral de Fonaments

📊 RESUM DE LA IMPORTACIÓ
========================
✅ Importats correctament: 1
❌ Errors de validació: 0
⚠️  Conflictes detectats: 0
📋 Total classes processades: 1
📈 Taxa d'èxit: 100.0%

🎉 IMPORTACIÓ PERFECTA! Matching 100% aconseguit!
```

## Errors Comuns i Solucions

### Error: "subject_id no és un UUID vàlid"
**Causa**: L'ID no té el format correcte
**Solució**: Assegura't de copiar l'ID complet del fitxer d'exportació

### Error: "teacher_id no existeix a la BD"
**Causa**: L'ID no correspon a cap professor
**Solució**: Verifica l'ID al fitxer database-ids.json

### Error: "Conflictes detectats: Aula P.05 ja ocupada"
**Causa**: L'aula ja té una classe assignada en aquest horari
**Solució**: Tria una altra aula o canvia l'horari

## Avantatges del Sistema amb IDs

1. **Precisió Absoluta**: No hi ha risc d'errors per noms similars
2. **Validació Completa**: Es verifica tot abans d'importar
3. **Traçabilitat**: Sempre saps exactament què s'està important
4. **Rendiment**: Les operacions amb IDs són molt més ràpides
5. **Integritat**: Impossible referenciar entitats inexistents

## Scripts Relacionats

- `npm run export-ids` - Exporta tots els IDs de la BD
- `npm run import-schedule-ids` - Importa horaris amb IDs
- `npm run import-schedule` - Versió antiga amb noms (menys precisa)

## Recomanacions

1. **Sempre exporta els IDs abans d'importar** per tenir la informació més actual
2. **Guarda els fitxers d'importació** per referència futura
3. **Valida el JSON** abans d'importar (jsonlint.com)
4. **Fes proves amb grups petits** abans d'importacions massives
5. **Documenta els IDs utilitzats** per facilitar futures actualitzacions