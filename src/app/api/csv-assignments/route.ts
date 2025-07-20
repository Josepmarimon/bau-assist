import { NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Check authentication (optional - remove if you want public access)
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        assignments: [], 
        error: 'Unauthorized' 
      }, { status: 401 })
    }
    // Read both CSV files
    const dissenyPath = path.join(process.cwd(), 'csv/AssignacioDocent_2526_Preparacio(DISSENY).csv')
    const bellesArtsPath = path.join(process.cwd(), 'csv/AssignacioDocent_2526_Preparacio(BELLES ARTS).csv')

    let allRecords: any[] = []

    // Read Disseny CSV
    if (fs.existsSync(dissenyPath)) {
      const dissenyContent = fs.readFileSync(dissenyPath, 'utf-8')
      const dissenyRecords = parse(dissenyContent, {
        columns: false,
        skip_empty_lines: true,
        from_line: 5,
        delimiter: ';',
        relax_column_count: true
      })
      allRecords = [...allRecords, ...dissenyRecords]
    }

    // Read Belles Arts CSV
    if (fs.existsSync(bellesArtsPath)) {
      const bellesArtsContent = fs.readFileSync(bellesArtsPath, 'utf-8')
      const bellesArtsRecords = parse(bellesArtsContent, {
        columns: false,
        skip_empty_lines: true,
        from_line: 5,
        delimiter: ';',
        relax_column_count: true
      })
      allRecords = [...allRecords, ...bellesArtsRecords]
    }

    // Process records into assignments
    const assignments = []
    let id = 1

    for (const row of allRecords) {
      if (!row[3] || !row[4] || !row[9] || !row[12] || !row[16]) continue
      
      // Extract year from course string (e.g., "GR1" -> 1)
      let year = 1
      const courseYear = row[2] || ''
      const yearMatch = courseYear.match(/GR(\d)/)
      if (yearMatch) {
        year = parseInt(yearMatch[1])
      }

      // Create group name
      const groupCode = row[9]
      let groupName = ''
      const shift = groupCode.startsWith('T') ? 'Tarda' : 'Matí'
      
      if (year === 1) groupName = `1r ${shift} ${groupCode}`
      else if (year === 2) groupName = `2n ${shift} ${groupCode}`
      else if (year === 3) groupName = `3r ${shift} ${groupCode}`
      else if (year === 4) groupName = `4t ${shift} ${groupCode}`

      assignments.push({
        id: id++,
        subject_code: row[3],
        subject_name: row[4],
        group_code: groupCode,
        group_name: groupName,
        teacher_id: row[12],
        teacher_name: row[16],
        ects_assigned: parseFloat(row[10]) || 6,
        academic_year: row[1] || '2024-2025',
        course_year: courseYear
      })
    }

    return NextResponse.json({ 
      assignments,
      total: assignments.length 
    })
  } catch (error) {
    console.error('Error reading CSV files:', error)
    return NextResponse.json({ 
      assignments: [], 
      error: 'Failed to load CSV data' 
    }, { status: 500 })
  }
}