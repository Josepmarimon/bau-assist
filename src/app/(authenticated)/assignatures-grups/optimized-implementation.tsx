// Example: Optimized implementation for assignatures-grups page
// This shows how to use the new RPC functions for better performance

import { createClient } from '@/lib/supabase/client'

// Define types for the RPC function returns
interface SubjectWithCounts {
  id: string
  code: string
  name: string
  credits: number
  year: number
  semester: string
  type: string
  department: string | null
  active: boolean
  itinerari: string | null
  group_count: number
  teacher_count: number
  assignment_count: number
  total_capacity: number
}

interface GroupWithDetails {
  id: string
  subject_id: string
  semester_id: string
  group_code: string
  max_students: number
  created_at: string
  updated_at: string
  student_group_id: string | null
  semester_name: string
  academic_year_name: string
  teacher_count: number
  teacher_names: string
  assignment_count: number
  enrolled_students: number
  has_classroom_assignments: boolean
}

interface GroupAssignmentDetail {
  subject_group_id: string
  assignment_id: string
  day_of_week: number
  start_time: string
  end_time: string
  classroom_name: string
  classroom_building: string
  is_full_semester: boolean
  week_numbers: number[] | null
}

// Optimized subject loading function
export async function loadSubjectsOptimized(filters: {
  grau: string
  curs: string
  itinerari: string
  semestre: string
  nom: string
}) {
  const supabase = createClient()
  
  try {
    // Single RPC call to get all subjects with counts
    const { data, error } = await supabase
      .rpc('get_subjects_with_counts', {
        p_degree_prefix: filters.grau && filters.grau !== 'all' ? filters.grau : null,
        p_year: filters.curs && filters.curs !== 'all' ? parseInt(filters.curs) : null,
        p_semester: filters.semestre && filters.semestre !== 'all' ? filters.semestre : null,
        p_itinerari: filters.itinerari && filters.itinerari !== 'all' ? filters.itinerari : null,
        p_search_term: filters.nom || null
      })

    if (error) throw error
    
    return data as SubjectWithCounts[]
  } catch (error) {
    console.error('Error loading subjects:', error)
    return []
  }
}

// Optimized group loading function
export async function loadSubjectGroupsOptimized(subjectId: string) {
  const supabase = createClient()
  
  try {
    // Get groups with all details in one call
    const { data: groups, error: groupsError } = await supabase
      .rpc('get_subject_groups_with_details', {
        p_subject_id: subjectId
      })

    if (groupsError) throw groupsError

    // Get assignment details for all groups at once
    const groupIds = (groups || []).map((g: any) => g.id)
    
    if (groupIds.length > 0) {
      const { data: assignments, error: assignmentsError } = await supabase
        .rpc('get_group_assignment_details', {
          p_group_ids: groupIds
        })

      if (assignmentsError) throw assignmentsError

      // Merge assignment details with groups
      const assignmentsByGroup = (assignments || []).reduce((acc: any, assignment: any) => {
        if (!acc[assignment.subject_group_id]) {
          acc[assignment.subject_group_id] = []
        }
        acc[assignment.subject_group_id].push(assignment)
        return acc
      }, {} as Record<string, GroupAssignmentDetail[]>)

      return {
        groups: groups as GroupWithDetails[],
        assignments: assignmentsByGroup
      }
    }

    return {
      groups: groups as GroupWithDetails[],
      assignments: {}
    }
  } catch (error) {
    console.error('Error loading subject groups:', error)
    return { groups: [], assignments: {} }
  }
}

// Get dashboard statistics
export async function getDashboardStats(degreePrefix?: string) {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .rpc('get_subject_dashboard_stats', {
        p_degree_prefix: degreePrefix || null
      })

    if (error) throw error
    
    return data?.[0] || {
      total_subjects: 0,
      total_groups: 0,
      total_ects: 0,
      total_teachers: 0,
      subjects_without_groups: 0,
      groups_without_assignments: 0
    }
  } catch (error) {
    console.error('Error loading dashboard stats:', error)
    return {
      total_subjects: 0,
      total_groups: 0,
      total_ects: 0,
      total_teachers: 0,
      subjects_without_groups: 0,
      groups_without_assignments: 0
    }
  }
}

// Example usage in a component:
/*
export default function OptimizedAssignaturesGrupsPage() {
  const [subjects, setSubjects] = useState<SubjectWithCounts[]>([])
  const [loading, setLoading] = useState(true)
  
  // Load subjects with counts - much faster than current implementation
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      const subjectsData = await loadSubjectsOptimized(filters)
      setSubjects(subjectsData)
      
      // Also load dashboard stats
      const stats = await getDashboardStats(filters.grau)
      setDashboardStats(stats)
      
      setLoading(false)
    }
    
    loadData()
  }, [filters])
  
  // When expanding a subject, load groups efficiently
  const handleExpandSubject = async (subjectId: string) => {
    const { groups, assignments } = await loadSubjectGroupsOptimized(subjectId)
    // Update state with loaded data
  }
  
  // Render subjects with pre-computed counts
  return (
    <div>
      {subjects.map(subject => (
        <Card key={subject.id}>
          <CardHeader>
            <CardTitle>{subject.name}</CardTitle>
            <div className="flex gap-2">
              <Badge>{subject.group_count} grups</Badge>
              <Badge>{subject.teacher_count} professors</Badge>
              <Badge>{subject.assignment_count} assignacions</Badge>
              <Badge>Capacitat: {subject.total_capacity}</Badge>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
*/