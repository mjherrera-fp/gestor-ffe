import React from 'react';
import {
  CalendarDays, GraduationCap, Plus, Edit2, Trash2, MapPin, Phone, Mail, School,
  Target, Layers,
} from 'lucide-react';
import { Title } from '../../../components/Title.tsx';
import { CentroEducativo, DetalleAcademico, ResultadoAprendizaje } from '../../../types/index.ts';
import { CentroWithDetalles } from '../hooks/useCentros.ts';

/** Modulos distintos entre los RA de un ciclo, para el resumen de la ficha. */
const numModulos = (ra: ResultadoAprendizaje[] | undefined) =>
  new Set((ra || []).map(r => r.modulo).filter(Boolean)).size;

interface CentrosEducativosProps {
  centros: CentroWithDetalles[];
  loading: boolean;
  profesorId?: number;
  onAddCentro: () => void;
  onEditCentro: (centro: CentroEducativo) => void;
  onEditFestivos: (centro: CentroWithDetalles) => void;
  onDeleteCentro: (id: number) => void;
  onAddDetalle: (centroId: number) => void;
  onEditDetalle: (centroId: number, detalle: DetalleAcademico) => void;
  onEditRA: (detalle: DetalleAcademico) => void;
  onDeleteDetalle: (id: number) => void;
}

