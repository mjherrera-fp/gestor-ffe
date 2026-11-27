/**
 * Si la aplicacion puede enviar correos (GF-76).
 *
 * El envio se activa a mano en Configuracion -> Correo (clave `envio_activo`
 * de la configuracion `correo`) y por defecto esta desactivado. Aunque este
 * activado, si no hay usuario y contrasena SMTP tampoco se puede enviar, y
 * entonces no se muestra ninguna opcion de envio.
 */

export interface EstadoEnvioEmail {
  /** El interruptor de Configuracion -> Correo. */
  activo: boolean;
  /** Hay usuario y contrasena SMTP con los que enviar. */
  configurado: boolean;
  /** Se muestran las opciones de envio: activo y configurado. */
  habilitado: boolean;
}

/** Las claves de la configuracion `correo` que no son del formulario SMTP. */
export const CLAVES_CORREO_APARTE = ['firma_correo', 'envio_activo'] as const;

type Valor = string | number | boolean | null | undefined;

/**
 * El estado a partir de la configuracion `correo` y, para las instalaciones
 * antiguas, los datos SMTP que se guardaban en el profesor.
 */
export function estadoEnvioEmail(
  cfg: Record<string, Valor>,
  profesor?: { smtp_user?: string | null; smtp_pass?: string | null } | null,
): EstadoEnvioEmail {
  const activo = cfg.envio_activo === '1' || cfg.envio_activo === true;
  const usuario = cfg.smtp_user || profesor?.smtp_user || '';
  const clave = cfg.smtp_pass || profesor?.smtp_pass || '';
  const configurado = !!usuario && !!clave;
  return { activo, configurado, habilitado: activo && configurado };
}

/**
 * Al guardar el formulario SMTP se reescribe toda la configuracion `correo`.
 * Se conservan las claves que se guardan aparte (la firma y el interruptor)
 * si el formulario no las trae, para no perderlas.
 */
export function conservarClavesAparte(
  anterior: Record<string, Valor>,
  nueva: Record<string, Valor>,
): Record<string, Valor> {
  const resultado = { ...nueva };
  for (const clave of CLAVES_CORREO_APARTE) {
    if (resultado[clave] === undefined && anterior[clave] !== undefined) resultado[clave] = anterior[clave];
  }
  return resultado;
}
