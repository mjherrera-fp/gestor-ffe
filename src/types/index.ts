export interface Profesor {
  id?: number;
  nombre: string;
  apellidos: string;
  nif: string;
  email: string;
  telefono: string;
}

export interface CentroEducativo {
  id?: number;
  profesorId: number;
  nombre: string;
  ciudad: string;
  telefono: string;
  email: string;
}

export interface DetalleAcademico {
  id?: number;
  centroId: number;
  ciclo: string;
  codigo: string;
  nivel: string;
  grado: string;
  regimen: string;
  codigoGrupo: string;
  resultadosAprendizaje?: ResultadoAprendizaje[];
}

export interface ResultadoAprendizaje {
  id: string;
  modulo: string;
  codigo: string;
  ra: string;
  nombre: string;
  impartidoEmpresa: boolean;
  actividadFormativa?: string;
}

export interface Curso {
  id?: number;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  archivado: number; // 0 or 1
  festivos?: string[];
}

export interface HorarioDia {
  inicio: string;
  fin: string;
  horas: number;
}

export interface HorarioSemanal {
  lunes: HorarioDia;
  martes: HorarioDia;
  miercoles: HorarioDia;
  jueves: HorarioDia;
  viernes: HorarioDia;
  sabado: HorarioDia;
  domingo: HorarioDia;
}

// 1. ENUMS (Lo que se guarda en Base de Datos y se usa en la lógica)
export enum RelacionEstado {
  PENDIENTE_ENVIAR_EMPRESA = 'PENDIENTE_ENVIAR_EMPRESA',
  PENDIENTE_FIRMA_EMPRESA = 'PENDIENTE_FIRMA_EMPRESA',
  PENDIENTE_ENVIAR_DIRECTOR = 'PENDIENTE_ENVIAR_DIRECTOR',
  PENDIENTE_FIRMA_DIRECTOR = 'PENDIENTE_FIRMA_DIRECTOR',
  COMPLETADO = 'COMPLETADO'
}

export enum PlanFormativoEstado {
  PENDIENTE_ENVIAR_ESTUDIANTE = 'PENDIENTE_ENVIAR_ESTUDIANTE',
  PENDIENTE_FIRMAR_ESTUDIANTE = 'PENDIENTE_FIRMAR_ESTUDIANTE',
  PENDIENTE_ENVIAR_EMPRESA = 'PENDIENTE_ENVIAR_EMPRESA',
  PENDIENTE_FIRMA_EMPRESA = 'PENDIENTE_FIRMA_EMPRESA',
  PENDIENTE_FIRMA_TUTOR = 'PENDIENTE_FIRMA_TUTOR',
  COMPLETADO = 'COMPLETADO'
}

// 2. DICCIONARIOS DE TEXTO (Lo que ve el usuario en la Interfaz)
export const RelacionEstadoLabels: Record<RelacionEstado, string> = {
  [RelacionEstado.PENDIENTE_ENVIAR_EMPRESA]: 'Pendiente enviar a empresa',
  [RelacionEstado.PENDIENTE_FIRMA_EMPRESA]: 'Pendiente firma empresa',
  [RelacionEstado.PENDIENTE_ENVIAR_DIRECTOR]: 'Pendiente enviar a director',
  [RelacionEstado.PENDIENTE_FIRMA_DIRECTOR]: 'Pendiente firma director',
  [RelacionEstado.COMPLETADO]: 'Completado'
};

export const PlanFormativoEstadoLabels: Record<PlanFormativoEstado, string> = {
  [PlanFormativoEstado.PENDIENTE_ENVIAR_ESTUDIANTE]: 'Pendiente enviar a estudiante',
  [PlanFormativoEstado.PENDIENTE_FIRMAR_ESTUDIANTE]: 'Pendiente firma estudiante',
  [PlanFormativoEstado.PENDIENTE_ENVIAR_EMPRESA]: 'Pendiente enviar a empresa',
  [PlanFormativoEstado.PENDIENTE_FIRMA_EMPRESA]: 'Pendiente firma empresa',
  [PlanFormativoEstado.PENDIENTE_FIRMA_TUTOR]: 'Pendiente firma tutor',
  [PlanFormativoEstado.COMPLETADO]: 'Completado'
};

export interface RelacionAlumno {
  id?: number;
  alumnosRelacion: {
    alumnoId: number;
    totalHoras: number;
    fechaInicio?: string;
    fechaFin?: string;
  }[];
  convenioId: number;
  numRelacion: string;
  tutorEmpresaId: number;
  fechaInicio: string;
  fechaFin: string;
  horario: HorarioSemanal;
  totalHoras: number;
  estado: RelacionEstado;
  estadoPlanFormativo: PlanFormativoEstado;
}

export interface Alumno {
  id?: number;
  nombre: string;
  apellidos: string;
  dni: string;
  numSS: string;
  tlfn: string;
  emailEduca: string;
  emailPersonal: string;
  fechaNacimiento: string;
  cvPath?: string;
  cursoId: number;
  detalleAcademicoId?: number;
  horasPendientesFFE?: number;
}

export interface Empresa {
  id?: number;
  nombre: string;
  direccion: string;
  ciudad: string;
  cif: string;
  email: string;
  tlfn: string;
}

export interface TutorEmpresa {
  id?: number;
  empresaId: number;
  nombre: string;
  apellidos: string;
  nif: string;
  email: string;
  tlfn: string;
}

export enum ConvenioEstado {
  PENDIENTE_ENVIAR = 'Pendiente de enviar a empresa',
  PENDIENTE_FIRMA_EMPRESA = 'Pendiente de firmar por empresa',
  PENDIENTE_ENVIAR_DIRECTOR = 'Pendiente de enviar al director',
  PENDIENTE_FIRMA_DIRECTOR = 'Pendiente de firmar por dirección',
  COMPLETADO = 'Completado'
}

export interface Convenio {
  id?: number;
  numConvenio: string;
  fechaConvenio: string;
  estado: ConvenioEstado;
  empresaId: number;
  cursoId: number;
  centroId: number;
}

export interface InteresAlumnoEmpresa {
  alumnoId: number;
  empresaId: number;
  interesado: 'alumno' | 'empresa';
}
