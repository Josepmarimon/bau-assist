'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function TestEquipmentData() {
  const [data, setData] = useState<any>({})
  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      // Test equipment_types table
      const { data: equipment, error: equipError } = await supabase
        .from('equipment_types')
        .select('*')
        .limit(5)

      // Test classroom_equipment table
      const { data: classroomEquip, error: classEquipError } = await supabase
        .from('classroom_equipment')
        .select('*')
        .limit(5)

      // Test software table
      const { data: software, error: softError } = await supabase
        .from('software')
        .select('*')
        .limit(5)

      // Test classroom_software table
      const { data: classroomSoft, error: classSoftError } = await supabase
        .from('classroom_software')
        .select('*')
        .limit(5)

      setData({
        equipment: { data: equipment, error: equipError },
        classroomEquip: { data: classroomEquip, error: classEquipError },
        software: { data: software, error: softError },
        classroomSoft: { data: classroomSoft, error: classSoftError }
      })
    }

    loadData()
  }, [])

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold">Equipment and Software Data Test</h2>
      
      <div>
        <h3 className="font-semibold">Equipment Types:</h3>
        <pre className="text-xs">{JSON.stringify(data.equipment, null, 2)}</pre>
      </div>

      <div>
        <h3 className="font-semibold">Classroom Equipment:</h3>
        <pre className="text-xs">{JSON.stringify(data.classroomEquip, null, 2)}</pre>
      </div>

      <div>
        <h3 className="font-semibold">Software:</h3>
        <pre className="text-xs">{JSON.stringify(data.software, null, 2)}</pre>
      </div>

      <div>
        <h3 className="font-semibold">Classroom Software:</h3>
        <pre className="text-xs">{JSON.stringify(data.classroomSoft, null, 2)}</pre>
      </div>
    </div>
  )
}