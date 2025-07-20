# Real Data Import Summary

This document summarizes all the real data that has been imported from the CSV files to replace mock data in the BAU Assist application.

## Data Sources

All data has been imported from CSV files located in the `/csv` directory:

1. **Aules-Grid view.csv** - Classroom data
2. **Software-Grid view.csv** - Software inventory
3. **Masters-Grid view.csv** - Masters programs
4. **AssignacioDocent_2526_Preparacio(DISSENY).csv** - Teaching assignments for Design
5. **AssignacioDocent_2526_Preparacio(BELLES ARTS).csv** - Teaching assignments for Fine Arts

## Imported Data

### 1. Classrooms (61 total)
- **Buildings**: Edifici Granada, Edifici Llacuna, Edifici Pujades
- **Types**: Polivalent, Taller, Teòrica, Projectes
- **Special rooms**: 
  - Cabina d'Audio
  - G.0.3 Taller d'Escultura, ceramica, metall
  - L.0.3 Plató
- Each classroom includes capacity, equipment, and availability status

### 2. Software (34 items)
- **Categories**: Design, 3D Modeling, Audio, Video, CAD, Programming, Web Development
- **License types**: Proprietary (Adobe Suite, Autocad, etc.) and Open Source (Blender, GIMP, etc.)
- **Operating systems**: Windows, macOS, Linux compatibility tracked

### 3. Student Groups (18 groups)
- **Years**: 1st year (GR1) to 4th year (GR4)
- **Shifts**: Morning (Matí) and Afternoon (Tarda)
- **Group codes**: M1-M5, T1-T2, Am, At, Gm1-Gm2, Gt1-Gt2, Em, Et, Im, It
- Each group has a capacity of 30 students

### 4. Teachers (133 professors)
- Imported from teaching assignment files
- Each teacher has:
  - Unique teacher ID (e.g., PROF634)
  - Full name
  - Email address
  - Department (default: Design)
  - Contract type and maximum hours

### 5. Teaching Assignments (404 assignments)
- Links teachers to subjects and student groups
- Includes ECTS distribution
- Academic year 2024-2025 and 2025-2026 data
- Coordinator assignments tracked

### 6. Masters Programs (17 programs)
- **University Masters** (60 ECTS, 12 months):
  - Master universitari en Design Research
  - Màster en Disseny d'Interiors
  - Màster en Digital Experience Design
  - And others...
- **Postgraduate Programs** (30 ECTS, 6 months):
  - Postgrau en il·lustració Digital i Nous Mitjans
  - Postgrau en Il·lustració
  - Postgrau en Motion 3D
  - And others...
- Each program includes coordinator name and email

## Database Migrations

The following migrations have been created to support the real data:

1. **001_initial_schema.sql** - Base tables for subjects, classrooms, teachers, etc.
2. **002_teaching_assignments.sql** - Teaching assignments table with proper relationships
3. **003_software_and_masters.sql** - Software inventory and masters programs tables

## Import Scripts

All import scripts are located in `/scripts`:
- `import-real-classrooms.ts`
- `import-real-software.ts`
- `import-real-student-groups.ts`
- `import-real-masters.ts`
- `import-teaching-assignments.ts`

## Notes

- All mock data has been removed from the application
- The course assignments page now displays real teaching assignments
- Software and classroom data reflects actual BAU facilities
- Student groups match the actual course structure at BAU
- Teacher data includes all professors from both Design and Fine Arts departments

## Character Encoding

Some names in the CSV files contain special characters (à, é, í, ò, ú, ç, ñ) which have been preserved in the import process.