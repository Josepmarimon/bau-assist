'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Save, Eye, Download } from 'lucide-react'
import { toast } from 'sonner'

interface ScheduleEntry {
  groupName: string
  subjectName: string
  teachers: string[]
  classrooms: string[]
  dayOfWeek: number
  startTime: string
  endTime: string
  semester: number
}

const scheduleImages = [
  // 2nd year Design - remaining pages
  { path: '/horaris/Grau en Disseny/Segon curs/HorarisGDIS_2n_2526_Página_06.jpg', name: '2n Disseny - Pàgina 6', processed: false },
  { path: '/horaris/Grau en Disseny/Segon curs/HorarisGDIS_2n_2526_Página_07.jpg', name: '2n Disseny - Pàgina 7', processed: false },
  { path: '/horaris/Grau en Disseny/Segon curs/HorarisGDIS_2n_2526_Página_08.jpg', name: '2n Disseny - Pàgina 8', processed: false },
  { path: '/horaris/Grau en Disseny/Segon curs/HorarisGDIS_2n_2526_Página_09.jpg', name: '2n Disseny - Pàgina 9', processed: false },
  { path: '/horaris/Grau en Disseny/Segon curs/HorarisGDIS_2n_2526_Página_10.jpg', name: '2n Disseny - Pàgina 10', processed: false },
  { path: '/horaris/Grau en Disseny/Segon curs/HorarisGDIS_2n_2526_Página_11.jpg', name: '2n Disseny - Pàgina 11', processed: false },
  { path: '/horaris/Grau en Disseny/Segon curs/HorarisGDIS_2n_2526_Página_12.jpg', name: '2n Disseny - Pàgina 12', processed: false },
  { path: '/horaris/Grau en Disseny/Segon curs/HorarisGDIS_2n_2526_Página_13.jpg', name: '2n Disseny - Pàgina 13', processed: false },
  { path: '/horaris/Grau en Disseny/Segon curs/HorarisGDIS_2n_2526_Página_14.jpg', name: '2n Disseny - Pàgina 14', processed: false },
  { path: '/horaris/Grau en Disseny/Segon curs/HorarisGDIS_2n_2526_Página_15.jpg', name: '2n Disseny - Pàgina 15', processed: false },
  // 3rd year Design
  { path: '/horaris/Grau en Disseny/Tercer curs/HorarisGDIS_3r_2526_Página_2.jpg', name: '3r Disseny - Pàgina 2', processed: false },
  { path: '/horaris/Grau en Disseny/Tercer curs/HorarisGDIS_3r_2526_Página_3.jpg', name: '3r Disseny - Pàgina 3', processed: false },
  { path: '/horaris/Grau en Disseny/Tercer curs/HorarisGDIS_3r_2526_Página_4.jpg', name: '3r Disseny - Pàgina 4', processed: false },
  { path: '/horaris/Grau en Disseny/Tercer curs/HorarisGDIS_3r_2526_Página_5.jpg', name: '3r Disseny - Pàgina 5', processed: false },
  { path: '/horaris/Grau en Disseny/Tercer curs/HorarisGDIS_3r_2526_Página_6.jpg', name: '3r Disseny - Pàgina 6', processed: false },
  { path: '/horaris/Grau en Disseny/Tercer curs/HorarisGDIS_3r_2526_Página_7.jpg', name: '3r Disseny - Pàgina 7', processed: false },
  { path: '/horaris/Grau en Disseny/Tercer curs/HorarisGDIS_3r_2526_Página_8.jpg', name: '3r Disseny - Pàgina 8', processed: false },
  { path: '/horaris/Grau en Disseny/Tercer curs/HorarisGDIS_3r_2526_Página_9.jpg', name: '3r Disseny - Pàgina 9', processed: false },
  // 4th year Design
  { path: '/horaris/Grau en Disseny/Quart Curs/HorarisGDIS_4t_2526_Página_2.jpg', name: '4t Disseny - Pàgina 2', processed: false },
  { path: '/horaris/Grau en Disseny/Quart Curs/HorarisGDIS_4t_2526_Página_3.jpg', name: '4t Disseny - Pàgina 3', processed: false },
  { path: '/horaris/Grau en Disseny/Quart Curs/HorarisGDIS_4t_2526_Página_4.jpg', name: '4t Disseny - Pàgina 4', processed: false },
  { path: '/horaris/Grau en Disseny/Quart Curs/HorarisGDIS_4t_2526_Página_5.jpg', name: '4t Disseny - Pàgina 5', processed: false },
  { path: '/horaris/Grau en Disseny/Quart Curs/HorarisGDIS_4t_2526_Página_6.jpg', name: '4t Disseny - Pàgina 6', processed: false },
  { path: '/horaris/Grau en Disseny/Quart Curs/HorarisGDIS_4t_2526_Página_7.jpg', name: '4t Disseny - Pàgina 7', processed: false },
  { path: '/horaris/Grau en Disseny/Quart Curs/HorarisGDIS_4t_2526_Página_8.jpg', name: '4t Disseny - Pàgina 8', processed: false },
]

