'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { CLASSROOM_TYPES, CLASSROOM_TYPE_LABELS } from '@/lib/constants/classroom-types'
import { 
  Building2,
  Search,
  Plus,
  Monitor,
  Users,
  Wifi,
  Edit,
  Trash2,
  MapPin,
  Calendar,
  Clock,
  X,
  Eye,
  Wrench,
  Lightbulb,
  BookOpen
} from 'lucide-react'
import { getAllClassroomsOccupancyData } from './actions'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ClassroomDialog } from '@/components/classrooms/classroom-dialog'
import { ClassroomOccupancyDialog } from '@/components/classrooms/classroom-occupancy-dialog'
import { ClassroomDetailsDialog } from '@/components/classrooms/classroom-details-dialog'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Classroom {
  id: string
  code: string
  name: string
  building: string | null
  floor: number | null
  capacity: number
  type: string
  equipment: any[]
  is_available: boolean
  created_at: string
  updated_at: string
  photos?: any[]
}

export default function ClassroomsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedClassroom, setSelectedClassroom] = useState<any>(null)
  const [occupancyData, setOccupancyData] = useState<any[]>([])
  const [occupancyDialogOpen, setOccupancyDialogOpen] = useState(false)
  const [selectedClassroomOccupancy, setSelectedClassroomOccupancy] = useState<any>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedClassroomDetails, setSelectedClassroomDetails] = useState<Classroom | null>(null)
  
  // Filtres
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all')
  const [selectedFloor, setSelectedFloor] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  
  const supabase = createClient()

  useEffect(() => {
    loadClassrooms()
    loadOccupancyData()
  }, [])

  const loadClassrooms = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('classrooms')
        .select('*')
        .order('building', { ascending: true })
        .order('code', { ascending: true })

      if (error) throw error
      setClassrooms(data || [])
    } catch (error) {
      console.error('Error loading classrooms:', error)
      // Generate mock data if table doesn't exist
      setClassrooms([
        {
          id: '1',
          code: 'A101',
          name: 'Aula Informàtica 1',
          building: 'Edifici A',
          floor: 1,
          capacity: 30,
          type: 'informatica',
          equipment: ['Ordinadors', 'Projector', 'Pissarra Digital'],
          is_available: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          code: 'A102',
          name: 'Aula Teoria 1',
          building: 'Edifici A',
          floor: 1,
          capacity: 60,
          type: 'teorica',
          equipment: ['Projector', 'Pissarra'],
          is_available: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          code: 'B201',
          name: 'Aula Informàtica 2',
          building: 'Edifici B',
          floor: 2,
          capacity: 25,
          type: 'informatica',
          equipment: ['Ordinadors', 'Projector', 'Impressora 3D'],
          is_available: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '4',
          code: 'C301',
          name: 'Sala de Conferències',
          building: 'Edifici C',
          floor: 3,
          capacity: 100,
          type: 'polivalent',
          equipment: ['Projector', 'Sistema de So', 'Videoconferència'],
          is_available: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const loadOccupancyData = async () => {
    try {
      const occupancy = await getAllClassroomsOccupancyData()
      setOccupancyData(occupancy)
    } catch (error) {
      console.error('Error loading occupancy data:', error)
    }
  }

  const getClassroomOccupancy = (classroomId: string) => {
    const classroom = occupancyData.find(item => item.classroomId === classroomId)
    if (!classroom || !classroom.semesters || classroom.semesters.length === 0) {
      return { morning: 0, afternoon: 0 }
    }
    
    // Calculate average occupancy across all semesters
    let totalMorning = 0
    let totalAfternoon = 0
    
    classroom.semesters.forEach((semester: any) => {
      totalMorning += semester.classroomOccupancy.morningOccupancy
      totalAfternoon += semester.classroomOccupancy.afternoonOccupancy
    })
    
    return {
      morning: Math.round(totalMorning / classroom.semesters.length),
      afternoon: Math.round(totalAfternoon / classroom.semesters.length)
    }
  }

  const handleViewOccupancy = (classroom: Classroom) => {
    const occupancy = occupancyData.find(item => item.classroomId === classroom.id)
    setSelectedClassroomOccupancy({
      classroom,
      occupancy
    })
    setOccupancyDialogOpen(true)
  }

  const handleViewDetails = (classroom: Classroom) => {
    setSelectedClassroomDetails(classroom)
    setDetailsDialogOpen(true)
  }

  const handleEdit = (classroom: any) => {
    setSelectedClassroom(classroom)
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setSelectedClassroom(null)
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Estàs segur que vols eliminar aquesta aula?')) return

    try {
      const { error } = await supabase
        .from('classrooms')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      toast.success('Aula eliminada correctament')
      loadClassrooms()
    } catch (error: any) {
      console.error('Error deleting classroom:', error)
      toast.error(error.message || 'Error al eliminar l\'aula')
    }
  }

  // Helper function to format building names
  const formatBuildingName = (building: string | null): string => {
    if (!building) return '-'
    if (building === 'G') return 'Edifici Granada'
    return building
  }
  
  // Get unique values for filters
  const buildings = [...new Set(classrooms.map(c => c.building).filter(Boolean))].sort()
  const floors = [...new Set(classrooms.map(c => c.floor).filter(f => f !== null))].sort((a, b) => a! - b!)
  const types = [...new Set(classrooms.map(c => c.type))].sort()
  
  const filteredClassrooms = classrooms.filter(classroom => {
    // Text search
    const search = searchTerm.toLowerCase()
    const matchesSearch = classroom.name.toLowerCase().includes(search) || 
           classroom.code.toLowerCase().includes(search) ||
           (classroom.building?.toLowerCase().includes(search) || false)
    
    // Filter by building
    const matchesBuilding = selectedBuilding === 'all' || classroom.building === selectedBuilding
    
    // Filter by floor
    const matchesFloor = selectedFloor === 'all' || classroom.floor?.toString() === selectedFloor
    
    // Filter by type
    const matchesType = selectedType === 'all' || classroom.type === selectedType
    
    return matchesSearch && matchesBuilding && matchesFloor && matchesType
  })

  const totalCapacity = classrooms.reduce((sum, classroom) => sum + classroom.capacity, 0)
  const polivalentCount = classrooms.filter(c => c.type === CLASSROOM_TYPES.POLIVALENT).length
  const tallerCount = classrooms.filter(c => c.type === CLASSROOM_TYPES.TALLER).length
  const informaticaCount = classrooms.filter(c => c.type === CLASSROOM_TYPES.INFORMATICA).length
  const projectesCount = classrooms.filter(c => c.type === CLASSROOM_TYPES.PROJECTES).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aules</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona les aules i espais del centre
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Aula
        </Button>
      </div>

      {/* Compact Summary */}
      <Card className="bg-white border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Resum d'Aules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Total</p>
              </div>
              <p className="text-xl font-bold">{classrooms.length}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Capacitat</p>
              </div>
              <p className="text-xl font-bold">{totalCapacity}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Polivalent</p>
              </div>
              <p className="text-xl font-bold">{polivalentCount}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Taller</p>
              </div>
              <p className="text-xl font-bold">{tallerCount}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Informàtica</p>
              </div>
              <p className="text-xl font-bold">{informaticaCount}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Projectes</p>
              </div>
              <p className="text-xl font-bold">{projectesCount}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Seminari</p>
              </div>
              <p className="text-xl font-bold">{classrooms.filter(c => c.type === CLASSROOM_TYPES.SEMINARI).length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and list */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <div className="space-y-4">
            <div>
              <CardTitle>Llistat d'Aules</CardTitle>
              <CardDescription>
                {filteredClassrooms.length} de {classrooms.length} aules trobades
              </CardDescription>
            </div>
            
            {/* Search */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cercar per nom, codi o edifici..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Filters */}
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {/* Edifici Filter */}
                <div className="space-y-2">
                  <Label className="text-xs">Edifici</Label>
                  <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tots els edificis</SelectItem>
                      {buildings.map(building => (
                        <SelectItem key={building || 'null'} value={building || 'null'}>
                          {formatBuildingName(building)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Pis Filter */}
                <div className="space-y-2">
                  <Label className="text-xs">Pis</Label>
                  <Select value={selectedFloor} onValueChange={setSelectedFloor}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tots els pisos</SelectItem>
                      {floors.map(floor => (
                        <SelectItem key={floor} value={floor.toString()}>
                          Pis {floor}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tipus Filter */}
                <div className="space-y-2">
                  <Label className="text-xs">Tipus d'aula</Label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tots els tipus</SelectItem>
                      {Object.entries(CLASSROOM_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Clear filters button */}
              {(selectedBuilding !== 'all' || selectedFloor !== 'all' || selectedType !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedBuilding('all')
                    setSelectedFloor('all')
                    setSelectedType('all')
                  }}
                  className="h-8 px-2 lg:px-3"
                >
                  Esborrar filtres
                  <X className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-48"></div>
                <div className="h-32 bg-muted rounded w-96"></div>
              </div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Edifici</TableHead>
                    <TableHead>Planta</TableHead>
                    <TableHead>Capacitat</TableHead>
                    <TableHead>Tipus</TableHead>
                    <TableHead>Ocupació</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClassrooms.map((classroom) => (
                    <TableRow key={classroom.id} className="group">
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {classroom.name}
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-1">
                            <button
                              onClick={() => handleViewDetails(classroom)}
                              className="text-xs text-primary hover:underline"
                            >
                              Veure
                            </button>
                            <span className="text-xs text-muted-foreground">|</span>
                            <button
                              onClick={() => handleEdit(classroom)}
                              className="text-xs text-primary hover:underline"
                            >
                              Editar
                            </button>
                            <span className="text-xs text-muted-foreground">|</span>
                            <button
                              onClick={() => handleDelete(classroom.id)}
                              className="text-xs text-destructive hover:underline"
                            >
                              Esborrar
                            </button>
                            <span className="text-xs text-muted-foreground">|</span>
                            <button
                              onClick={() => handleViewOccupancy(classroom)}
                              className="text-xs text-primary hover:underline"
                            >
                              Ocupació
                            </button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatBuildingName(classroom.building)}</TableCell>
                      <TableCell>{classroom.floor ?? '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span>{classroom.capacity}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={classroom.type === CLASSROOM_TYPES.INFORMATICA ? 'default' : 'secondary'}>
                          {classroom.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          {(() => {
                            const occupancy = getClassroomOccupancy(classroom.id)
                            return (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs">Matí:</span>
                                  <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full ${
                                        occupancy.morning > 75 ? 'bg-red-500' :
                                        occupancy.morning > 50 ? 'bg-yellow-500' :
                                        occupancy.morning > 25 ? 'bg-green-500' :
                                        'bg-gray-300'
                                      }`}
                                      style={{ width: `${occupancy.morning}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-medium">{occupancy.morning}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs">Tarda:</span>
                                  <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full ${
                                        occupancy.afternoon > 75 ? 'bg-red-500' :
                                        occupancy.afternoon > 50 ? 'bg-yellow-500' :
                                        occupancy.afternoon > 25 ? 'bg-green-500' :
                                        'bg-gray-300'
                                      }`}
                                      style={{ width: `${occupancy.afternoon}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-medium">{occupancy.afternoon}%</span>
                                </div>
                              </>
                            )
                          })()}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <ClassroomDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        classroom={selectedClassroom}
        onSuccess={loadClassrooms}
      />

      {/* Occupancy Dialog */}
      <ClassroomOccupancyDialog
        open={occupancyDialogOpen}
        onOpenChange={setOccupancyDialogOpen}
        data={selectedClassroomOccupancy}
      />

      {/* Details Dialog */}
      <ClassroomDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        classroom={selectedClassroomDetails}
      />
    </div>
  )
}