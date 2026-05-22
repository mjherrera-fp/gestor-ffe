export interface Profesor {
  id?: number;
  nombre: string;
  apellidos: string;
  nif: string;
  email: string;
  telefono: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_pass?: string;
  smtp_email?: string;
  smtp_secure?: boolean;
  send_delay_ms?: number;
}

export interface CentroEducativo {
  id?: number;
  profesorId: number;
  nombre: string;
  ciudad: string;
  telefono: string;
  email: string;
  festivos?: string[];
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
  tutorias?: string[];
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
  relacionId?: number;
  detalleAcademicoId: number;
  totalHorasFFE: number;
  fechaInicio: string;
  fechaFin: string;
  estadoPlanFormativo: PlanFormativoEstado;
  estadoSeguimiento: SeguimientoEstado;
  estadoValoracion: ValoracionEstado;
}

export interface RelacionAlumno {
  id?: number;
  alumnos: Alumno[];
  convenioId: number;
  numRelacion: string;
  empresa: Empresa;
  tutorEmpresaId: number;
  horario: HorarioSemanal;
  estado: RelacionEstado;
  estadoPlanFormativo: PlanFormativoEstado;
  estadoSeguimiento: SeguimientoEstado;
  estadoValoracion: ValoracionEstado;
  firmaRelacion?: FirmaTipo;
  firmaPlanFormativo?: FirmaTipo;
  firmaSeguimiento?: FirmaTipo;
  firmaValoracion?: FirmaTipo;
}

export interface Empresa {
  id?: number;
  nombre: string;
  direccion: string;
  ciudad: string;
  cif: string;
  email: string;
  tlfn: string;
  comentarios?: string;
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

export interface EmpresaEstadistica {
  id?: number;
  empresaId: number;
  curso: string;
  numAlumnos: number;
  contratados: number;
  valoracion?: number;
}

export interface Convenio {
  id?: number;
  numConvenio: string;
  fechaConvenio: string;
  estado: ConvenioEstado;
  empresaId: number;
  cursoId: number;
  centroId: number;
  tipoFirma?: FirmaTipo;
}

export interface InteresAlumnoEmpresa {
  alumnoId: number;
  empresaId: number;
  interesado: 'alumno' | 'empresa';
}

// 1. ENUMS (Lo que se guarda en Base de Datos y se usa en la lógica)
export enum FirmaTipo {
  SIN_ASIGNAR = 'SIN_ASIGNAR',
  DIGITAL = 'DIGITAL',
  MANUAL = 'MANUAL',
}

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

export enum ConvenioEstado {
  PENDIENTE_ENVIAR = 'PENDIENTE_ENVIAR',
  PENDIENTE_FIRMA_EMPRESA = 'PENDIENTE_FIRMA_EMPRESA',
  PENDIENTE_ENVIAR_DIRECTOR = 'PENDIENTE_ENVIAR_DIRECTOR',
  PENDIENTE_FIRMA_DIRECTOR = 'PENDIENTE_FIRMA_DIRECTOR',
  COMPLETADO = 'COMPLETADO'
}

export enum SeguimientoEstado {
  PENDIENTE = 'PENDIENTE',
  ENVIADO_A_EMPRESA = 'ENVIADO_A_EMPRESA',
  RECIBIDO = 'RECIBIDO'
}

export enum ValoracionEstado {
  PENDIENTE = 'PENDIENTE',
  ENVIADO_A_EMPRESA = 'ENVIADO_A_EMPRESA',
  RECIBIDO = 'RECIBIDO'
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

export const ConvenioEstadoLabels: Record<ConvenioEstado, string> = {
  [ConvenioEstado.PENDIENTE_ENVIAR]: 'Pendiente de enviar a empresa',
  [ConvenioEstado.PENDIENTE_FIRMA_EMPRESA]: 'Pendiente de firmar por empresa',
  [ConvenioEstado.PENDIENTE_ENVIAR_DIRECTOR]: 'Pendiente de enviar al director',
  [ConvenioEstado.PENDIENTE_FIRMA_DIRECTOR]: 'Pendiente de firmar por dirección',
  [ConvenioEstado.COMPLETADO]: 'Completado'
};

export const SeguimientoEstadoLabels: Record<SeguimientoEstado, string> = {
  [SeguimientoEstado.PENDIENTE]: 'Pendiente',
  [SeguimientoEstado.ENVIADO_A_EMPRESA]: 'Enviado a empresa',
  [SeguimientoEstado.RECIBIDO]: 'Recibido de empresa'
};

export const ValoracionEstadoLabels: Record<ValoracionEstado, string> = {
  [ValoracionEstado.PENDIENTE]: 'Pendiente',
  [ValoracionEstado.ENVIADO_A_EMPRESA]: 'Enviado a empresa',
  [ValoracionEstado.RECIBIDO]: 'Recibido de empresa'
};

export const FirmaTipoLabels: Record<FirmaTipo, string> = {
  [FirmaTipo.SIN_ASIGNAR]: 'Tipo firma',
  [FirmaTipo.DIGITAL]: 'Digital',
  [FirmaTipo.MANUAL]: 'Manual',
};

export interface SelectedDocs {
  relacion: boolean,
  plan: boolean,
  seguimiento: boolean,
  valoracion: boolean,
  calendario: boolean,
  carta: boolean
}

export interface PanelResumenRow {
  alumnoId: number;
  nombre: string;
  apellidos: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  totalHorasFFE: number;
  relacionId: number | null;
  empresaNombre: string | null;
  numConvenio: string | null;
  numRelacion: string | null;
  estadoConvenio: ConvenioEstado | null;
  estadoRelacion: RelacionEstado | null;
  estadoPlanFormativo: PlanFormativoEstado;
  estadoSeguimiento: SeguimientoEstado;
  estadoValoracion: ValoracionEstado;
  firmaRelacion?: string;
  firmaPlanFormativo?: string;
  firmaSeguimiento?: string;
  firmaValoracion?: string;
  tipoFirmaConvenio?: string;
}

export interface SeguridadSocialData {
  meses: string[];
  alumnos: { id: number; nombre: string; apellidos: string; fechaInicio: string | null; fechaFin: string | null }[];
  datos: Record<string, number>;
}

export interface Aviso {
  id: number;
  fecha_aviso: string;
  asunto: string;
  descripcion: string;
  origen: 'automatico' | 'manual';
  estado: 'pendiente' | 'pospuesto' | 'descartado';
  alumno_id: number | null;
  tipo_aviso: string | null;
  pospuesto_en: string | null;
  created_at: string;
}
