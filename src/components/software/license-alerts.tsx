'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, X } from 'lucide-react'
import { toast } from 'sonner'

interface ExpiringLicense {
  id: string
  name: string
  version?: string
  expiry_date: string
  days_until_expiry: number
  status: string
  provider_name?: string
  provider_email?: string
}

export function LicenseAlerts() {
  const [expiringLicenses, setExpiringLicenses] = useState<ExpiringLicense[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [migrationPending, setMigrationPending] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    checkAndLoad()
  }, [])

  const checkAndLoad = async () => {
    // First check if migration is applied
    try {
      const { error } = await supabase
        .from('software')
        .select('expiry_date')
        .limit(1)
      
      if (error) {
        // Migration not applied, disable feature
        setMigrationPending(true)
        setLoading(false)
        return
      }
      
      // Migration applied, start loading licenses
      loadExpiringLicenses()
      
      // Check for expiring licenses every hour
      const interval = setInterval(loadExpiringLicenses, 60 * 60 * 1000)
      return () => clearInterval(interval)
    } catch {
      setMigrationPending(true)
      setLoading(false)
    }
  }

  const loadExpiringLicenses = async () => {
    try {
      // Try to use the RPC function
      const { data, error } = await supabase
        .rpc('get_licenses_requiring_attention')

      if (error) {
        // Function doesn't exist, migrations not applied yet
        console.info('License expiry features will be available after database migration.')
        setLoading(false)
        return
      }

      // Filter out dismissed licenses for this session
      const activeLicenses = (data || []).filter(
        (license: any) => !dismissed.has(license.id)
      )
      
      setExpiringLicenses(activeLicenses)
      
      // Show toast notification if there are new expiring licenses
      if (activeLicenses.length > 0) {
        const expiredCount = activeLicenses.filter((l: any) => l.status === 'expired').length
        const expiringCount = activeLicenses.filter((l: any) => l.status === 'expiring_soon').length
        
        if (expiredCount > 0) {
          toast.error(`${expiredCount} llicències han expirat!`)
        } else if (expiringCount > 0) {
          toast.warning(`${expiringCount} llicències estan a punt d'expirar`)
        }
      }
    } catch (error) {
      console.error('Error loading expiring licenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const dismissAlert = (licenseId: string) => {
    setDismissed(prev => new Set(prev).add(licenseId))
    setExpiringLicenses(prev => prev.filter(l => l.id !== licenseId))
  }

  if (loading || migrationPending || expiringLicenses.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      {expiringLicenses.map((license) => (
        <Alert
          key={license.id}
          variant={license.status === 'expired' ? 'destructive' : 'default'}
          className="relative"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {license.status === 'expired' 
              ? `${license.name} - Llicència expirada!`
              : `${license.name} - Llicència a punt d'expirar`
            }
          </AlertTitle>
          <AlertDescription>
            {license.status === 'expired' ? (
              <div className="space-y-2">
                <p>
                  La llicència va expirar el {new Date(license.expiry_date).toLocaleDateString('ca-ES')}
                </p>
                {license.provider_email && (
                  <p>
                    Contacte: <a href={`mailto:${license.provider_email}`} className="underline">
                      {license.provider_email}
                    </a>
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p>
                  Expira en {license.days_until_expiry} dies 
                  ({new Date(license.expiry_date).toLocaleDateString('ca-ES')})
                </p>
                {license.provider_name && (
                  <p>Proveïdor: {license.provider_name}</p>
                )}
                {license.provider_email && (
                  <p>
                    Contacte: <a href={`mailto:${license.provider_email}`} className="underline">
                      {license.provider_email}
                    </a>
                  </p>
                )}
              </div>
            )}
          </AlertDescription>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6"
            onClick={() => dismissAlert(license.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      ))}
    </div>
  )
}