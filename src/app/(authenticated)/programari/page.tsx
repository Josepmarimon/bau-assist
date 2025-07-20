'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { 
  Package,
  Search,
  Plus,
  Download,
  AlertCircle,
  CheckCircle,
  Edit,
  Trash2,
  HardDrive
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Software {
  id: number
  name: string
  version: string
  vendor: string
  category: string
  license_type: string
  license_count: number
  licenses_used: number
  expiry_date: string | null
  status: 'active' | 'expired' | 'warning'
  created_at: string
}

export default function SoftwarePage() {
  const [software, setSoftware] = useState<Software[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadSoftware()
  }, [])

  const loadSoftware = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('software')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setSoftware(data || [])
    } catch (error) {
      console.error('Error loading software:', error)
      // Generate mock data if table doesn't exist
      setSoftware([
        {
          id: 1,
          name: 'Microsoft Office 365',
          version: '2024',
          vendor: 'Microsoft',
          category: 'Productivitat',
          license_type: 'Subscripció',
          license_count: 100,
          licenses_used: 85,
          expiry_date: '2025-06-30',
          status: 'active',
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          name: 'Visual Studio Code',
          version: '1.85',
          vendor: 'Microsoft',
          category: 'Desenvolupament',
          license_type: 'Gratuït',
          license_count: -1,
          licenses_used: 0,
          expiry_date: null,
          status: 'active',
          created_at: new Date().toISOString()
        },
        {
          id: 3,
          name: 'Adobe Creative Cloud',
          version: '2024',
          vendor: 'Adobe',
          category: 'Disseny',
          license_type: 'Subscripció',
          license_count: 30,
          licenses_used: 28,
          expiry_date: '2024-12-31',
          status: 'warning',
          created_at: new Date().toISOString()
        },
        {
          id: 4,
          name: 'IntelliJ IDEA',
          version: '2024.1',
          vendor: 'JetBrains',
          category: 'Desenvolupament',
          license_type: 'Educacional',
          license_count: 50,
          licenses_used: 35,
          expiry_date: '2025-08-31',
          status: 'active',
          created_at: new Date().toISOString()
        },
        {
          id: 5,
          name: 'MATLAB',
          version: 'R2024a',
          vendor: 'MathWorks',
          category: 'Enginyeria',
          license_type: 'Campus',
          license_count: 500,
          licenses_used: 120,
          expiry_date: '2025-09-30',
          status: 'active',
          created_at: new Date().toISOString()
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const filteredSoftware = software.filter(sw => {
    const search = searchTerm.toLowerCase()
    return sw.name.toLowerCase().includes(search) || 
           sw.vendor.toLowerCase().includes(search) ||
           sw.category.toLowerCase().includes(search)
  })

  const totalLicenses = software.reduce((sum, sw) => sum + (sw.license_count > 0 ? sw.license_count : 0), 0)
  const usedLicenses = software.reduce((sum, sw) => sum + sw.licenses_used, 0)
  const expiringSoon = software.filter(sw => sw.status === 'warning').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Programari</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona les llicències de programari del centre
          </p>
        </div>
        <Button>
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
            <div className="text-2xl font-bold">{software.length}</div>
            <p className="text-xs text-muted-foreground">
              Aplicacions gestionades
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Llicències Totals
            </CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLicenses}</div>
            <p className="text-xs text-muted-foreground">
              Llicències disponibles
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              En Ús
            </CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usedLicenses}</div>
            <p className="text-xs text-muted-foreground">
              Llicències utilitzades
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pròximes a Expirar
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiringSoon}</div>
            <p className="text-xs text-muted-foreground">
              Necessiten renovació
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and list */}
      <Card>
        <CardHeader>
          <CardTitle>Llistat de Programari</CardTitle>
          <CardDescription>
            Cerca i gestiona les llicències de programari
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cercar per nom, proveïdor o categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Versió</TableHead>
                    <TableHead>Proveïdor</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Llicències</TableHead>
                    <TableHead>Expira</TableHead>
                    <TableHead>Estat</TableHead>
                    <TableHead className="text-right">Accions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSoftware.map((sw) => (
                    <TableRow key={sw.id}>
                      <TableCell className="font-medium">
                        {sw.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {sw.version}
                        </Badge>
                      </TableCell>
                      <TableCell>{sw.vendor}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {sw.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {sw.license_count === -1 ? (
                          <span className="text-muted-foreground">Il·limitades</span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{sw.licenses_used}</span>
                            <span className="text-muted-foreground">/ {sw.license_count}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {sw.expiry_date ? (
                          <span className={sw.status === 'warning' ? 'text-yellow-600' : ''}>
                            {new Date(sw.expiry_date).toLocaleDateString('ca-ES')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {sw.status === 'active' && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">Actiu</span>
                          </div>
                        )}
                        {sw.status === 'warning' && (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm">Atenció</span>
                          </div>
                        )}
                        {sw.status === 'expired' && (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <span className="text-sm">Expirat</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
    </div>
  )
}