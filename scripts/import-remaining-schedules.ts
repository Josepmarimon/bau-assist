import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Mapeig de professors
const TEACHER_MAPPINGS: Record<string, string> = {
  'Mario Santamaría': 'Mario Santamaría García',
  'Irena Visa': '', // No existe, crear
  'Blanca-Pía Fernández': 'Blanca-Pía Fernández Valverde',
  'Mª Isabel del Río': 'María Isabel del Río Sánchez',
  'M. Isabel del Río': 'María Isabel del Río Sánchez',
  'Camila Maggi': '', // No existe
  'Laura Subirats': 'Laura Subirats Berenguer',
  'Laurà Subirats': 'Laura Subirats Berenguer',
  'Jaume Ferraté Vázquez': 'Jaume Ferraté Vázquez',
  'Marta Velasco': '', // No existe
  'Serafín Álvarez': 'Serafín Álvarez Prieto',
  'David Martin': 'David Martín Royo',
  'Mariona García': 'Mariona García Villalba',
  'Jesús Morentín': 'Jesús Morentín Rodríguez',
  'Pau de Riba': 'Pau de Riba Miralles',
  'Isabel Quiles': '', // No existe
  'Mª Àngels Fortea': 'Mª Àngels Fortea Castillo',
  'David Torrents': 'David Torrents Janer',
  'Nadia Speranza': '', // No existe
  'Arnau Pi': 'Arnau Pi Bori',
  'Adrià Molins': '', // No existe
  'Anna Carreras': 'Anna Carreras Crosas',
  'Roc Albalat': 'Roc Albalat Gilabert',
  'Gabriel Ventura': '', // No existe
  'David Ortiz': 'David Ortiz Juan',
  'Jordi Galobart': 'Jordi Galobart Casanova',
  'Mireia Carbonell': '', // No existe
  'Marina Gil': 'Marina Gil Salazar',
  'Ruben Pater': '', // No existe
}

// Mapeig d'aules
const CLASSROOM_MAPPINGS: Record<string, string> = {
  'G2.2': 'G.2.2',
  'L1.2': 'L.1.2',
  'P1.9': 'P.1.9',
  'G1.3': 'G.1.3',
  'P0.6': 'P.0.6',
  'P1.5': 'P.1.5',
  'P0.2/0.4': 'P.0.2/0.4',
  'P0.12': 'P.0.12',
  'POS/0.7': 'P.0.5/0.7',
  'P0.5/0.7': 'P.0.5/0.7',
  'P1.6': 'P.1.6',
  'P0.10': 'P.0.10',
  'P0.8': 'P.0.8',
  'P1.7': 'P.1.7',
  'P0.3': 'P.0.3',
  'P2.2': 'P.2.2',
  'P1.14': 'P.1.14',
  'P1.10': 'P.1.10',
}

interface ScheduleEntry {
  groupName: string
  subjectName: string
  teachers: string[]
  classrooms: string[]
  dayOfWeek: number
  startTime: string
  endTime: string
  semester: number
}

