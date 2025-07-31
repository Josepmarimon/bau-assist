'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function TestSoftwareAssignments() {
  const supabase = createClient()
  const [results, setResults] = useState<any>({})
  const [loading, setLoading] = useState(false)

  const checkData = async () => {
    setLoading(true)
    try {
      // Check classroom_software data
      const { data: assignments, error: assignError } = await supabase
        .from('classroom_software')
        .select(`
          id,
          classroom_id,
          software_id,
          classrooms (
            code,
            name,
            type
          ),
          software (
            name,
            category
          )
        `)
        .limit(10)

      // Count total assignments
      const { count: totalAssignments } = await supabase
        .from('classroom_software')
        .select('*', { count: 'exact', head: true })

      // Count classrooms with software
      const { data: classroomsWithSoftware } = await supabase
        .from('classroom_software')
        .select('classroom_id')
        
      const uniqueClassrooms = new Set(classroomsWithSoftware?.map(cs => cs.classroom_id) || [])

      // Get informatica classrooms without software
      const { data: informaticaClassrooms } = await supabase
        .from('classrooms')
        .select('id, code, name')
        .eq('type', 'Informàtica')

      const informaticaWithoutSoftware = informaticaClassrooms?.filter(c => 
        !classroomsWithSoftware?.some(cs => cs.classroom_id === c.id)
      ) || []

      setResults({
        assignments: assignments || [],
        totalAssignments: totalAssignments || 0,
        uniqueClassrooms: uniqueClassrooms.size,
        informaticaWithoutSoftware,
        error: assignError
      })
    } catch (error) {
      console.error('Error checking data:', error)
      setResults({ error })
    } finally {
      setLoading(false)
    }
  }

  const createTestAssignments = async () => {
    setLoading(true)
    try {
      // Get some software IDs
      const { data: software } = await supabase
        .from('software')
        .select('id, name')
        .limit(5)

      // Get informatica classrooms without software
      const { data: classrooms } = await supabase
        .from('classrooms')
        .select('id, code, name')
        .eq('type', 'Informàtica')
        .limit(3)

      if (!software || !classrooms) {
        console.error('No software or classrooms found')
        return
      }

      // Create test assignments
      const assignments = []
      for (const classroom of classrooms) {
        for (const sw of software.slice(0, 3)) { // Assign first 3 software to each classroom
          assignments.push({
            classroom_id: classroom.id,
            software_id: sw.id,
            licenses: 25,
            installed_date: new Date().toISOString().split('T')[0]
          })
        }
      }

      const { data, error } = await supabase
        .from('classroom_software')
        .insert(assignments)
        .select()

      if (error) {
        console.error('Error creating assignments:', error)
      } else {
        console.log('Created assignments:', data)
        await checkData() // Refresh data
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkData()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Software Assignments</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p>Total assignments: {results.totalAssignments}</p>
            <p>Classrooms with software: {results.uniqueClassrooms}</p>
            <p>Informàtica classrooms without software: {results.informaticaWithoutSoftware?.length || 0}</p>
          </div>

          {results.assignments && results.assignments.length > 0 && (
            <div>
              <h3 className="font-semibold">Sample Assignments:</h3>
              <ul className="text-sm space-y-1">
                {results.assignments.map((a: any) => (
                  <li key={a.id}>
                    {a.classrooms?.name} - {a.software?.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {results.informaticaWithoutSoftware && results.informaticaWithoutSoftware.length > 0 && (
            <div>
              <h3 className="font-semibold">Informàtica classrooms without software:</h3>
              <ul className="text-sm space-y-1">
                {results.informaticaWithoutSoftware.map((c: any) => (
                  <li key={c.id}>{c.code} - {c.name}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={checkData} disabled={loading}>
              Refresh Data
            </Button>
            <Button onClick={createTestAssignments} disabled={loading} variant="secondary">
              Create Test Assignments
            </Button>
          </div>

          {results.error && (
            <div className="text-red-500 text-sm">
              Error: {JSON.stringify(results.error)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}