export function CentrosEducativos({
  centros, loading, profesorId,
  onAddCentro, onEditCentro, onEditFestivos, onDeleteCentro,
  onAddDetalle, onEditDetalle, onEditRA, onDeleteDetalle,
}: CentrosEducativosProps) {
  return (
    <div>
      {/* Cabecera sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg shrink-0">
            <School className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-main tracking-tight">Centros Educativos</h2>
            <p className="text-xs text-text-muted">Un profesor puede estar adscrito a varios centros.</p>
          </div>
        </div>
        <Title
          text={profesorId ? 'Añadir un centro educativo' : 'Guarda antes tu perfil en la sección Profesor'}
        >
          <button
            disabled={!profesorId}
            onClick={onAddCentro}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-primary/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" /> Añadir Centro
          </button>
        </Title>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="py-12 text-center text-text-muted italic text-sm">Cargando centros...</div>
      ) : centros.length === 0 ? (
        <div className="bg-surface-subtle border-2 border-dashed border-border-base rounded-2xl py-16 px-10 text-center">
          <School className="h-10 w-10 text-text-muted mx-auto mb-4" />
          <h3 className="text-text-main font-bold mb-1">No hay centros registrados</h3>
          <p className="text-text-muted text-xs">Registra tu primer centro educativo para empezar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {centros.map(centro => {
            const nFestivos = centro.festivos?.length || 0;
            return (
            <div
              key={centro.id}
              className="bg-surface-card rounded-2xl border border-border-base overflow-hidden hover:shadow-lg transition-all"
            >
              {/* Cabecera del centro */}
              <div className="p-4 sm:p-6 bg-surface-subtle/50 border-b border-border-base flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-surface-card shadow-sm border border-border-base flex items-center justify-center font-black text-primary text-lg sm:text-xl shrink-0">
                    {centro.nombre.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-text-main leading-tight truncate">{centro.nombre}</h4>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                      <span className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-text-muted font-bold whitespace-nowrap">
                        <MapPin className="h-3 w-3" /> {centro.ciudad}
                      </span>
                      <span className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-text-muted font-bold whitespace-nowrap">
                        <Phone className="h-3 w-3" /> {centro.telefono}
                      </span>
                      <span className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-text-muted font-bold whitespace-nowrap">
                        <Mail className="h-3 w-3" /> {centro.email}
                      </span>
                      {nFestivos > 0 && (
                        <span className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-danger font-bold whitespace-nowrap">
                          <CalendarDays className="h-3 w-3" /> {nFestivos} festivo{nFestivos === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Title
                    text={
                      nFestivos > 0
                        ? `Días festivos del centro (${nFestivos})`
                        : 'Marcar los días festivos del centro'
                    }
                  >
                    <button
                      onClick={() => onEditFestivos(centro)}
                      className="p-2 hover:bg-surface-card rounded-lg text-text-muted hover:text-primary transition-colors"
                    >
                      <CalendarDays className="h-4 w-4" />
                    </button>
                  </Title>
                  <Title text="Editar centro">
                    <button
                      onClick={() => onEditCentro(centro)}
                      className="p-2 hover:bg-surface-card rounded-lg text-text-muted hover:text-primary transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </Title>
                  <Title text="Eliminar centro y sus ciclos">
                    <button
                      onClick={() => onDeleteCentro(centro.id!)}
                      className="p-2 hover:bg-surface-card rounded-lg text-text-muted hover:text-danger transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </Title>
                </div>
              </div>

              {/* Detalles académicos */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h5 className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                    <GraduationCap className="h-3.5 w-3.5" /> Detalles de Ciclo
                  </h5>
                  <button
                    onClick={() => onAddDetalle(centro.id!)}
                    className="text-primary text-[10px] font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Añadir Ciclo
                  </button>
                </div>

                {centro.detalles.length === 0 ? (
                  <div className="py-4 text-center text-text-muted text-[10px] italic">
                    No hay ciclos registrados en este centro.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {centro.detalles.map(detalle => (
                      <div
                        key={detalle.id}
                        className="bg-surface-card rounded-xl border border-border-base shadow-sm hover:shadow-md transition-all group overflow-hidden flex flex-col h-full"
                      >
                        <div className="p-5 flex flex-col grow">

                          {/* Cabecera */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="bg-surface-subtle p-3 rounded-lg border border-border-base group-hover:bg-primary/5 transition-colors">
                              <GraduationCap className="h-6 w-6 text-text-muted group-hover:text-primary transition-colors" />
                            </div>
                            <div className="flex gap-1.5">
                              <Title text="Editar ciclo formativo">
                                <button
                                  onClick={() => onEditDetalle(centro.id!, detalle)}
                                  className="p-1.5 text-text-muted hover:text-primary transition-colors hover:bg-primary-light rounded-md"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                              </Title>
                              <Title text="Eliminar ciclo formativo">
                                <button
                                  onClick={() => onDeleteDetalle(detalle.id!)}
                                  className="p-1.5 text-text-muted hover:text-danger transition-colors hover:bg-danger-soft rounded-md"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </Title>
                            </div>
                          </div>

                          {/* Nombre */}
                          <div className="mb-4">
                            <h3 className="font-bold text-base text-text-main leading-tight mb-0.5 line-clamp-2">
                              {detalle.ciclo}
                            </h3>
                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                              {detalle.codigo} · Grupo {detalle.codigoGrupo}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-info-soft text-info-strong border border-info-strong/20 rounded-full text-[9px] font-black uppercase tracking-wide">
                                {detalle.nivel}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-subtle text-text-muted border border-border-base rounded-full text-[9px] font-bold uppercase tracking-wide">
                                {detalle.grado}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-subtle text-text-muted border border-border-base rounded-full text-[9px] font-bold uppercase tracking-wide">
                                {detalle.regimen}
                              </span>
                            </div>
                          </div>

                          {/* Datos del ciclo */}
                          <div className="space-y-2 border-t border-border-base pt-4 mt-auto">
                            <div className="flex items-center gap-2.5 text-xs text-text-main font-medium">
                              <Layers className="h-3.5 w-3.5 text-text-muted shrink-0" />
                              <span className="truncate">
                                {numModulos(detalle.resultadosAprendizaje)} módulos · {detalle.regimen}
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5 text-xs text-text-main font-medium">
                              <CalendarDays className="h-3.5 w-3.5 text-text-muted shrink-0" />
                              <span className="truncate">
                                {detalle.tutorias?.length || 0} sesiones de tutoría
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5 text-xs font-bold text-info-strong bg-info-soft px-2 py-1 rounded-md border border-info-strong/20">
                              <Target className="h-3.5 w-3.5" /> {detalle.resultadosAprendizaje?.length || 0} RA
                            </div>
                          </div>
                        </div>

                        {/* Footer: RA */}
                        <div className="px-5 py-4 bg-surface-subtle/50 border-t border-border-base flex items-center justify-between gap-3 mt-auto">
                          <Title text="Gestionar resultados de aprendizaje">
                            <button
                              onClick={() => onEditRA(detalle)}
                              className="flex items-center gap-1.5 text-info-strong font-bold text-[10px] uppercase tracking-wider hover:bg-info-strong/15 transition-colors bg-info-soft px-2 py-1 rounded-md"
                            >
                              <Target className="h-4 w-4" /> Gestionar RA
                            </button>
                          </Title>
                          <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest opacity-50">
                            #{detalle.id}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