// Dades extretes de les imatges
const scheduleData: ScheduleEntry[] = [
  // 2n Tarda T1 - 1r Semestre (Página 6)
  {
    groupName: '2n Tarda T1',
    subjectName: 'Taller Tridimensional i d\'Investigació Artística',
    teachers: ['Mario Santamaría'],
    classrooms: ['G2.2'],
    dayOfWeek: 1,
    startTime: '15:00',
    endTime: '20:30',
    semester: 1
  },
  {
    groupName: '2n Tarda T1',
    subjectName: 'Llenguatges Audiovisuals II',
    teachers: ['Irena Visa'],
    classrooms: ['L1.2'],
    dayOfWeek: 2,
    startTime: '15:00',
    endTime: '20:30',
    semester: 1
  },
  {
    groupName: '2n Tarda T1',
    subjectName: 'Expressió Gràfica I',
    teachers: [],
    classrooms: [],
    dayOfWeek: 3,
    startTime: '15:00',
    endTime: '17:30',
    semester: 1
  },
  {
    groupName: '2n Tarda T1',
    subjectName: 'Expressió Gràfica I',
    teachers: [],
    classrooms: [],
    dayOfWeek: 3,
    startTime: '17:30',
    endTime: '19:30',
    semester: 1
  },
  {
    groupName: '2n Tarda T1',
    subjectName: 'Iniciació als Projectes de Disseny I',
    teachers: [],
    classrooms: [],
    dayOfWeek: 4,
    startTime: '15:00',
    endTime: '17:30',
    semester: 1
  },
  {
    groupName: '2n Tarda T1',
    subjectName: 'Iniciació als Projectes de Disseny I',
    teachers: [],
    classrooms: [],
    dayOfWeek: 4,
    startTime: '17:30',
    endTime: '19:30',
    semester: 1
  },
  {
    groupName: '2n Tarda T1',
    subjectName: 'Economia, Empresa i Disseny',
    teachers: ['Blanca-Pía Fernández'],
    classrooms: ['P1.9'],
    dayOfWeek: 5,
    startTime: '15:00',
    endTime: '20:30',
    semester: 1
  },
  {
    groupName: '2n Tarda T1',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['G2.2'],
    dayOfWeek: 1,
    startTime: '19:30',
    endTime: '20:30',
    semester: 1
  },
  {
    groupName: '2n Tarda T1',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['L1.2'],
    dayOfWeek: 2,
    startTime: '19:30',
    endTime: '20:30',
    semester: 1
  },
  {
    groupName: '2n Tarda T1',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: [],
    dayOfWeek: 3,
    startTime: '19:30',
    endTime: '20:30',
    semester: 1
  },
  {
    groupName: '2n Tarda T1',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: [],
    dayOfWeek: 4,
    startTime: '19:30',
    endTime: '20:30',
    semester: 1
  },
  {
    groupName: '2n Tarda T1',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P1.9'],
    dayOfWeek: 5,
    startTime: '19:30',
    endTime: '20:30',
    semester: 1
  },
  // 2n Tarda T1 - 2n Semestre
  {
    groupName: '2n Tarda T1',
    subjectName: 'Taller de Creativitat',
    teachers: ['Camila Maggi'],
    classrooms: ['G1.3'],
    dayOfWeek: 1,
    startTime: '15:00',
    endTime: '20:30',
    semester: 2
  },
  {
    groupName: '2n Tarda T1',
    subjectName: 'Història del Disseny',
    teachers: ['Mª Isabel del Río'],
    classrooms: ['P0.6'],
    dayOfWeek: 2,
    startTime: '15:00',
    endTime: '20:30',
    semester: 2
  },
  {
    groupName: '2n Tarda T1',
    subjectName: 'Expressió Gràfica II',
    teachers: [],
    classrooms: [],
    dayOfWeek: 3,
    startTime: '15:00',
    endTime: '17:30',
    semester: 2
  },
  {
    groupName: '2n Tarda T1',
    subjectName: 'Expressió Gràfica II',
    teachers: [],
    classrooms: [],
    dayOfWeek: 3,
    startTime: '17:30',
    endTime: '19:30',
    semester: 2
  },
  {
    groupName: '2n Tarda T1',
    subjectName: 'Iniciació als Projectes de Disseny II',
    teachers: [],
    classrooms: [],
    dayOfWeek: 4,
    startTime: '15:00',
    endTime: '17:30',
    semester: 2
  },
  {
    groupName: '2n Tarda T1',
    subjectName: 'Iniciació als Projectes de Disseny II',
    teachers: [],
    classrooms: [],
    dayOfWeek: 4,
    startTime: '17:30',
    endTime: '19:30',
    semester: 2
  },
  {
    groupName: '2n Tarda T1',
    subjectName: 'Llenguatges Audiovisuals II',
    teachers: ['Laura Subirats'],
    classrooms: ['P1.5'],
    dayOfWeek: 5,
    startTime: '15:00',
    endTime: '20:30',
    semester: 2
  },
  {
    groupName: '2n Tarda T1',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['G1.3'],
    dayOfWeek: 1,
    startTime: '19:30',
    endTime: '20:30',
    semester: 2
  },
  {
    groupName: '2n Tarda T1',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P0.6'],
    dayOfWeek: 2,
    startTime: '19:30',
    endTime: '20:30',
    semester: 2
  },
  {
    groupName: '2n Tarda T1',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: [],
    dayOfWeek: 3,
    startTime: '19:30',
    endTime: '20:30',
    semester: 2
  },
  {
    groupName: '2n Tarda T1',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: [],
    dayOfWeek: 4,
    startTime: '19:30',
    endTime: '20:30',
    semester: 2
  },
  {
    groupName: '2n Tarda T1',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P1.5'],
    dayOfWeek: 5,
    startTime: '19:30',
    endTime: '20:30',
    semester: 2
  },
  // 2n Tarda T2 - 1r Semestre (Página 7)
  {
    groupName: '2n Tarda T2',
    subjectName: 'Taller Tridimensional i d\'Investigació Artística',
    teachers: ['Jaume Ferraté Vázquez'],
    classrooms: ['G1.3'],
    dayOfWeek: 1,
    startTime: '15:00',
    endTime: '20:30',
    semester: 1
  },
  {
    groupName: '2n Tarda T2',
    subjectName: 'Història del Disseny',
    teachers: ['Mª Isabel del Río'],
    classrooms: ['P0.6'],
    dayOfWeek: 2,
    startTime: '15:00',
    endTime: '20:30',
    semester: 1
  },
  {
    groupName: '2n Tarda T2',
    subjectName: 'Expressió Gràfica I',
    teachers: [],
    classrooms: [],
    dayOfWeek: 3,
    startTime: '15:00',
    endTime: '17:30',
    semester: 1
  },
  {
    groupName: '2n Tarda T2',
    subjectName: 'Expressió Gràfica I',
    teachers: [],
    classrooms: [],
    dayOfWeek: 3,
    startTime: '17:30',
    endTime: '19:30',
    semester: 1
  },
  {
    groupName: '2n Tarda T2',
    subjectName: 'Iniciació als Projectes de Disseny I',
    teachers: [],
    classrooms: [],
    dayOfWeek: 4,
    startTime: '15:00',
    endTime: '17:30',
    semester: 1
  },
  {
    groupName: '2n Tarda T2',
    subjectName: 'Iniciació als Projectes de Disseny I',
    teachers: [],
    classrooms: [],
    dayOfWeek: 4,
    startTime: '17:30',
    endTime: '19:30',
    semester: 1
  },
  {
    groupName: '2n Tarda T2',
    subjectName: 'Llenguatges Audiovisuals I',
    teachers: ['Irena Visa'],
    classrooms: ['P1.5'],
    dayOfWeek: 5,
    startTime: '15:00',
    endTime: '20:30',
    semester: 1
  },
  // Tutories T2 Sem 1
  {
    groupName: '2n Tarda T2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['G1.3'],
    dayOfWeek: 1,
    startTime: '19:30',
    endTime: '20:30',
    semester: 1
  },
  {
    groupName: '2n Tarda T2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P0.6'],
    dayOfWeek: 2,
    startTime: '19:30',
    endTime: '20:30',
    semester: 1
  },
  {
    groupName: '2n Tarda T2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: [],
    dayOfWeek: 3,
    startTime: '19:30',
    endTime: '20:30',
    semester: 1
  },
  {
    groupName: '2n Tarda T2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: [],
    dayOfWeek: 4,
    startTime: '19:30',
    endTime: '20:30',
    semester: 1
  },
  {
    groupName: '2n Tarda T2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P1.5'],
    dayOfWeek: 5,
    startTime: '19:30',
    endTime: '20:30',
    semester: 1
  },
  // 2n Tarda T2 - 2n Semestre
  {
    groupName: '2n Tarda T2',
    subjectName: 'Taller de Creativitat',
    teachers: ['Marta Velasco'],
    classrooms: ['G2.2'],
    dayOfWeek: 1,
    startTime: '15:00',
    endTime: '20:30',
    semester: 2
  },
  {
    groupName: '2n Tarda T2',
    subjectName: 'Llenguatges Audiovisuals II',
    teachers: ['Serafín Álvarez'],
    classrooms: ['P0.5/0.7'],
    dayOfWeek: 2,
    startTime: '15:00',
    endTime: '20:30',
    semester: 2
  },
  {
    groupName: '2n Tarda T2',
    subjectName: 'Expressió Gràfica II',
    teachers: [],
    classrooms: [],
    dayOfWeek: 3,
    startTime: '15:00',
    endTime: '17:30',
    semester: 2
  },
  {
    groupName: '2n Tarda T2',
    subjectName: 'Expressió Gràfica II',
    teachers: [],
    classrooms: [],
    dayOfWeek: 3,
    startTime: '17:30',
    endTime: '19:30',
    semester: 2
  },
  {
    groupName: '2n Tarda T2',
    subjectName: 'Iniciació als Projectes de Disseny II',
    teachers: [],
    classrooms: [],
    dayOfWeek: 4,
    startTime: '15:00',
    endTime: '17:30',
    semester: 2
  },
  {
    groupName: '2n Tarda T2',
    subjectName: 'Iniciació als Projectes de Disseny II',
    teachers: [],
    classrooms: [],
    dayOfWeek: 4,
    startTime: '17:30',
    endTime: '19:30',
    semester: 2
  },
  {
    groupName: '2n Tarda T2',
    subjectName: 'Economia, Empresa i Disseny',
    teachers: ['Blanca-Pía Fernández'],
    classrooms: ['P1.9'],
    dayOfWeek: 5,
    startTime: '15:00',
    endTime: '20:30',
    semester: 2
  },
  // Tutories T2 Sem 2
  {
    groupName: '2n Tarda T2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['G2.2'],
    dayOfWeek: 1,
    startTime: '19:30',
    endTime: '20:30',
    semester: 2
  },
  {
    groupName: '2n Tarda T2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P0.5/0.7'],
    dayOfWeek: 2,
    startTime: '19:30',
    endTime: '20:30',
    semester: 2
  },
  {
    groupName: '2n Tarda T2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: [],
    dayOfWeek: 3,
    startTime: '19:30',
    endTime: '20:30',
    semester: 2
  },
  {
    groupName: '2n Tarda T2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: [],
    dayOfWeek: 4,
    startTime: '19:30',
    endTime: '20:30',
    semester: 2
  },
  {
    groupName: '2n Tarda T2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P1.9'],
    dayOfWeek: 5,
    startTime: '19:30',
    endTime: '20:30',
    semester: 2
  },
  // Menció Gràfic i Comunicació Visual Gm1 - 1r Semestre (Página 8)
  {
    groupName: '2n Matí Gm1',
    subjectName: 'Expressió Gràfica I',
    teachers: ['David Martin'],
    classrooms: ['P0.2/0.4'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '2n Matí Gm1',
    subjectName: 'Iniciació als Projectes de Disseny I',
    teachers: ['Mariona García'],
    classrooms: ['P0.12'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '2n Matí Gm1',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P0.2/0.4'],
    dayOfWeek: 1,
    startTime: '13:30',
    endTime: '14:30',
    semester: 1
  },
  {
    groupName: '2n Matí Gm1',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P0.12'],
    dayOfWeek: 2,
    startTime: '13:30',
    endTime: '14:30',
    semester: 1
  },
  // Menció Gràfic i Comunicació Visual Gm1 - 2n Semestre
  {
    groupName: '2n Matí Gm1',
    subjectName: 'Expressió Gràfica II',
    teachers: ['David Martin'],
    classrooms: ['P0.2/0.4'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '2n Matí Gm1',
    subjectName: 'Iniciació als Projectes de Disseny II',
    teachers: ['Mariona García'],
    classrooms: ['P0.12'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '2n Matí Gm1',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P0.2/0.4'],
    dayOfWeek: 1,
    startTime: '13:30',
    endTime: '14:30',
    semester: 2
  },
  {
    groupName: '2n Matí Gm1',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P0.12'],
    dayOfWeek: 2,
    startTime: '13:30',
    endTime: '14:30',
    semester: 2
  },
  // Menció Gràfic i Comunicació Visual Gm2 - 1r Semestre (Página 9) 
  {
    groupName: '2n Matí Gm2',
    subjectName: 'Iniciació als Projectes de Disseny I',
    teachers: ['Mariona García'],
    classrooms: ['P0.12'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '2n Matí Gm2',
    subjectName: 'Expressió Gràfica I',
    teachers: ['David Martin'],
    classrooms: ['P0.5/0.7'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '2n Matí Gm2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P0.12'],
    dayOfWeek: 1,
    startTime: '13:30',
    endTime: '14:30',
    semester: 1
  },
  {
    groupName: '2n Matí Gm2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P0.5/0.7'],
    dayOfWeek: 2,
    startTime: '13:30',
    endTime: '14:30',
    semester: 1
  },
  // Menció Gràfic i Comunicació Visual Gm2 - 2n Semestre
  {
    groupName: '2n Matí Gm2',
    subjectName: 'Iniciació als Projectes de Disseny II',
    teachers: ['Mariona García'],
    classrooms: ['P0.12'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '2n Matí Gm2',
    subjectName: 'Expressió Gràfica II',
    teachers: ['David Martin'],
    classrooms: ['P0.5/0.7'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '2n Matí Gm2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P0.12'],
    dayOfWeek: 1,
    startTime: '13:30',
    endTime: '14:30',
    semester: 2
  },
  {
    groupName: '2n Matí Gm2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P0.5/0.7'],
    dayOfWeek: 2,
    startTime: '13:30',
    endTime: '14:30',
    semester: 2
  },
  // 3r Gràfic Gm2 - 1r Semestre
  {
    groupName: '3r Matí Gm2',
    subjectName: 'Tipografia I',
    teachers: ['Jesús Morentín'],
    classrooms: ['P0.5/0.7'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '3r Matí Gm2',
    subjectName: 'Projectes de Disseny Gràfic I',
    teachers: ['Pau de Riba'],
    classrooms: ['P1.5'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '3r Matí Gm2',
    subjectName: 'Infografia I',
    teachers: ['Isabel Quiles'],
    classrooms: ['P1.6'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '3r Matí Gm2',
    subjectName: 'Cultura de la Imatge I',
    teachers: ['Mª Àngels Fortea'],
    classrooms: ['P0.10'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '3r Matí Gm2',
    subjectName: 'Taller de Gràfic i Comunicació Visual I',
    teachers: ['David Torrents'],
    classrooms: ['P0.2/0.4'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  // Tutories 3r Gm2 Sem 1
  {
    groupName: '3r Matí Gm2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P0.5/0.7'],
    dayOfWeek: 1,
    startTime: '13:30',
    endTime: '14:30',
    semester: 1
  },
  {
    groupName: '3r Matí Gm2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P1.5'],
    dayOfWeek: 2,
    startTime: '13:30',
    endTime: '14:30',
    semester: 1
  },
  {
    groupName: '3r Matí Gm2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P1.6'],
    dayOfWeek: 3,
    startTime: '13:30',
    endTime: '14:30',
    semester: 1
  },
  {
    groupName: '3r Matí Gm2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P0.10'],
    dayOfWeek: 4,
    startTime: '13:30',
    endTime: '14:30',
    semester: 1
  },
  {
    groupName: '3r Matí Gm2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P0.2/0.4'],
    dayOfWeek: 5,
    startTime: '13:30',
    endTime: '14:30',
    semester: 1
  },
  // 3r Gràfic Gm2 - 2n Semestre
  {
    groupName: '3r Matí Gm2',
    subjectName: 'Tipografia II',
    teachers: ['Jesús Morentín'],
    classrooms: ['P0.5/0.7', 'P1.6'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '3r Matí Gm2',
    subjectName: 'Projectes de Disseny Gràfic II',
    teachers: ['Nadia Speranza'],
    classrooms: ['P1.5'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '3r Matí Gm2',
    subjectName: 'Infografia II',
    teachers: ['Isabel Quiles'],
    classrooms: ['P1.6'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '3r Matí Gm2',
    subjectName: 'Cultura de la Imatge II',
    teachers: ['Mª Àngels Fortea'],
    classrooms: ['P0.10'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '3r Matí Gm2',
    subjectName: 'Taller de Gràfic i Comunicació Visual II',
    teachers: ['Arnau Pi', 'Adrià Molins'],
    classrooms: ['P0.2/0.4'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  // Tutories 3r Gm2 Sem 2
  {
    groupName: '3r Matí Gm2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P0.5/0.7', 'P1.6'],
    dayOfWeek: 1,
    startTime: '13:30',
    endTime: '14:30',
    semester: 2
  },
  {
    groupName: '3r Matí Gm2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P1.5'],
    dayOfWeek: 2,
    startTime: '13:30',
    endTime: '14:30',
    semester: 2
  },
  {
    groupName: '3r Matí Gm2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P1.6'],
    dayOfWeek: 3,
    startTime: '13:30',
    endTime: '14:30',
    semester: 2
  },
  {
    groupName: '3r Matí Gm2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P0.10'],
    dayOfWeek: 4,
    startTime: '13:30',
    endTime: '14:30',
    semester: 2
  },
  {
    groupName: '3r Matí Gm2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P0.2/0.4'],
    dayOfWeek: 5,
    startTime: '13:30',
    endTime: '14:30',
    semester: 2
  },
  // 4t Gràfic Gm2 - 1r Semestre
  {
    groupName: '4t Matí Gm2',
    subjectName: 'Programació per a Dissenyadors',
    teachers: ['Anna Carreras'],
    classrooms: ['P1.6'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '4t Matí Gm2',
    subjectName: 'Projectes de Disseny Gràfic III',
    teachers: ['Roc Albalat'],
    classrooms: ['P1.7'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '4t Matí Gm2',
    subjectName: 'Disseny i Publicitat',
    teachers: ['Gabriel Ventura'],
    classrooms: ['P0.8'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '4t Matí Gm2',
    subjectName: 'Taller de Gràfic i Comunicació Visual III',
    teachers: ['David Ortiz'],
    classrooms: ['P0.5/0.7'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '4t Matí Gm2',
    subjectName: 'Introducció al Disseny Web',
    teachers: ['Jordi Galobart'],
    classrooms: ['P1.6'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  // Tutories 4t Gm2 Sem 1
  {
    groupName: '4t Matí Gm2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P1.6'],
    dayOfWeek: 1,
    startTime: '13:30',
    endTime: '14:30',
    semester: 1
  },
  {
    groupName: '4t Matí Gm2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P1.7'],
    dayOfWeek: 2,
    startTime: '13:30',
    endTime: '14:30',
    semester: 1
  },
  {
    groupName: '4t Matí Gm2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P0.8'],
    dayOfWeek: 3,
    startTime: '13:30',
    endTime: '14:30',
    semester: 1
  },
  {
    groupName: '4t Matí Gm2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P0.5/0.7'],
    dayOfWeek: 4,
    startTime: '13:30',
    endTime: '14:30',
    semester: 1
  },
  {
    groupName: '4t Matí Gm2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P1.6'],
    dayOfWeek: 5,
    startTime: '13:30',
    endTime: '14:30',
    semester: 1
  },
  // 4t Gràfic Gm2 - 2n Semestre
  {
    groupName: '4t Matí Gm2',
    subjectName: 'Disseny i Comunicació',
    teachers: ['Mireia Carbonell'],
    classrooms: ['P0.8'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '4t Matí Gm2',
    subjectName: 'Treball Final de Grau',
    teachers: ['David Torrents', 'Roc Albalat', 'Marina Gil', 'David Ortiz', 'Ruben Pater'],
    classrooms: ['P0.3', 'P2.2', 'P1.7', 'P1.14', 'P1.10'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '4t Matí Gm2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P0.8'],
    dayOfWeek: 2,
    startTime: '13:30',
    endTime: '14:30',
    semester: 2
  },
  {
    groupName: '4t Matí Gm2',
    subjectName: 'Tutories',
    teachers: [],
    classrooms: ['P0.3', 'P0.14', 'P1.7', 'P2.2', 'P1.10'],
    dayOfWeek: 4,
    startTime: '13:30',
    endTime: '14:30',
    semester: 2
  },
]

async function importSchedules() {
  console.log('🚀 Iniciant importació d\'horaris restants...')
  
  for (const entry of scheduleData) {
    try {
      console.log(`\n📚 Processant: ${entry.groupName} - ${entry.subjectName} (Sem ${entry.semester})`)
      
      // 1. Buscar o crear grup
      let { data: studentGroup } = await supabase
        .from('student_groups')
        .select('id')
        .eq('name', entry.groupName)
        .single()
      
      if (!studentGroup) {
        console.log(`   ⚠️ Grup ${entry.groupName} no trobat`)
        continue
      }
      
      // 2. Buscar assignatura
      let { data: subject } = await supabase
        .from('subjects')
        .select('id')
        .ilike('name', `%${entry.subjectName}%`)
        .single()
      
      if (!subject) {
        console.log(`   ⚠️ Assignatura "${entry.subjectName}" no trobada`)
        // Intentar crear-la si és necessari
        const { data: newSubject } = await supabase
          .from('subjects')
          .insert({
            name: entry.subjectName,
            code: entry.subjectName.substring(0, 10).toUpperCase().replace(/\s/g, ''),
            credits: 6,
            year: parseInt(entry.groupName.charAt(0)),
            type: 'obligatoria'
          })
          .select()
          .single()
        
        if (newSubject) {
          subject = newSubject
          console.log(`   ✅ Assignatura creada`)
        } else {
          continue
        }
      }
      
      // 3. Buscar professors
      const teacherIds = []
      for (const teacherName of entry.teachers) {
        if (!teacherName) continue
        
        const mappedName = TEACHER_MAPPINGS[teacherName] || teacherName
        if (!mappedName) {
          console.log(`   ⚠️ Professor "${teacherName}" no existeix i cal crear-lo`)
          continue
        }
        
        const { data: teacher } = await supabase
          .from('teachers')
          .select('id')
          .or(`first_name.ilike.%${mappedName.split(' ')[0]}%,last_name.ilike.%${mappedName.split(' ').pop()}%`)
          .single()
        
        if (teacher) {
          teacherIds.push(teacher.id)
        }
      }
      
      // 4. Buscar aules
      const classroomIds = []
      for (const classroomCode of entry.classrooms) {
        if (!classroomCode) continue
        
        const mappedCode = CLASSROOM_MAPPINGS[classroomCode] || classroomCode
        const { data: classroom } = await supabase
          .from('classrooms')
          .select('id')
          .eq('code', mappedCode)
          .single()
        
        if (classroom) {
          classroomIds.push(classroom.id)
        } else {
          console.log(`   ⚠️ Aula ${classroomCode} (${mappedCode}) no trobada`)
        }
      }
      
      // 5. Crear schedule slot
      if (!studentGroup || !subject) {
        console.log(`   ❌ Error: Missing student group or subject`)
        continue
      }

      const { data: scheduleSlot, error: slotError } = await supabase
        .from('schedule_slots')
        .insert({
          student_group_id: studentGroup.id,
          subject_id: subject.id,
          day_of_week: entry.dayOfWeek,
          start_time: entry.startTime + ':00',
          end_time: entry.endTime + ':00',
          academic_year: '2025-26',
          semester: entry.semester
        })
        .select()
        .single()
      
      if (slotError) {
        console.log(`   ❌ Error creant slot:`, slotError.message)
        continue
      }
      
      // 6. Assignar professors
      if (scheduleSlot && teacherIds.length > 0) {
        for (const teacherId of teacherIds) {
          await supabase
            .from('schedule_slot_teachers')
            .insert({
              schedule_slot_id: scheduleSlot.id,
              teacher_id: teacherId
            })
        }
      }
      
      // 7. Assignar aules
      if (scheduleSlot && classroomIds.length > 0) {
        for (const classroomId of classroomIds) {
          await supabase
            .from('schedule_slot_classrooms')
            .insert({
              schedule_slot_id: scheduleSlot.id,
              classroom_id: classroomId
            })
        }
      }
      
      console.log(`   ✅ Importat correctament`)
      
    } catch (error) {
      console.error(`   ❌ Error processant ${entry.subjectName}:`, error)
    }
  }
  
  console.log('\n✅ Importació completada!')
}

// Executar importació
importSchedules().catch(console.error)