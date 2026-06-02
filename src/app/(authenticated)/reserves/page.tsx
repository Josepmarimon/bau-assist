import { ReservationRequest } from '@/components/reservations/reservation-request'

export const metadata = {
  title: 'Reserves d\'espais',
}

export default function ReservesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reserves d&apos;espais</h1>
        <p className="text-muted-foreground">
          Sol·licita una aula lliure per a una activitat lectiva. La reserva queda
          pendent fins que administració l&apos;aprova.
        </p>
      </div>
      <ReservationRequest />
    </div>
  )
}