const daysOfWeek = [
  { value: 1, label: 'Dilluns' },
  { value: 2, label: 'Dimarts' },
  { value: 3, label: 'Dimecres' },
  { value: 4, label: 'Dijous' },
  { value: 5, label: 'Divendres' },
]

export default function ScheduleImportPage() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [entries, setEntries] = useState<ScheduleEntry[]>([])
  const [currentEntry, setCurrentEntry] = useState<ScheduleEntry>({
    groupName: '',
    subjectName: '',
    teachers: [''],
    classrooms: [''],
    dayOfWeek: 1,
    startTime: '',
    endTime: '',
    semester: 1,
  })
  const [allExtractedData, setAllExtractedData] = useState<any>({})

  // Load saved progress
  useEffect(() => {
    const saved = localStorage.getItem('schedule-import-progress')
    if (saved) {
      const data = JSON.parse(saved)
      setAllExtractedData(data)
    }
  }, [])

  const currentImage = scheduleImages[currentImageIndex]

  const handleAddEntry = () => {
    if (!currentEntry.groupName || !currentEntry.subjectName) {
      toast.error('Grup i assignatura són obligatoris')
      return
    }

    setEntries([...entries, currentEntry])
    
    // Reset form but keep group name and semester
    setCurrentEntry({
      groupName: currentEntry.groupName,
      subjectName: '',
      teachers: [''],
      classrooms: [''],
      dayOfWeek: currentEntry.dayOfWeek,
      startTime: '',
      endTime: '',
      semester: currentEntry.semester,
    })

    toast.success('Entrada afegida')
  }

  const handleSavePage = () => {
    if (entries.length === 0) {
      toast.error('No hi ha entrades per guardar')
      return
    }

    const newData = {
      ...allExtractedData,
      [currentImage.path]: entries
    }
    
    setAllExtractedData(newData)
    localStorage.setItem('schedule-import-progress', JSON.stringify(newData))
    
    toast.success(`Guardat: ${entries.length} entrades per ${currentImage.name}`)
  }

  const handleExportAll = () => {
    const dataStr = JSON.stringify(allExtractedData, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = 'extracted-schedules.json'
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const handleAddTeacher = () => {
    setCurrentEntry({
      ...currentEntry,
      teachers: [...currentEntry.teachers, '']
    })
  }

  const handleAddClassroom = () => {
    setCurrentEntry({
      ...currentEntry,
      classrooms: [...currentEntry.classrooms, '']
    })
  }

  const updateTeacher = (index: number, value: string) => {
    const newTeachers = [...currentEntry.teachers]
    newTeachers[index] = value
    setCurrentEntry({ ...currentEntry, teachers: newTeachers })
  }

  const updateClassroom = (index: number, value: string) => {
    const newClassrooms = [...currentEntry.classrooms]
    newClassrooms[index] = value
    setCurrentEntry({ ...currentEntry, classrooms: newClassrooms })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importar Horaris</h1>
          <p className="text-muted-foreground mt-2">
            Processa les imatges dels horaris per importar-les al sistema
          </p>
        </div>
        <Button onClick={handleExportAll} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar tot
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Image viewer */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{currentImage.name}</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}
                  disabled={currentImageIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {currentImageIndex + 1} / {scheduleImages.length}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentImageIndex(Math.min(scheduleImages.length - 1, currentImageIndex + 1))}
                  disabled={currentImageIndex === scheduleImages.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription>
              {allExtractedData[currentImage.path] ? (
                <Badge variant="default">Processat - {allExtractedData[currentImage.path].length} entrades</Badge>
              ) : (
                <Badge variant="secondary">Pendent</Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <img 
                src={currentImage.path} 
                alt={currentImage.name}
                className="w-full h-auto"
              />
            </div>
          </CardContent>
        </Card>

        {/* Data entry form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Introduir Dades</CardTitle>
            <CardDescription>
              Afegeix les assignatures que veus a la imatge
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Grup</Label>
                <Input
                  placeholder="ex: 2n Matí M6"
                  value={currentEntry.groupName}
                  onChange={(e) => setCurrentEntry({ ...currentEntry, groupName: e.target.value })}
                />
              </div>
              <div>
                <Label>Semestre</Label>
                <Select
                  value={currentEntry.semester.toString()}
                  onValueChange={(value) => setCurrentEntry({ ...currentEntry, semester: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Semestre 1</SelectItem>
                    <SelectItem value="2">Semestre 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Assignatura</Label>
              <Input
                placeholder="ex: Projectes de Disseny II"
                value={currentEntry.subjectName}
                onChange={(e) => setCurrentEntry({ ...currentEntry, subjectName: e.target.value })}
              />
            </div>

            <div>
              <Label>Professor(s)</Label>
              {currentEntry.teachers.map((teacher, index) => (
                <Input
                  key={index}
                  placeholder="Nom del professor"
                  value={teacher}
                  onChange={(e) => updateTeacher(index, e.target.value)}
                  className="mt-2"
                />
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddTeacher}
                className="mt-2"
              >
                + Afegir professor
              </Button>
            </div>

            <div>
              <Label>Aula(es)</Label>
              {currentEntry.classrooms.map((classroom, index) => (
                <Input
                  key={index}
                  placeholder="ex: P.1.2"
                  value={classroom}
                  onChange={(e) => updateClassroom(index, e.target.value)}
                  className="mt-2"
                />
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddClassroom}
                className="mt-2"
              >
                + Afegir aula
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Dia</Label>
                <Select
                  value={currentEntry.dayOfWeek.toString()}
                  onValueChange={(value) => setCurrentEntry({ ...currentEntry, dayOfWeek: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {daysOfWeek.map(day => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Hora inici</Label>
                <Input
                  type="time"
                  value={currentEntry.startTime}
                  onChange={(e) => setCurrentEntry({ ...currentEntry, startTime: e.target.value })}
                />
              </div>
              <div>
                <Label>Hora fi</Label>
                <Input
                  type="time"
                  value={currentEntry.endTime}
                  onChange={(e) => setCurrentEntry({ ...currentEntry, endTime: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddEntry} className="flex-1">
                Afegir entrada
              </Button>
              <Button onClick={handleSavePage} variant="outline">
                <Save className="h-4 w-4 mr-2" />
                Guardar pàgina
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current entries */}
      {entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Entrades actuals ({entries.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {entries.map((entry, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{entry.subjectName}</div>
                    <div className="text-sm text-muted-foreground">
                      {entry.groupName} • {daysOfWeek.find(d => d.value === entry.dayOfWeek)?.label} {entry.startTime}-{entry.endTime}
                    </div>
                    <div className="text-sm">
                      Professor(s): {entry.teachers.filter(t => t).join(', ')} | 
                      Aula(es): {entry.classrooms.filter(c => c).join(', ')}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEntries(entries.filter((_, i) => i !== index))}
                  >
                    Eliminar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}