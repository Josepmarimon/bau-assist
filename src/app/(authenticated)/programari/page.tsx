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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  Package,
  Search,
  Plus,
  Download,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  Edit,
  Trash2,
  HardDrive,
  Monitor,
  Printer,
  ExternalLink,
  XCircle,
  AlertTriangle,
  BookOpen,
  GraduationCap,
  Clock,
  Zap
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
  license_url?: string
}

interface SoftwareSummary {
  id: string
  name: string
  version?: string
  license_type: string
  total_licenses?: number
  licenses_assigned: number
  licenses_available?: number
  classroom_count: number
  subject_count: number
  program_count: number
  license_status: string
  expiry_date?: string
}

interface ClassroomRequirement {
  classroom_id: string
  classroom_code: string
  classroom_name: string
  building: string
  software_id: string
  software_name: string
  software_version?: string
  license_type: string
  is_installed: boolean
  licenses_in_classroom?: number
  required_by_subjects: string
  requiring_subject_count: number
  is_required: boolean
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
    'paid': 'De pagament',
    'educational': 'Educativa',
    'free': 'Gratuïta',
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [softwareToDelete, setSoftwareToDelete] = useState<Software | null>(null)
  const [activeTab, setActiveTab] = useState('software')
  const [softwareSummary, setSoftwareSummary] = useState<SoftwareSummary[]>([])
  const [missingRequirements, setMissingRequirements] = useState<ClassroomRequirement[]>([])
  const [autoAssigning, setAutoAssigning] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadSoftware()
    loadDashboardData()
  }, [])

  const handleDeleteSoftware = async () => {
    if (!softwareToDelete) return
    
    try {
      const { error } = await supabase
        .from('software')
        .delete()
        .eq('id', softwareToDelete.id)
      
      if (error) throw error
      
      // Reload software list
      await loadSoftware()
      setDeleteDialogOpen(false)
      setSoftwareToDelete(null)
    } catch (error) {
      console.error('Error deleting software:', error)
    }
  }

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
          if (item.subject && !Array.isArray(item.subject)) {
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
          if (item.classrooms && !Array.isArray(item.classrooms)) {
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

  const loadDashboardData = async () => {
    try {
      // Load software summary
      const { data: summaryData, error: summaryError } = await supabase
        .from('software_license_summary')
        .select('*')
        .order('name')

      if (summaryError) throw summaryError
      setSoftwareSummary(summaryData || [])

      // Load missing software requirements
      const { data: requirementsData, error: requirementsError } = await supabase
        .from('classroom_software_requirements')
        .select('*')
        .eq('is_installed', false)
        .eq('is_required', true)
        .order('classroom_code')

      if (requirementsError) throw requirementsError
      setMissingRequirements(requirementsData || [])

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
  }

  const handleAutoAssign = async (classroomId: string) => {
    setAutoAssigning(true)
    try {
      const { data, error } = await supabase
        .rpc('assign_required_software_to_classroom', {
          p_classroom_id: classroomId,
          p_override_licenses: false
        })

      if (error) throw error

      // Parse JSON response
      const results = data || []
      const successCount = results.filter((r: any) => r.success).length || 0
      const failedCount = results.filter((r: any) => !r.success).length || 0

      if (successCount > 0) {
        alert(`S'han assignat ${successCount} programes correctament${failedCount > 0 ? ` (${failedCount} no assignats per falta de llicències)` : ''}`)
      } else if (failedCount > 0) {
        alert(`No s'ha pogut assignar cap programa (${failedCount} sense llicències disponibles)`)
      } else {
        alert('No hi ha programari pendent d\'assignar a aquesta aula')
      }

      // Reload data
      await loadSoftware()
      await loadDashboardData()
    } catch (error: any) {
      console.error('Error auto-assigning software:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        fullError: error
      })
      alert(`Error en assignar software automàticament: ${error?.message || 'Error desconegut'}`)
    } finally {
      setAutoAssigning(false)
    }
  }

  const handleAutoAssignAll = async () => {
    setAutoAssigning(true)
    try {
      const classroomIds = Object.keys(missingByClassroom)
      let totalSuccess = 0
      let totalFailed = 0
      let errors = []

      for (const classroomId of classroomIds) {
        try {
          const { data, error } = await supabase
            .rpc('assign_required_software_to_classroom', {
              p_classroom_id: classroomId,
              p_override_licenses: false
            })

          if (error) {
            errors.push(`${missingByClassroom[classroomId].classroom_code}: ${error.message}`)
          } else {
            totalSuccess += data?.filter((r: any) => r.success).length || 0
            totalFailed += data?.filter((r: any) => !r.success).length || 0
          }
        } catch (err) {
          errors.push(`${missingByClassroom[classroomId].classroom_code}: Error inesperat`)
        }
      }

      // Show results
      let message = ''
      if (totalSuccess > 0) {
        message += `S'han assignat ${totalSuccess} programes correctament.`
      }
      if (totalFailed > 0) {
        message += ` ${totalFailed} no s'han pogut assignar per falta de llicències.`
      }
      if (errors.length > 0) {
        message += `\n\nErrors:\n${errors.join('\n')}`
      }

      alert(message || 'No s\'ha pogut assignar cap programa.')

      // Reload data
      await loadSoftware()
      await loadDashboardData()
    } catch (error) {
      console.error('Error auto-assigning all software:', error)
      alert('Error en assignar software automàticament')
    } finally {
      setAutoAssigning(false)
    }
  }

  const getLicenseStatusIcon = (status: string) => {
    switch (status) {
      case 'expired':
        return <XCircle className="h-4 w-4 text-destructive" />
      case 'expiring_soon':
        return <AlertTriangle className="h-4 w-4 text-warning" />
      default:
        return <CheckCircle2 className="h-4 w-4 text-success" />
    }
  }

  const getLicenseStatusBadge = (status: string) => {
    switch (status) {
      case 'expired':
        return <Badge variant="destructive">Expirada</Badge>
      case 'expiring_soon':
        return <Badge variant="secondary" className="bg-yellow-100">Expira aviat</Badge>
      default:
        return <Badge variant="default">Activa</Badge>
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
  
  // Dashboard stats
  const expiredLicenses = softwareSummary.filter(s => s.license_status === 'expired').length
  const expiringSoon = softwareSummary.filter(s => s.license_status === 'expiring_soon').length
  const overAllocated = softwareSummary.filter(s => 
    s.total_licenses && s.licenses_assigned > s.total_licenses
  ).length
  const missingCount = missingRequirements.length

  // Group missing requirements by classroom
  const missingByClassroom = missingRequirements.reduce((acc, req) => {
    if (!acc[req.classroom_id]) {
      acc[req.classroom_id] = {
        classroom_code: req.classroom_code,
        classroom_name: req.classroom_name,
        building: req.building,
        software: []
      }
    }
    acc[req.classroom_id].software.push(req)
    return acc
  }, {} as Record<string, any>)

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
        <div className="flex gap-2">
          <Link href="/programari/software-print">
            <Button variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir Software
            </Button>
          </Link>
          <Button onClick={() => {
            setSelectedSoftware(undefined)
            setDialogOpen(true)
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Afegir Programari
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
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
              Llicències Expirades
            </CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{expiredLicenses}</div>
            <p className="text-xs text-muted-foreground">
              Necessiten renovació
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Expiren Aviat
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{expiringSoon}</div>
            <p className="text-xs text-muted-foreground">
              Pròxims 30 dies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sobreassignades
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overAllocated}</div>
            <p className="text-xs text-muted-foreground">
              Més llicències assignades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Software Faltant
            </CardTitle>
            <Monitor className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{missingCount}</div>
            <p className="text-xs text-muted-foreground">
              Requeriments pendents
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="software">Llistat Software</TabsTrigger>
          <TabsTrigger value="overview">Vista General</TabsTrigger>
          <TabsTrigger value="licenses">Gestió Llicències</TabsTrigger>
          <TabsTrigger value="missing">Software Faltant</TabsTrigger>
        </TabsList>

        {/* Software List Tab */}
        <TabsContent value="software" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
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
                  <SelectItem value="paid">De pagament</SelectItem>
                  <SelectItem value="educational">Educativa</SelectItem>
                  <SelectItem value="free">Gratuïta</SelectItem>
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
                    <TableHead>Assignatures</TableHead>
                    <TableHead>Aules Instal·lades</TableHead>
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
                          {sw.subjects && sw.subjects.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {sw.subjects.slice(0, 2).map((subject) => (
                                <Badge key={subject.id} variant="outline" className="text-xs">
                                  {subject.code}
                                </Badge>
                              ))}
                              {sw.subjects.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{sw.subjects.length - 2} més
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Cap assignatura
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
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {sw.license_url && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => window.open(sw.license_url, '_blank')}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Descarregar llicències</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
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
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setSoftwareToDelete(sw)
                              setDeleteDialogOpen(true)
                            }}
                          >
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
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resum de Llicències</CardTitle>
              <CardDescription>
                Estat actual de totes les llicències de software
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Software</TableHead>
                    <TableHead>Tipus</TableHead>
                    <TableHead>Estat</TableHead>
                    <TableHead>Llicències</TableHead>
                    <TableHead>Ús</TableHead>
                    <TableHead>Aules</TableHead>
                    <TableHead>Assignatures</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {softwareSummary.map((software) => {
                    const usagePercent = software.total_licenses 
                      ? (software.licenses_assigned / software.total_licenses) * 100
                      : 0

                    return (
                      <TableRow key={software.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {getLicenseStatusIcon(software.license_status)}
                            {software.name}
                            {software.version && (
                              <span className="text-sm text-muted-foreground">
                                v{software.version}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {software.license_type === 'free' ? 'Gratuïta' : 'Pagament'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getLicenseStatusBadge(software.license_status)}
                        </TableCell>
                        <TableCell>
                          {software.license_type === 'free' ? (
                            <span className="text-muted-foreground">Il·limitades</span>
                          ) : software.total_licenses ? (
                            <div className="space-y-1">
                              <div className="text-sm">
                                {software.licenses_assigned} / {software.total_licenses}
                              </div>
                              <Progress 
                                value={usagePercent} 
                                className="h-2"
                                style={{
                                  backgroundColor: usagePercent > 100 ? '#fee2e2' : undefined
                                }}
                              />
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No definit</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {usagePercent > 100 && (
                            <Badge variant="destructive" className="text-xs">
                              Sobreassignat
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {software.classroom_count}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {software.subject_count}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* License Management Tab */}
        <TabsContent value="licenses" className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Les llicències amb problemes es mostren primer. Revisa les llicències expirades i sobreassignades.
            </AlertDescription>
          </Alert>

          {softwareSummary
            .filter(s => s.license_status !== 'active' || 
                       (s.total_licenses && s.licenses_assigned > s.total_licenses))
            .map((software) => (
              <Card key={software.id} className="border-warning">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {software.name}
                      {getLicenseStatusBadge(software.license_status)}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    {software.license_status === 'expired' && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Llicència expirada el {new Date(software.expiry_date!).toLocaleDateString('ca-ES')}
                        </AlertDescription>
                      </Alert>
                    )}
                    {software.license_status === 'expiring_soon' && (
                      <Alert className="border-yellow-200 bg-yellow-50">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription>
                          Llicència expira el {new Date(software.expiry_date!).toLocaleDateString('ca-ES')}
                        </AlertDescription>
                      </Alert>
                    )}
                    {software.total_licenses && software.licenses_assigned > software.total_licenses && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          S'han assignat {software.licenses_assigned} llicències però només n'hi ha {software.total_licenses} disponibles
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        {/* Missing Software Tab */}
        <TabsContent value="missing" className="space-y-4">
          <div className="flex items-center justify-between">
            <Alert className="flex-1">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Software requerit per assignatures però no instal·lat a les aules corresponents.
              </AlertDescription>
            </Alert>
            {missingRequirements.length > 0 && (
              <Button
                onClick={handleAutoAssignAll}
                disabled={autoAssigning}
                variant="default"
                className="ml-4"
              >
                <Zap className="h-4 w-4 mr-2" />
                Assignar tot el software faltant
              </Button>
            )}
          </div>

          {Object.entries(missingByClassroom).map(([classroomId, data]) => (
            <Card key={classroomId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {data.classroom_code} - {data.classroom_name}
                    </CardTitle>
                    <CardDescription>
                      {data.building} · {data.software.length} programes faltants
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => handleAutoAssign(classroomId)}
                    disabled={autoAssigning}
                    size="sm"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Assignar automàticament
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Software</TableHead>
                      <TableHead>Tipus Llicència</TableHead>
                      <TableHead>Requerit per</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.software.map((req: ClassroomRequirement) => (
                      <TableRow key={`${classroomId}-${req.software_id}`}>
                        <TableCell className="font-medium">
                          {req.software_name}
                          {req.software_version && (
                            <span className="text-sm text-muted-foreground ml-2">
                              v{req.software_version}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {req.license_type === 'free' ? 'Gratuïta' : 'Pagament'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {req.required_by_subjects}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}

          {Object.keys(missingByClassroom).length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <CheckCircle2 className="h-12 w-12 text-success mb-2" />
                <p className="text-muted-foreground">
                  Tot el software requerit està instal·lat!
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <SoftwareDialog 
        software={selectedSoftware}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => {
          loadSoftware()
          loadDashboardData()
        }}
      />

      {selectedSoftwareForClassroom && (
        <ClassroomAssignmentDialog
          open={classroomDialogOpen}
          onOpenChange={setClassroomDialogOpen}
          onSuccess={() => {
          loadSoftware()
          loadDashboardData()
        }}
          software={selectedSoftwareForClassroom}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estàs segur?</AlertDialogTitle>
            <AlertDialogDescription>
              Aquesta acció no es pot desfer. S'eliminarà permanentment el programari
              {softwareToDelete && (
                <span className="font-semibold"> "{softwareToDelete.name}"</span>
              )} i totes les seves assignacions a aules.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSoftwareToDelete(null)}>
              Cancel·lar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSoftware}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}