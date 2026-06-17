import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export default function AdminExportPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Exportar a WordPress</CardTitle>
          <CardDescription>
            Genera un CSV compatible amb <strong>WP All Import</strong> amb tots els TFGs lliurats.
            Configura WP All Import perquè:
            <ul className="list-disc ml-5 mt-2 text-sm space-y-1">
              <li>
                Importi cap a <code>posts</code> amb el <code>tax_input[tfg]</code> com a taxonomia.
              </li>
              <li>
                Per als camps de fitxers (<code>imatge_representativa</code>, <code>memoria</code>,
                <code>imatges_projecte</code>, etc.), activi <em>&quot;Download images and files&quot;</em>
                des de l&apos;URL.
              </li>
              <li>
                Mapegi cada columna al <em>Custom Field</em> amb el mateix nom (els <code>meta_key</code>
                són idèntics als d&apos;ACF, incloent <code>format_de_memoria_del_projecte:</code> amb dos punts).
              </li>
            </ul>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 rounded border border-amber-300 bg-amber-50 text-amber-900 text-sm">
            Els enllaços als fitxers són URLs signades vàlides 7 dies. Si trigues més, torna a generar el CSV.
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <a href="/api/tfg/export" download>
                <Download className="h-4 w-4 mr-1" /> Descarregar CSV (enviats + revisats)
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="/api/tfg/export?include_reviewed=false" download>
                <Download className="h-4 w-4 mr-1" /> Només enviats
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
