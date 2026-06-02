'use client'

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { CLASSROOM_TYPE_LABELS } from '@/lib/constants/classroom-types'

interface Classroom {
  id: string
  code: string
  name: string
  type: string
  building: string | null
  floor: number | null
}

interface QRCodeSheetProps {
  classrooms: Classroom[]
}

const NO_BUILDING = 'Sense edifici'

const getTypeColor = (type: string) => {
  switch (type) {
    case 'Taller': return 'bg-orange-100 text-orange-800 border-orange-300'
    case 'Informàtica': return 'bg-blue-100 text-blue-800 border-blue-300'
    case 'Polivalent': return 'bg-green-100 text-green-800 border-green-300'
    case 'Projectes': return 'bg-purple-100 text-purple-800 border-purple-300'
    case 'Seminari': return 'bg-pink-100 text-pink-800 border-pink-300'
    default: return 'bg-gray-100 text-gray-800 border-gray-300'
  }
}

const floorLabel = (floor: number | null): string => {
  if (floor === null || floor === undefined) return ''
  if (floor === 0) return 'Planta baixa'
  return `Planta ${floor}`
}

// Ordenació natural per codi d'aula (P1.2 abans que P1.10)
const naturalCompare = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })

export function QRCodeSheet({ classrooms }: QRCodeSheetProps) {
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  // Agrupar per edifici → planta, ordenat
  const buildings = Array.from(
    new Set(classrooms.map(c => c.building || NO_BUILDING))
  ).sort(naturalCompare)

  const grouped = buildings.map(building => {
    const inBuilding = classrooms.filter(
      c => (c.building || NO_BUILDING) === building
    )
    const floors = Array.from(
      new Set(inBuilding.map(c => (c.floor ?? null)))
    ).sort((a, b) => (a ?? -Infinity) - (b ?? -Infinity))

    return {
      building,
      floors: floors.map(floor => ({
        floor,
        rooms: inBuilding
          .filter(c => (c.floor ?? null) === floor)
          .sort((a, b) => naturalCompare(a.code, b.code))
      }))
    }
  })

  return (
    <>
      {/* Toolbar — no s'imprimeix */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Codis QR de les aules</h1>
          <p className="text-muted-foreground">
            {classrooms.length} aules · ordenades per edifici, planta i aula. Cada QR
            enllaça amb la fitxa pública de l'aula.
          </p>
        </div>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
      </div>

      {/* Àrea imprimible */}
      <div id="qr-print-area">
        {grouped.map(({ building, floors }) => (
          <section key={building} className="qr-building mb-8">
            <h2 className="text-xl font-bold mb-4 pb-1 border-b-2 border-foreground/20">
              {building}
            </h2>

            {floors.map(({ floor, rooms }) => (
              <div key={`${building}-${floor}`} className="mb-6">
                {floorLabel(floor) && (
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    {floorLabel(floor)}
                  </h3>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {rooms.map(room => (
                    <div
                      key={room.id}
                      className="qr-card flex flex-col items-center text-center border-2 border-foreground/30 rounded-lg p-4 bg-white"
                    >
                      <div className="text-2xl font-bold leading-tight">
                        {room.name}
                      </div>
                      <div className="text-sm text-muted-foreground mb-1">
                        {room.code}
                      </div>
                      <div
                        className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border mb-3 ${getTypeColor(room.type)}`}
                      >
                        {CLASSROOM_TYPE_LABELS[room.type as keyof typeof CLASSROOM_TYPE_LABELS] || room.type}
                      </div>
                      <div className="bg-white p-2 border rounded">
                        {origin && (
                          <QRCodeSVG
                            value={`${origin}/directori-aules/${encodeURIComponent(room.code)}`}
                            size={140}
                            level="M"
                            marginSize={0}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>

      {/* Estils d'impressió: amaga el chrome de l'app i evita talls dins les targetes */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #qr-print-area,
          #qr-print-area * {
            visibility: visible;
          }
          #qr-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .qr-card {
            break-inside: avoid;
          }
          .qr-building {
            break-before: page;
          }
          .qr-building:first-child {
            break-before: avoid;
          }
        }
        @page {
          margin: 1cm;
        }
      `}</style>
    </>
  )
}
