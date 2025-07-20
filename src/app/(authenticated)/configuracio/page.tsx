'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Settings,
  User,
  Bell,
  Shield,
  Database,
  Palette,
  Globe,
  Mail,
  Save,
  Building
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function SettingsPage() {
  const [generalSettings, setGeneralSettings] = useState({
    centerName: 'BAU - Centre Universitari d\'Arts i Disseny',
    academicYear: '2024-2025',
    language: 'ca',
    timezone: 'Europe/Madrid',
    dateFormat: 'DD/MM/YYYY'
  })

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    assignmentReminders: true,
    scheduleChanges: true,
    systemUpdates: false,
    reportGeneration: true
  })

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: '30',
    passwordExpiry: '90',
    minPasswordLength: '8'
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuració</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona la configuració del sistema
          </p>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notificacions</TabsTrigger>
          <TabsTrigger value="security">Seguretat</TabsTrigger>
          <TabsTrigger value="database">Base de Dades</TabsTrigger>
          <TabsTrigger value="appearance">Aparença</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Informació del Centre
              </CardTitle>
              <CardDescription>
                Configura la informació bàsica del centre educatiu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="centerName">Nom del Centre</Label>
                <Input
                  id="centerName"
                  value={generalSettings.centerName}
                  onChange={(e) => setGeneralSettings({...generalSettings, centerName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="academicYear">Curs Acadèmic</Label>
                <Input
                  id="academicYear"
                  value={generalSettings.academicYear}
                  onChange={(e) => setGeneralSettings({...generalSettings, academicYear: e.target.value})}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="language">Idioma</Label>
                  <Select value={generalSettings.language} onValueChange={(value) => setGeneralSettings({...generalSettings, language: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ca">Català</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Zona Horària</Label>
                  <Select value={generalSettings.timezone} onValueChange={(value) => setGeneralSettings({...generalSettings, timezone: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Europe/Madrid">Europe/Madrid</SelectItem>
                      <SelectItem value="Europe/London">Europe/London</SelectItem>
                      <SelectItem value="America/New_York">America/New_York</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="pt-4">
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Canvis
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Preferències de Notificacions
              </CardTitle>
              <CardDescription>
                Configura com i quan vols rebre notificacions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificacions per Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Rebre notificacions al correu electrònic
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, emailNotifications: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Recordatoris de Tasques</Label>
                    <p className="text-sm text-muted-foreground">
                      Avisos sobre tasques pròximes a vèncer
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.assignmentReminders}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, assignmentReminders: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Canvis d'Horari</Label>
                    <p className="text-sm text-muted-foreground">
                      Notificacions sobre modificacions d'horari
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.scheduleChanges}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, scheduleChanges: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Actualitzacions del Sistema</Label>
                    <p className="text-sm text-muted-foreground">
                      Informació sobre manteniment i actualitzacions
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.systemUpdates}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, systemUpdates: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Generació d'Informes</Label>
                    <p className="text-sm text-muted-foreground">
                      Avisos quan els informes estiguin llestos
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.reportGeneration}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, reportGeneration: checked})}
                  />
                </div>
              </div>
              <div className="pt-4">
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Preferències
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Configuració de Seguretat
              </CardTitle>
              <CardDescription>
                Gestiona la seguretat i accés al sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Autenticació de Dos Factors</Label>
                    <p className="text-sm text-muted-foreground">
                      Requereix un segon factor d'autenticació
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings.twoFactorAuth}
                    onCheckedChange={(checked) => setSecuritySettings({...securitySettings, twoFactorAuth: checked})}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Temps d'Expiració de Sessió (minuts)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => setSecuritySettings({...securitySettings, sessionTimeout: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passwordExpiry">Caducitat de Contrasenya (dies)</Label>
                    <Input
                      id="passwordExpiry"
                      type="number"
                      value={securitySettings.passwordExpiry}
                      onChange={(e) => setSecuritySettings({...securitySettings, passwordExpiry: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minPasswordLength">Longitud Mínima de Contrasenya</Label>
                  <Input
                    id="minPasswordLength"
                    type="number"
                    value={securitySettings.minPasswordLength}
                    onChange={(e) => setSecuritySettings({...securitySettings, minPasswordLength: e.target.value})}
                  />
                </div>
              </div>
              <div className="pt-4">
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Actualitzar Seguretat
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Settings */}
        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Base de Dades
              </CardTitle>
              <CardDescription>
                Informació i manteniment de la base de dades
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Mida de la Base de Dades</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">245 MB</div>
                    <p className="text-xs text-muted-foreground">de 5 GB disponibles</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Última Còpia de Seguretat</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">Avui</div>
                    <p className="text-xs text-muted-foreground">03:00 AM</p>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-4">
                <Button variant="outline" className="w-full">
                  <Database className="h-4 w-4 mr-2" />
                  Fer Còpia de Seguretat Ara
                </Button>
                <Button variant="outline" className="w-full">
                  <Database className="h-4 w-4 mr-2" />
                  Restaurar des de Còpia
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Aparença
              </CardTitle>
              <CardDescription>
                Personalitza l'aspecte de l'aplicació
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tema</Label>
                <div className="grid grid-cols-3 gap-4">
                  <Button variant="outline" className="justify-start">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-white border"></div>
                      Clar
                    </div>
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-black"></div>
                      Fosc
                    </div>
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-gradient-to-r from-white to-black"></div>
                      Sistema
                    </div>
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Color Principal</Label>
                <div className="flex gap-2">
                  <div className="h-10 w-10 rounded-md bg-blue-500 cursor-pointer"></div>
                  <div className="h-10 w-10 rounded-md bg-green-500 cursor-pointer"></div>
                  <div className="h-10 w-10 rounded-md bg-purple-500 cursor-pointer"></div>
                  <div className="h-10 w-10 rounded-md bg-orange-500 cursor-pointer"></div>
                  <div className="h-10 w-10 rounded-md bg-red-500 cursor-pointer"></div>
                </div>
              </div>
              <div className="pt-4">
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Aplicar Canvis
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}