import { EvolucionDocument } from './evoluciones.service'

export interface TratamientoHistorial {
  treatmentId: string
  sesiones: EvolucionDocument[]
  expandido: boolean
  activo: boolean
  fechaInicio?: any
  diagnostico?: string
}

export function agruparSesionesPorTratamiento(
  evoluciones: EvolucionDocument[],
  tratamientoActivoId?: string,
  diagnostico?: string
): TratamientoHistorial[] {

  const mapa = new Map<string, TratamientoHistorial>()

  for (const sesion of evoluciones) {

    const treatmentId = sesion.treatmentId || 'sin-tratamiento'

    if (!mapa.has(treatmentId)) {

      mapa.set(treatmentId, {
        treatmentId,
        sesiones: [],
        expandido: false,
        activo: treatmentId === tratamientoActivoId,
        fechaInicio: null,
        diagnostico
      })

    }

    const tratamiento = mapa.get(treatmentId)!

    tratamiento.sesiones.push(sesion)

    if (sesion.tipoEvolucion === 'initial') {
      tratamiento.fechaInicio = sesion.createdAt
    }

  }

  const tratamientos = Array.from(mapa.values())

  tratamientos.forEach(tratamiento => {

    tratamiento.sesiones.sort((a, b) => {

      const aNum = a.sessionNumber ?? 0
      const bNum = b.sessionNumber ?? 0

      return aNum - bNum

    })

  })

  tratamientos.sort((a, b) => {

    const aTime = a.fechaInicio?.toMillis?.() ?? 0
    const bTime = b.fechaInicio?.toMillis?.() ?? 0

    return bTime - aTime

  })

  return tratamientos

}