import React, { useEffect, useRef } from 'react';
import type { EstadoSeleccion } from '../lib/seleccion.ts';

interface CasillaProps {
  /** `algunas` pinta la casilla a medias (indeterminada). */
  estado: EstadoSeleccion | boolean;
  onChange: () => void;
  etiqueta: string;
  className?: string;
}

/**
 * Casilla de seleccion. Para el "seleccionar todas" admite el estado
 * intermedio, que en HTML solo se puede poner desde JS.
 */
export function Casilla({ estado, onChange, etiqueta, className = '' }: CasillaProps) {
  const ref = useRef<HTMLInputElement>(null);
  const marcada = estado === true || estado === 'todas';
  const intermedia = estado === 'algunas';

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = intermedia;
  }, [intermedia]);

  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={etiqueta}
      title={etiqueta}
      checked={marcada}
      onChange={onChange}
      onClick={e => e.stopPropagation()}
      className={`h-4 w-4 shrink-0 cursor-pointer rounded border-border-base accent-primary ${className}`}
    />
  );
}

interface BarraSeleccionProps {
  estado: EstadoSeleccion;
  seleccionadas: number;
  totalVisibles: number;
  /** "alumno" / "empresa", para los textos. */
  nombre: string;
  /** Femenino ("seleccionadas") o masculino ("seleccionados"). */
  femenino?: boolean;
  onTodas: () => void;
  onNinguna: () => void;
  /** Las operaciones masivas, que se deshabilitan sin seleccion. */
  children?: React.ReactNode;
}

/**
 * Barra de seleccion para operaciones masivas: marcar todas las visibles
 * (si hay filtro, solo las filtradas) o ninguna, cuantas hay marcadas, y las
 * acciones sobre ellas.
 */
export function BarraSeleccion({
  estado, seleccionadas, totalVisibles, nombre, femenino = false, onTodas, onNinguna, children,
}: BarraSeleccionProps) {
  const o = femenino ? 'a' : 'o';
  const plural = (n: number) => (n === 1 ? nombre : `${nombre}s`);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <label className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider cursor-pointer select-none">
        <Casilla
          estado={estado}
          onChange={estado === 'todas' ? onNinguna : onTodas}
          etiqueta={estado === 'todas' ? `Deseleccionar tod${o}s` : `Seleccionar tod${o}s l${o}s ${nombre}s visibles`}
        />
        {seleccionadas > 0
          ? `${seleccionadas} de ${totalVisibles} ${plural(totalVisibles)} seleccionad${o}${seleccionadas === 1 ? '' : 's'}`
          : `Seleccionar ${plural(2)}`}
      </label>
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
        <button
          type="button"
          onClick={onTodas}
          disabled={totalVisibles === 0 || estado === 'todas'}
          className="text-primary hover:underline disabled:text-text-muted/50 disabled:no-underline disabled:cursor-default"
        >
          Tod{o}s
        </button>
        <span className="text-text-muted/50">/</span>
        <button
          type="button"
          onClick={onNinguna}
          disabled={seleccionadas === 0}
          className="text-primary hover:underline disabled:text-text-muted/50 disabled:no-underline disabled:cursor-default"
        >
          Ningun{femenino ? 'a' : 'o'}
        </button>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2 sm:ml-auto">{children}</div>}
    </div>
  );
}
