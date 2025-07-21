'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { SoftwareDialog } from '@/components/software/software-dialog'
import { LicenseAlerts } from '@/components/software/license-alerts'
import { ClassroomAssignmentDialog } from '@/components/software/classroom-assignment-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Package,
  Search,
  Plus,
  Download,
  AlertCircle,
  CheckCircle,
  Edit,
  Trash2,
  HardDrive,
  Monitor
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Classroom {
  id: string
  name: string
  code: string
  installed_date?: string
}

interface Subject {
  id: string
  code: string
  name: string
  year: number
  semester: string
}

interface Software {
  id: string
  name: string
  version?: string
  category: string
  license_type: string
  operating_systems?: string[]
  license_model?: string
  license_quantity?: number
  license_cost?: number
  last_renewal_date?: string
  expiry_date?: string
  renewal_reminder_days?: number
  provider_name?: string
  provider_email?: string
  provider_phone?: string
  notes?: string
  created_at: string
  updated_at: string
  classrooms?: Classroom[]
  classroom_count?: number
  subjects?: Subject[]
  total_licenses_assigned?: number
}

const getCategoryName = (category: string): string => {
  const categoryMap: Record<string, string> = {
    'general': 'General',
    '3d_modeling': 'Modelat 3D',
    'design': 'Disseny',
    'programming': 'Programació',
    'web_development': 'Desenvolupament Web',
    'cad': 'CAD',
    'audio': 'Àudio',
    'render': 'Render',
    'patronatge': 'Patronatge'
  }
  return categoryMap[category] || category
}

const getLicenseTypeName = (licenseType: string): string => {
  const licenseMap: Record<string, string> = {
    'free': 'Gratuïta',
    'paid': 'De pagament',
    'educational': 'Educativa',
    'subscription': 'Subscripció',
    'proprietary': 'Propietària',
    'open_source': 'Codi obert'
  }
  return licenseMap[licenseType] || licenseType
}

