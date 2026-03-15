export interface Documento {
  id?: string
  patientId: string
  clinicId: string
  nombre: string
  url: string
  tipo?: string
  professionalId?: string
  createdAt: Date
}