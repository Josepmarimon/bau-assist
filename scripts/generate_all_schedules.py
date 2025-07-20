#!/usr/bin/env python3
"""
Script per generar automàticament el codi TypeScript amb tots els horaris
basant-se en l'anàlisi manual de les imatges
"""

import json

# Dades extretes manualment de les imatges
all_schedules_data = {
    "disseny_2n": {
        "M1": {
            "1r_semestre": [
                {"subject": "Expressió Gràfica I", "teachers": [], "classrooms": [], "day": 1, "start": "09:00", "end": "13:30"},
                {"subject": "Iniciació als Projectes de Disseny I", "teachers": [], "classrooms": [], "day": 2, "start": "09:00", "end": "13:30"},
                {"subject": "Taller Tridimensional i d'Investigació Artística", "teachers": ["Mercedes Pimiento"], "classrooms": ["GO.2"], "day": 3, "start": "09:00", "end": "13:30"},
                {"subject": "Llenguatges Audiovisuals I", "teachers": ["Nico Juárez", "Sala Carolines"], "classrooms": ["Sala Carolines"], "day": 4, "start": "09:00", "end": "13:30"},
                {"subject": "Història del Disseny", "teachers": ["Mª Isabel del Río"], "classrooms": ["P1.9"], "day": 5, "start": "09:00", "end": "13:30"}
            ],
            "2n_semestre": [
                {"subject": "Expressió Gràfica II", "teachers": [], "classrooms": [], "day": 1, "start": "09:00", "end": "13:30"},
                {"subject": "Iniciació als Projectes de Disseny II", "teachers": [], "classrooms": [], "day": 2, "start": "09:00", "end": "13:30"},
                {"subject": "Taller de Creativitat", "teachers": ["Anna Moreno"], "classrooms": ["G1.3"], "day": 3, "start": "09:00", "end": "13:30"},
                {"subject": "Llenguatges Audiovisuals II", "teachers": ["Laurà Subirats"], "classrooms": ["PO.5/O.7"], "day": 4, "start": "09:00", "end": "13:30"},
                {"subject": "Economia, Empresa i Disseny", "teachers": ["Blanca-Pia Fernández"], "classrooms": ["P1.9"], "day": 5, "start": "09:00", "end": "13:30"}
            ]
        },
        "M2": {
            "1r_semestre": [
                {"subject": "Història del Disseny", "teachers": ["Nataly del Pozzo"], "classrooms": ["P1.16"], "day": 1, "start": "09:00", "end": "13:30"},
                {"subject": "Expressió Gràfica I", "teachers": [], "classrooms": [], "day": 2, "start": "09:00", "end": "13:30"},
                {"subject": "Iniciació als Projectes de Disseny I", "teachers": [], "classrooms": [], "day": 3, "start": "09:00", "end": "13:30"},
                {"subject": "Taller Tridimensional i d'Investigació Artística", "teachers": ["Jaume Ferrete Vázquez"], "classrooms": ["G1.3"], "day": 4, "start": "09:00", "end": "13:30"},
                {"subject": "Llenguatges Audiovisuals I", "teachers": ["Laura Subirats"], "classrooms": ["P1.5"], "day": 5, "start": "09:00", "end": "13:30"}
            ],
            "2n_semestre": [
                {"subject": "Economia, Empresa i Disseny", "teachers": ["Santiago Benítez"], "classrooms": ["P1.16"], "day": 1, "start": "09:00", "end": "13:30"},
                {"subject": "Expressió Gràfica II", "teachers": [], "classrooms": [], "day": 2, "start": "09:00", "end": "13:30"},
                {"subject": "Iniciació als Projectes de Disseny II", "teachers": [], "classrooms": [], "day": 3, "start": "09:00", "end": "13:30"},
                {"subject": "Taller de Creativitat", "teachers": ["Marta Velasco"], "classrooms": ["GO.2"], "day": 4, "start": "09:00", "end": "13:30"},
                {"subject": "Llenguatges Audiovisuals II", "teachers": ["Rebecca Gil"], "classrooms": ["LO.2"], "day": 5, "start": "09:00", "end": "13:30"}
            ]
        }
        # Continuaré afegint més grups M3, M4, etc...
    }
}

def generate_typescript_code(data):
    """Genera el codi TypeScript per importar els horaris"""
    
    typescript_code = """import { importSchedule, ScheduleEntry } from './import-schedules-complete-mapping'

// ============================================
// IMPORTACIÓ AUTOMÀTICA DE TOTS ELS HORARIS
// ============================================

async function importAllSchedulesAutomatically() {
  console.log('🎓 IMPORTACIÓ AUTOMÀTICA DE TOTS ELS HORARIS')
  console.log('===========================================\\n')
  
  const allSchedules: ScheduleEntry[] = [
"""
    
    # Processar cada curs i grup
    for course_key, groups in data.items():
        course_name = course_key.replace('_', ' ').upper()
        typescript_code += f"\n    // {course_name}\n"
        
        for group_name, semesters in groups.items():
            for semester_key, classes in semesters.items():
                semester_num = 1 if "1r" in semester_key else 2
                
                for class_data in classes:
                    # Corregir errors comuns
                    teachers = [t for t in class_data['teachers'] if t and "Sala" not in t]
                    
                    typescript_code += f"""    {{
      groupName: '{course_key.split("_")[1]} Matí {group_name}',
      subjectName: '{class_data['subject']}',
      teachers: {json.dumps(teachers)},
      classrooms: {json.dumps(class_data['classrooms'])},
      dayOfWeek: {class_data['day']},
      startTime: '{class_data['start']}',
      endTime: '{class_data['end']}',
      semester: {semester_num}
    }},
"""
    
    typescript_code += """  ]
  
  const { successCount, errorCount } = await importSchedule(allSchedules, false)
  
  console.log('\\n===========================================')
  console.log(`✅ IMPORTACIÓ COMPLETADA`)
  console.log(`📊 Total: ${successCount} èxits, ${errorCount} errors`)
}

// Executar
importAllSchedulesAutomatically().catch(console.error)
"""
    
    return typescript_code

# Generar el codi
typescript_code = generate_typescript_code(all_schedules_data)

# Guardar en un fitxer
with open('/Users/josepmarimon/Documents/github/bau-assist/scripts/import-all-schedules-auto.ts', 'w', encoding='utf-8') as f:
    f.write(typescript_code)

print("✅ Codi TypeScript generat!")