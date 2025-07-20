'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useState } from 'react'

export default function TestPage() {
  const [count, setCount] = useState(0)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Pàgina de Test</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Test de Components</CardTitle>
          <CardDescription>Verificant que els botons i components funcionen correctament</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={() => setCount(count + 1)}>
              Incrementar: {count}
            </Button>
            <Button variant="secondary" onClick={() => setCount(count - 1)}>
              Decrementar
            </Button>
            <Button variant="outline" onClick={() => setCount(0)}>
              Reset
            </Button>
            <Button variant="destructive" onClick={() => alert('Alerta!')}>
              Alerta
            </Button>
          </div>
          
          <div className="p-4 bg-muted rounded-lg">
            <p>Contador actual: <span className="font-bold">{count}</span></p>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-primary text-primary-foreground rounded">Primary</div>
            <div className="p-4 bg-secondary text-secondary-foreground rounded">Secondary</div>
            <div className="p-4 bg-accent text-accent-foreground rounded">Accent</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}