// Load teaching assignments directly from CSV files
// This is a temporary solution until the teaching_assignments table is created in production

export interface CSVAssignment {
  id: number
  subject_code: string
  subject_name: string
  subject_id?: string
  group_code: string
  group_name?: string
  teacher_id: string
  teacher_name: string
  ects_assigned: number
  academic_year: string
  course_year: string
}

// Import the pre-processed assignments data
import assignmentsData from '@/data/all-assignments.json'

export async function loadCSVAssignments(): Promise<CSVAssignment[]> {
  try {
    // Return all assignments from the CSV files
    return assignmentsData as CSVAssignment[]
  } catch (error) {
    console.error('Error loading CSV assignments:', error)
    return []
  }
}