export default function SoftwarePage() {
  const [software, setSoftware] = useState<Software[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedLicenseType, setSelectedLicenseType] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedSoftware, setSelectedSoftware] = useState<Software | undefined>(undefined)
  const [classroomDialogOpen, setClassroomDialogOpen] = useState(false)
  const [selectedSoftwareForClassroom, setSelectedSoftwareForClassroom] = useState<Software | undefined>(undefined)
  const supabase = createClient()

  useEffect(() => {
    loadSoftware()
  }, [])

  const loadSoftware = async () => {
    try {
      setLoading(true)
      
      // Try basic query first
      const { data, error } = await supabase
        .from('software')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      
      // Debug: log unique license types
      if (data) {
        const uniqueLicenseTypes = [...new Set(data.map(sw => sw.license_type))]
        console.log('Unique license types in database:', uniqueLicenseTypes)
      }
      
      // Load subjects that require each software
      const { data: subjectSoftwareData, error: subjectError } = await supabase
        .from('subject_software')
        .select(`
          software_id,
          subject:subjects!subject_id (
            id,
            code,
            name,
            year,
            semester
          )
        `)
      
      if (!subjectError && subjectSoftwareData) {
        // Group subjects by software_id
        const subjectsBySoftware = subjectSoftwareData.reduce((acc, item) => {
          if (!acc[item.software_id]) {
            acc[item.software_id] = []
          }
          if (item.subject) {
            acc[item.software_id].push(item.subject)
          }
          return acc
        }, {} as Record<string, Subject[]>)
        
        // Add subjects to software data
        data?.forEach(sw => {
          sw.subjects = subjectsBySoftware[sw.id] || []
        })
      }
      
      // Load classroom assignments and calculate total licenses
      const { data: classroomSoftwareData, error: classroomError } = await supabase
        .from('classroom_software')
        .select(`
          software_id,
          licenses,
          classrooms:classroom_id (
            id,
            name,
            code
          )
        `)
      
      if (!classroomError && classroomSoftwareData) {
        // Group by software_id and calculate total licenses
        const classroomsBySoftware = classroomSoftwareData.reduce((acc, item) => {
          if (!acc[item.software_id]) {
            acc[item.software_id] = {
              classrooms: [],
              totalLicenses: 0
            }
          }
          if (item.classrooms) {
            acc[item.software_id].classrooms.push(item.classrooms)
            acc[item.software_id].totalLicenses += item.licenses || 1
          }
          return acc
        }, {} as Record<string, { classrooms: Classroom[], totalLicenses: number }>)
        
        // Add classroom data and total licenses to software
        data?.forEach(sw => {
          const classroomData = classroomsBySoftware[sw.id] || { classrooms: [], totalLicenses: 0 }
          sw.classrooms = classroomData.classrooms
          sw.classroom_count = classroomData.classrooms.length
          sw.total_licenses_assigned = classroomData.totalLicenses
        })
      }
      
      setSoftware(data || [])
    } finally {
      setLoading(false)
    }
  }

  const filteredSoftware = software.filter(sw => {
    const search = searchTerm.toLowerCase()
    const matchesSearch = sw.name.toLowerCase().includes(search) || 
                         sw.category.toLowerCase().includes(search)
    
    const matchesCategory = selectedCategory === 'all' || sw.category === selectedCategory
    const matchesLicenseType = selectedLicenseType === 'all' || sw.license_type === selectedLicenseType
    
    return matchesSearch && matchesCategory && matchesLicenseType
  })

  const totalSoftware = software.length
  const freeCount = software.filter(sw => sw.license_type === 'free').length
  const paidCount = software.filter(sw => sw.license_type === 'paid').length
  const categoryCount = [...new Set(software.map(sw => sw.category))].length

  return (
    <div className="space-y-6">
      {/* License Alerts */}
      <LicenseAlerts />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Programari</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona les llicències de programari del centre
          </p>
        </div>
        <Button onClick={() => {
          setSelectedSoftware(undefined)
          setDialogOpen(true)
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Afegir Programari
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Programari
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSoftware}</div>
            <p className="text-xs text-muted-foreground">
              Aplicacions gestionades
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Programari Gratuït
            </CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{freeCount}</div>
            <p className="text-xs text-muted-foreground">
              Llicències gratuïtes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Programari de Pagament
            </CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paidCount}</div>
            <p className="text-xs text-muted-foreground">
              Llicències comercials
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Categories
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categoryCount}</div>
            <p className="text-xs text-muted-foreground">
              Tipus diferents
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and list */}
      <Card>
        {/* <CardHeader>
          <CardTitle>Llistat de Programari</CardTitle>
          <CardDescription>
            Cerca i gestiona les llicències de programari
          </CardDescription>
        </CardHeader> */}
        <CardContent>
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cercar per nom..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Totes les categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Totes les categories</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="3d_modeling">Modelat 3D</SelectItem>
                  <SelectItem value="design">Disseny</SelectItem>
                  <SelectItem value="programming">Programació</SelectItem>
                  <SelectItem value="web_development">Desenvolupament Web</SelectItem>
                  <SelectItem value="cad">CAD</SelectItem>
                  <SelectItem value="audio">Àudio</SelectItem>
                  <SelectItem value="render">Render</SelectItem>
                  <SelectItem value="patronatge">Patronatge</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedLicenseType} onValueChange={setSelectedLicenseType}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Tots els tipus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tots els tipus</SelectItem>
                  <SelectItem value="free">Gratuïta</SelectItem>
                  <SelectItem value="paid">De pagament</SelectItem>
                  <SelectItem value="educational">Educativa</SelectItem>
                  <SelectItem value="subscription">Subscripció</SelectItem>
                  <SelectItem value="proprietary">Propietària</SelectItem>
                  <SelectItem value="open_source">Codi obert</SelectItem>
                </SelectContent>
              </Select>

              {(selectedCategory !== 'all' || selectedLicenseType !== 'all') && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSelectedCategory('all')
                    setSelectedLicenseType('all')
                  }}
                >
                  Netejar filtres
                </Button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-48"></div>
                <div className="h-32 bg-muted rounded w-96"></div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSoftware.length !== software.length && (
                <div className="text-sm text-muted-foreground">
                  Mostrant {filteredSoftware.length} de {software.length} programes
                </div>
              )}
              <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Llicència</TableHead>
                    <TableHead>Nº Llicències</TableHead>
                    <TableHead>Aules Instal·lades</TableHead>
                    <TableHead>Assignatures</TableHead>
                    <TableHead className="text-right">Accions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSoftware.map((sw) => {
                    const isExpired = sw.expiry_date && new Date(sw.expiry_date) < new Date()
                    const isExpiringSoon = sw.expiry_date && !isExpired && 
                      new Date(sw.expiry_date) <= new Date(Date.now() + (sw.renewal_reminder_days || 30) * 24 * 60 * 60 * 1000)
                    
                    return (
                      <TableRow key={sw.id}>
                        <TableCell className="font-medium">
                          <div>
                            {sw.name}
                            {sw.version && (
                              <span className="text-sm text-muted-foreground ml-2">
                                v{sw.version}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {getCategoryName(sw.category)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={sw.license_type === 'free' ? 'default' : 'outline'}>
                              {getLicenseTypeName(sw.license_type)}
                            </Badge>
                            {sw.license_quantity && sw.license_quantity > 1 && (
                              <span className="text-sm text-muted-foreground">
                                x{sw.license_quantity}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {sw.license_quantity ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1">
                                <span className="font-medium">{sw.license_quantity}</span>
                                {sw.license_type !== 'free' && (
                                  <span className="text-sm text-muted-foreground">
                                    {sw.license_quantity === 1 ? 'llicència' : 'llicències'}
                                  </span>
                                )}
                              </div>
                              {sw.total_licenses_assigned !== undefined && sw.total_licenses_assigned > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  ({sw.total_licenses_assigned} assignades)
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              {sw.license_type === 'free' ? 'Il·limitades' : '-'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {sw.classrooms && sw.classrooms.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {sw.classrooms.slice(0, 3).map((classroom) => (
                                <Badge key={classroom.id} variant="secondary" className="text-xs">
                                  {classroom.code || classroom.name}
                                </Badge>
                              ))}
                              {sw.classrooms.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{sw.classrooms.length - 3} més
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Cap aula assignada
                            </span>
                          )}
                      </TableCell>
                      <TableCell>
                        {sw.subjects && sw.subjects.length > 0 ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex flex-wrap gap-1 cursor-help">
                                  {sw.subjects.slice(0, 2).map((subject) => (
                                    <Badge key={subject.id} variant="outline" className="text-xs">
                                      {subject.code}
                                    </Badge>
                                  ))}
                                  {sw.subjects.length > 2 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{sw.subjects.length - 2} més
                                    </Badge>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm">
                                <div className="space-y-1">
                                  <p className="font-semibold text-sm mb-2">Assignatures que requereixen aquest software:</p>
                                  {sw.subjects.map((subject) => (
                                    <div key={subject.id} className="text-sm">
                                      <span className="font-medium">{subject.code}</span> - {subject.name}
                                      <span className="text-muted-foreground ml-1">
                                        ({subject.year}r curs, {subject.semester})
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Cap assignatura
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => {
                                    setSelectedSoftwareForClassroom(sw)
                                    setClassroomDialogOpen(true)
                                  }}
                                >
                                  <Monitor className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Assignar a aules</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setSelectedSoftware(sw)
                              setDialogOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <SoftwareDialog 
        software={selectedSoftware}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={loadSoftware}
      />

      {selectedSoftwareForClassroom && (
        <ClassroomAssignmentDialog
          open={classroomDialogOpen}
          onOpenChange={setClassroomDialogOpen}
          onSuccess={loadSoftware}
          software={selectedSoftwareForClassroom}
        />
      )}
    </div>
  )
}