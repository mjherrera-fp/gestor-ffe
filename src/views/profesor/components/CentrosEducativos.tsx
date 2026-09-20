import React from 'react';
import { Building2, GraduationCap, Plus, Edit2, Trash2, MapPin, Phone, Mail } from 'lucide-react';
import { CentroEducativo, DetalleAcademico } from '../../../types/index.ts';
import { CentroWithDetalles } from '../hooks/useProfesor.ts';

interface CentrosEducativosProps {
  centros: CentroWithDetalles[];
  loading: boolean;
  profesorId?: number;
  onAddCentro: () => void;
  onEditCentro: (centro: CentroEducativo) => void;
  onDeleteCentro: (id: number) => void;
  onAddDetalle: (centroId: number) => void;
  onEditDetalle: (centroId: number, detalle: DetalleAcademico) => void;
  onDeleteDetalle: (id: number) => void;
}

export function CentrosEducativos({
  centros, loading, profesorId,
  onAddCentro, onEditCentro, onDeleteCentro,
  onAddDetalle, onEditDetalle, onDeleteDetalle,
}: CentrosEducativosProps) {
  return (
    <div>
      {/* Cabecera sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg shrink-0">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-main tracking-tight">Centros Educativos</h2>
            <p className="text-xs text-text-muted">Un profesor puede estar adscrito a varios centros.</p>
          </div>
        </div>
        <button
          disabled={!profesorId}
          onClick={onAddCentro}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-primary/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" /> Añadir Centro
        </button>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="py-12 text-center text-text-muted italic text-sm">Cargando centros...</div>
      ) : centros.length === 0 ? (
        <div className="bg-surface-subtle border-2 border-dashed border-border-base rounded-2xl py-16 px-10 text-center">
          <Building2 className="h-10 w-10 text-text-muted mx-auto mb-4" />
          <h3 className="text-text-main font-bold mb-1">No hay centros registrados</h3>
          <p className="text-text-muted text-xs">Registra tu primer centro educativo para empezar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {centros.map(centro => (
            <div
              key={centro.id}
              className="bg-surface-card rounded-2xl border border-border-base overflow-hidden hover:shadow-lg transition-all group"
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
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity self-end sm:self-auto">
                  <button
                    onClick={() => onEditCentro(centro)}
                    className="p-2 hover:bg-surface-card rounded-lg text-text-muted hover:text-primary transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDeleteCentro(centro.id!)}
                    className="p-2 hover:bg-surface-card rounded-lg text-text-muted hover:text-danger transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {centro.detalles.map(detalle => (
                      <div
                        key={detalle.id}
                        className="p-4 bg-surface-subtle rounded-xl border border-border-base group relative"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="bg-primary/10 px-2 py-0.5 rounded text-[9px] font-black text-primary uppercase">
                              Grupo: {detalle.codigoGrupo}
                            </div>
                            <div className="bg-primary-light px-2 py-0.5 rounded text-[9px] font-black text-primary uppercase border border-primary-light">
                              {detalle.resultadosAprendizaje?.length || 0} RA
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                            <button
                              onClick={() => onEditDetalle(centro.id!, detalle)}
                              className="p-1 text-text-muted hover:text-primary"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => onDeleteDetalle(detalle.id!)}
                              className="p-1 text-text-muted hover:text-danger"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <div className="font-bold text-text-main text-xs mb-1 line-clamp-1">{detalle.ciclo}</div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-[9px] text-text-muted font-medium">
                            <span className="font-bold">Nivel:</span> {detalle.nivel}
                          </div>
                          <div className="flex items-center gap-2 text-[9px] text-text-muted font-medium">
                            <span className="font-bold">Grado:</span> {detalle.grado}
                          </div>
                          <div className="flex items-center gap-2 text-[9px] text-text-muted font-medium">
                            <span className="font-bold">Régimen:</span> {detalle.regimen}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
