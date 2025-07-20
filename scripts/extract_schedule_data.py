#!/usr/bin/env python3
import os
import json
from typing import List, Dict, Any

# Estructura per emmagatzemar les dades extretes manualment
schedule_data = {
    "disseny": {
        "2n": {
            "M1": {
                "1r_semestre": [
                    {
                        "subject": "Expressió Gràfica I",
                        "teachers": [],
                        "classrooms": [],
                        "day": 1,
                        "start": "09:00",
                        "end": "13:30"
                    },
                    {
                        "subject": "Iniciació als Projectes de Disseny I",
                        "teachers": [],
                        "classrooms": [],
                        "day": 2,
                        "start": "09:00",
                        "end": "13:30"
                    },
                    {
                        "subject": "Taller Tridimensional i d'Investigació Artística",
                        "teachers": ["Mercedes Pimiento"],
                        "classrooms": ["GO.2"],
                        "day": 3,
                        "start": "09:00",
                        "end": "13:30"
                    },
                    {
                        "subject": "Llenguatges Audiovisuals I",
                        "teachers": ["Nico Juárez"],
                        "classrooms": ["Sala Carolines"],
                        "day": 4,
                        "start": "09:00",
                        "end": "13:30"
                    },
                    {
                        "subject": "Història del Disseny",
                        "teachers": ["Mª Isabel del Río"],
                        "classrooms": ["P1.9"],
                        "day": 5,
                        "start": "09:00",
                        "end": "13:30"
                    }
                ],
                "2n_semestre": [
                    {
                        "subject": "Expressió Gràfica II",
                        "teachers": [],
                        "classrooms": [],
                        "day": 1,
                        "start": "09:00",
                        "end": "13:30"
                    },
                    {
                        "subject": "Iniciació als Projectes de Disseny II",
                        "teachers": [],
                        "classrooms": [],
                        "day": 2,
                        "start": "09:00",
                        "end": "13:30"
                    },
                    {
                        "subject": "Taller de Creativitat",
                        "teachers": ["Anna Moreno"],
                        "classrooms": ["G1.3"],
                        "day": 3,
                        "start": "09:00",
                        "end": "13:30"
                    },
                    {
                        "subject": "Llenguatges Audiovisuals II",
                        "teachers": ["Laurà Subirats"],
                        "classrooms": ["PO.5/O.7"],
                        "day": 4,
                        "start": "09:00",
                        "end": "13:30"
                    },
                    {
                        "subject": "Economia, Empresa i Disseny",
                        "teachers": ["Blanca-Pia Fernández"],
                        "classrooms": ["P1.9"],
                        "day": 5,
                        "start": "09:00",
                        "end": "13:30"
                    }
                ]
            }
        }
    }
}

# Guardar les dades en format JSON
output_path = os.path.join(os.path.dirname(__file__), 'extracted_schedules.json')
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(schedule_data, f, ensure_ascii=False, indent=2)

print(f"Dades guardades a: {output_path}")