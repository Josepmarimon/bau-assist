'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Users,
  Home,
  Wrench,
  Building2,
  Monitor,
  Package,
  Cpu,
  AlertCircle
} from 'lucide-react'
import { CLASSROOM_TYPE_LABELS } from '@/lib/constants/classroom-types'

interface SummaryStats {
  classrooms: {
    total: number
    totalCapacity: number
    available: number
    byType: { type: string; count: number }[]
    byBuilding: { building: string; count: number }[]
  }
  software: {
    total: number
    byCategory: { category: string; count: number }[]
    installations: number
    classroomsWithSoftware: number
    topInstalled: { name: string; count: number }[]
  }
  equipment: {
    totalItems: number
    totalUnits: number
    classroomsWithEquipment: number
    byCategory: { category: string; count: number }[]
    needsAttention: number
  }
}

const formatBuildingName = (building: string): string => {
  if (building === 'G') return 'Edifici Granada'
  return building
}

export default function ResumPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<SummaryStats | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadSummaryData()
  }, [])

  const loadSummaryData = async () => {
    try {
      setLoading(true)

      // --- Aules ---
      const { data: classrooms } = await supabase
        .from('classrooms')
        .select('id, name, building, capacity, type, is_available')

      const totalCapacity = classrooms?.reduce((sum, c) => sum + (c.capacity || 0), 0) || 0
      const available = classrooms?.filter(c => c.is_available).length || 0

      const byTypeMap = (classrooms || []).reduce((acc, c) => {
        const type = c.type || 'other'
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const byBuildingMap = (classrooms || []).reduce((acc, c) => {
        const building = c.building || 'Sense edifici'
        acc[building] = (acc[building] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // --- Software ---
      const { data: software } = await supabase
        .from('software')
        .select('id, name, category')

      const softwareById = new Map((software || []).map(s => [s.id, s]))

      const byCategoryMap = (software || []).reduce((acc, s) => {
        const category = s.category || 'other'
        acc[category] = (acc[category] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const { data: classroomSoftware } = await supabase
        .from('classroom_software')
        .select('software_id, classroom_id')

      const installCountBySoftware = (classroomSoftware || []).reduce((acc, cs) => {
        acc[cs.software_id] = (acc[cs.software_id] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const topInstalled = Object.entries(installCountBySoftware)
        .map(([id, count]) => ({ name: softwareById.get(id)?.name || 'Desconegut', count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)

      const classroomsWithSoftware = new Set((classroomSoftware || []).map(cs => cs.classroom_id)).size

      // --- Equipament ---
      const { data: equipmentTypes } = await supabase
        .from('equipment_types')
        .select('id, category')
      const categoryByType = new Map((equipmentTypes || []).map(t => [t.id, t.category]))

      const { data: inventory } = await supabase
        .from('equipment_inventory')
        .select('id, equipment_type_id, classroom_id, quantity, status')

      const totalUnits = (inventory || []).reduce((sum, i) => sum + (i.quantity || 0), 0)
      const classroomsWithEquipment = new Set((inventory || []).map(i => i.classroom_id)).size
      const needsAttention = (inventory || []).filter(i => i.status && i.status !== 'operational').length

      const equipmentByCategoryMap = (inventory || []).reduce((acc, i) => {
        const category = categoryByType.get(i.equipment_type_id) || 'other'
        acc[category] = (acc[category] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      setStats({
        classrooms: {
          total: classrooms?.length || 0,
          totalCapacity,
          available,
          byType: Object.entries(byTypeMap).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
          byBuilding: Object.entries(byBuildingMap).map(([building, count]) => ({ building, count })).sort((a, b) => b.count - a.count)
        },
        software: {
          total: software?.length || 0,
          byCategory: Object.entries(byCategoryMap).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
          installations: classroomSoftware?.length || 0,
          classroomsWithSoftware,
          topInstalled
        },
        equipment: {
          totalItems: inventory?.length || 0,
          totalUnits,
          classroomsWithEquipment,
          byCategory: Object.entries(equipmentByCategoryMap).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
          needsAttention
        }
      })
    } catch (error) {
      console.error('Error loading summary data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-muted-foreground">
          No s'han pogut carregar les dades
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Resum de Dades</h1>
        <p className="text-muted-foreground">Vista general d'aules, software i equipament</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aules</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.classrooms.total}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Capacitat total: {stats.classrooms.totalCapacity} persones
            </div>
            <div className="text-xs text-muted-foreground">
              Disponibles: {stats.classrooms.available}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Software</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.software.total}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.software.byCategory.length} categories
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Instal·lacions</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.software.installations}</div>
            <div className="text-xs text-muted-foreground mt-1">
              En {stats.software.classroomsWithSoftware} aules
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Equipament</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.equipment.totalUnits}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.equipment.totalItems} registres · {stats.equipment.classroomsWithEquipment} aules
            </div>
            {stats.equipment.needsAttention > 0 && (
              <div className="text-xs text-orange-600 mt-1">
                {stats.equipment.needsAttention} amb incidència
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="aules">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="aules">Aules</TabsTrigger>
          <TabsTrigger value="software">Software</TabsTrigger>
          <TabsTrigger value="equipament">Equipament</TabsTrigger>
        </TabsList>

        <TabsContent value="aules" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Aules per tipus
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.classrooms.byType.map(({ type, count }) => (
                    <div key={type} className="flex items-center justify-between">
                      <span>{CLASSROOM_TYPE_LABELS[type as keyof typeof CLASSROOM_TYPE_LABELS] || type}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Aules per edifici
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.classrooms.byBuilding.map(({ building, count }) => (
                    <div key={building} className="flex items-center justify-between">
                      <span>{formatBuildingName(building)}</span>
                      <Badge>{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="software" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Software per categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {stats.software.byCategory.map(({ category, count }) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="capitalize">{category.replace(/_/g, ' ')}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  Software més instal·lat
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.software.topInstalled.length > 0 ? (
                  <div className="space-y-2">
                    {stats.software.topInstalled.map(({ name, count }) => (
                      <div key={name} className="flex items-center justify-between">
                        <span className="text-sm">{name}</span>
                        <Badge variant="outline">{count} aules</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Cap software instal·lat encara</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="equipament" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Equipament per categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {stats.equipment.byCategory.map(({ category, count }) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="capitalize">{category.replace(/_/g, ' ')}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Estat de l'equipament
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Unitats totals</span>
                  <span className="font-bold">{stats.equipment.totalUnits}</span>
                </div>
                <div className="flex justify-between">
                  <span>Aules amb equipament</span>
                  <span className="font-bold">{stats.equipment.classroomsWithEquipment}</span>
                </div>
                <div className={`flex justify-between ${stats.equipment.needsAttention > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  <span className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Amb incidència
                  </span>
                  <span className="font-bold">{stats.equipment.needsAttention}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
