import React from 'react';
import { Edit2, Mail, MapPin, MessageSquare, Phone, TriangleAlert, User } from 'lucide-react';
import { Empresa } from '../../../types/index.ts';

interface EmpresaInfoPanelProps {
  empresa: Empresa;
  onEdit: (emp: Empresa) => void;
}

/** Un dato de la ficha. Si falta, se dice en vez de dejar el hueco. */
function Dato({ etiqueta, valor, enlace }: { etiqueta: string; valor?: string | null; enlace?: string }) {
  const texto = valor?.trim();
  return (
    <div className="min-w-0">
      <dt className="text-[9px] font-bold text-text-muted uppercase tracking-widest">{etiqueta}</dt>
      <dd className={`text-sm font-medium mt-0.5 break-words ${texto ? 'text-text-main' : 'text-text-muted italic'}`}>
        {texto
          ? enlace ? <a href={enlace} className="text-primary hover:underline">{texto}</a> : texto
          : 'Sin indicar'}
      </dd>
    </div>
  );
}

function Seccion({ icono, titulo, children }: { icono: React.ReactNode; titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h4 className="flex items-center gap-2 text-[10px] font-black text-text-muted uppercase tracking-widest">
        {icono} {titulo}
      </h4>
      <dl className="space-y-3">{children}</dl>
    </section>
  );
}

/**
 * Ficha de la empresa seleccionada: es la primera pestaña del panel derecho
 * de Empresas, para ver sus datos sin abrir el formulario de edicion.
 */
export function EmpresaInfoPanel({ empresa, onEdit }: EmpresaInfoPanelProps) {
  const ubicacion = [empresa.ciudad, empresa.provincia, empresa.comunidad]
    .map(v => v?.trim())
    .filter(Boolean)
    .filter((v, i, todos) => todos.indexOf(v) === i)
    .join(', ');

  return (
    <div>
      {/* Cabecera */}
      <div className="p-6 border-b border-border-base flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-text-main leading-tight break-words">{empresa.nombre}</h3>
          <p className="text-[10px] text-text-muted uppercase tracking-widest mt-1 font-bold">
            {empresa.cif?.trim() ? `CIF: ${empresa.cif}` : 'Sin CIF'}
          </p>
          {!!empresa.empresaIncompleta && (
            <span className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-warning-soft text-warning-strong border border-warning/20 rounded-full text-[9px] font-bold uppercase tracking-wide">
              <TriangleAlert className="h-3 w-3" /> Falta info empresa
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onEdit(empresa)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-primary bg-primary-light border border-primary-light hover:bg-primary/15 transition-colors"
        >
          <Edit2 className="h-3.5 w-3.5" /> Editar
        </button>
      </div>

      <div className="p-6 space-y-6">
        <Seccion icono={<User className="h-3.5 w-3.5" />} titulo="Contacto">
          <Dato etiqueta="Persona de contacto" valor={empresa.personaContacto} />
          <div className="flex items-start gap-2">
            <Mail className="h-3.5 w-3.5 text-text-muted mt-4 shrink-0" />
            <Dato etiqueta="Email" valor={empresa.email} enlace={empresa.email?.trim() ? `mailto:${empresa.email.trim()}` : undefined} />
          </div>
          <div className="flex items-start gap-2">
            <Phone className="h-3.5 w-3.5 text-text-muted mt-4 shrink-0" />
            <Dato etiqueta="Teléfono" valor={empresa.tlfn} />
          </div>
        </Seccion>

        <Seccion icono={<MapPin className="h-3.5 w-3.5" />} titulo="Ubicación">
          <Dato etiqueta="Dirección" valor={empresa.direccion} />
          <Dato etiqueta="Localidad" valor={ubicacion} />
        </Seccion>

        <Seccion icono={<MessageSquare className="h-3.5 w-3.5" />} titulo="Comentarios">
          {empresa.comentarios?.trim() ? (
            <p className="text-sm text-text-main whitespace-pre-line break-words">{empresa.comentarios}</p>
          ) : (
            <p className="text-sm text-text-muted italic">Sin comentarios</p>
          )}
        </Seccion>
      </div>
    </div>
  );
}

