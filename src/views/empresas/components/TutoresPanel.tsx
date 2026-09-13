import React from 'react';
import { Building2, UserPlus, Edit2, Trash2, Mail, Phone, TriangleAlert } from 'lucide-react';
import { Empresa, TutorEmpresa } from '../../../types/index.ts';

interface TutoresPanelProps {
  selectedEmpresa: Empresa | null;
  tutores: TutorEmpresa[];
  onAddTutor: () => void;
  onEditTutor: (t: TutorEmpresa) => void;
  onDeleteTutor: (id: number) => void;
}

export function TutoresPanel({
  selectedEmpresa, tutores,
  onAddTutor, onEditTutor, onDeleteTutor,
}: TutoresPanelProps) {

  if (!selectedEmpresa) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="bg-slate-50 p-6 rounded-full mb-4">
          <Building2 className="h-12 w-12 text-slate-200" />
        </div>
        <h3 className="text-base font-bold text-text-main mb-2">Selecciona una empresa</h3>
        <p className="text-xs text-text-muted leading-relaxed">
          Haz clic en una empresa para gestionar sus tutores laborales.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* Cabecera */}
      <div className="p-6 border-b border-border-base">
        <h3 className="text-lg font-bold text-text-main leading-tight">Tutores Laborales</h3>
        <p className="text-[10px] text-text-muted uppercase tracking-widest mt-1">
          <span className='font-black'>{selectedEmpresa.nombre}</span>
        </p>
      </div>

      {/* Lista tutores */}
      <div className="p-6 flex-1 overflow-y-auto space-y-4">
        {tutores.map(tutor => (
          <div
            key={tutor.id}
            className="p-4 bg-slate-50 border border-border-base rounded-lg shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-sm text-text-main leading-tight">
                {tutor.nombre} {tutor.apellidos}
                {(!tutor.apellidos?.trim() || !tutor.nif?.trim() || !tutor.email?.trim() || !tutor.tlfn?.trim()) && (
                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[9px] font-bold uppercase tracking-wide align-middle">
                    <TriangleAlert className="h-2.5 w-2.5" /> Datos incompletos
                  </span>
                )}
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => onEditTutor(tutor)}
                  className="text-text-muted hover:text-primary transition-colors"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onDeleteTutor(tutor.id!)}
                  className="text-text-muted hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <Mail className="h-3 w-3" /> {tutor.email}
              </div>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <Phone className="h-3 w-3" /> {tutor.tlfn}
              </div>
              <div className="text-[10px] font-bold text-text-muted uppercase mt-2 tracking-wider">
                DNI/NIF: {tutor.nif}
              </div>
            </div>
          </div>
        ))}

        {tutores.length === 0 && (
          <div className="py-12 text-center">
            <UserPlus className="h-10 w-10 mx-auto text-slate-200 mb-3" />
            <p className="text-sm text-text-muted font-medium">Sin tutores asignados</p>
          </div>
        )}
      </div>

      {/* Footer: botón añadir */}
      <div className="p-6 border-t border-border-base bg-slate-50/50">
        <button
          onClick={onAddTutor}
          className="w-full bg-primary text-white py-3 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-md shadow-primary/10"
        >
          + Añadir Tutor
        </button>
      </div>
    </div>
  );
}
