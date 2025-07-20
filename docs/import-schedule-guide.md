# Guia d'Importació d'Horaris i Assignació d'Aules

## Visió General

El sistema d'importació d'horaris permet carregar de forma massiva les assignacions de classes, professors i aules utilitzant un format JSON estructurat. Aquest sistema utilitza el model `schedule_slots` que és més flexible que l'antic model `assignments`.

## Estructura del Sistema

### Model de Dades

```
GRUPS D'ESTUDIANTS (student_groups)
    ↓
HORARIS (schedule_slots)
    ├→ ASSIGNATURES (subjects)
    ├→ PROFESSORS (schedule_slot_teachers) - múltiples
    └→ AULES (schedule_slot_classrooms) - múltiples
```

### Avantatges del Model schedule_slots

1. **Flexibilitat**: Permet múltiples professors i aules per classe
2. **Simplicitat**: Separa clarament les responsabilitats
3. **Escalabilitat**: Fàcil d'afegir nous tipus de relacions

## Format JSON d'Importació

### Estructura Bàsica

```json
{
  "academic_year": "2025-2026",
  "schedules": [
    {
      "group": "Nom del grup d'estudiants",
      "semester": 1,
      "classes": [
        {
          "subject": "Nom de l'assignatura",
          "subject_code": "CODI123",
          "group_type": "teoria",
          "teachers": ["Professor 1", "Professor 2"],
          "classrooms": ["P.05", "G1.2"],
          "day": 1,
          "start_time": "09:00",
          "end_time": "11:00",
          "notes": "Notes opcionals"
        }
      ]
    }
  ]
}
```

### Camps Obligatoris

- **academic_year**: Any acadèmic (ex: "2025-2026")
- **group**: Nom exacte del grup d'estudiants
- **semester**: 1 o 2
- **subject**: Nom de l'assignatura tal com està a la BD
- **group_type**: Un de: `teoria`, `practica`, `laboratori`, `seminari`
- **teachers**: Array de noms complets dels professors
- **classrooms**: Array de codis d'aules
- **day**: 1-5 (Dilluns a Divendres)
- **start_time**: Hora d'inici en format HH:MM
- **end_time**: Hora de fi en format HH:MM

### Camps Opcionals

- **subject_code**: Codi de l'assignatura per millorar el matching
- **notes**: Notes o comentaris sobre la classe

## Validacions Automàtiques

El sistema realitza les següents validacions abans d'importar:

### 1. Conflictes de Grup
- Un grup d'estudiants no pot tenir dues classes simultànies

### 2. Conflictes de Professor
- Un professor no pot estar en dos llocs alhora

### 3. Conflictes d'Aula
- Una aula no pot tenir dues classes simultànies

### 4. Validacions de Format
- Els horaris han d'estar entre 08:00 i 21:00
- Els dies han de ser 1-5
- Els tipus de grup han de ser vàlids

## Exemples Pràctics

### Exemple 1: Classe Teòrica Simple

```json
{
  "subject": "Fonaments del Disseny",
  "group_type": "teoria",
  "teachers": ["Joan Pérez"],
  "classrooms": ["P.05"],
  "day": 1,
  "start_time": "09:00",
  "end_time": "11:00"
}
```

### Exemple 2: Pràctica amb Co-docència

```json
{
  "subject": "Taller de Dibuix",
  "group_type": "practica",
  "teachers": ["Maria Garcia", "Laura Gual"],
  "classrooms": ["L.0.1"],
  "day": 3,
  "start_time": "15:00",
  "end_time": "18:00",
  "notes": "Sessió conjunta amb dos professors"
}
```

### Exemple 3: Laboratori amb Múltiples Aules

```json
{
  "subject": "Muntatge Audiovisual",
  "group_type": "laboratori",
  "teachers": ["Carles Porta"],
  "classrooms": ["Plató", "Sala Edició"],
  "day": 5,
  "start_time": "15:00",
  "end_time": "19:00",
  "notes": "Grup dividit entre plató i sala d'edició"
}
```

## Codis de Grups

### Estructura dels Codis

- **Curs**: `1r`, `2n`, `3r`, `4t`
- **Torn**: `Matí`, `Tarda`
- **Codi**: `M1`, `M2` (matí), `T1`, `T2` (tarda)
- **Itinerari**: `GM`, `AM`, `MM`, `IM` (Gràfic, Audiovisual, Moda, Interiors)

### Exemples de Grups

- `1r Matí M1` - Primer curs, torn matí, grup 1
- `2n Matí Gràfic GM1` - Segon curs, matí, itinerari gràfic
- `3r Tarda Audiovisual AT1` - Tercer curs, tarda, itinerari audiovisual

## Executar la Importació

### 1. Preparar el Fitxer JSON

Crea un fitxer JSON seguint el format especificat.

### 2. Executar l'Script

```bash
npm run import-schedule data/el-meu-horari.json
```

### 3. Revisar els Resultats

L'script mostrarà:
- Classes importades correctament ✅
- Conflictes detectats ⏭️
- Errors d'importació ❌
- Resum final amb taxa d'èxit

## Resolució de Problemes

### Assignatura No Trobada

**Problema**: "Assignatura no trobada: Nom Assignatura"

**Solució**: 
- Verifica que el nom exacte existeix a la BD
- Utilitza el camp `subject_code` si el tens
- Comprova majúscules/minúscules i accents

### Aula No Trobada

**Problema**: "Aula no trobada: X.XX"

**Solució**:
- L'script prova variants (P.05, P05, etc.)
- Verifica que l'aula existeix a la taula `classrooms`
- Alguns codis especials poden necessitar creació manual

### Conflictes d'Horari

**Problema**: "Grup ja té classe" o "Aula ocupada"

**Solució**:
- Revisa els horaris per evitar solapaments
- Considera dividir la classe en diferents franges
- Verifica que no hi ha duplicats al JSON

## Millors Pràctiques

1. **Validar Abans d'Importar**: Revisa el JSON amb un validador
2. **Importar per Fases**: Comença amb un grup petit per provar
3. **Backup**: Fes còpia de seguretat abans d'importacions massives
4. **Logs**: Guarda els logs d'importació per referència futura
5. **Nomenclatura Consistent**: Utilitza sempre els mateixos noms per professors i aules

## Limitacions Actuals

1. No valida la capacitat de les aules vs. mida del grup
2. No comprova requisits d'equipament especial
3. No optimitza l'assignació d'aules
4. No gestiona preferències de professors

## Futures Millores

1. Validació de capacitat d'aules
2. Comprovació de requisits d'equipament
3. Optimització automàtica d'espais
4. Gestió de preferències i restriccions
5. Importació des d'Excel/CSV