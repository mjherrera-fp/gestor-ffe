import React from 'react';
import { User, Phone, GraduationCap, Edit2, Trash2, Send, CheckCircle, Clock, Search, Mail } from 'lucide-react';
import { Alumno } from '../../../types/index.ts';
import { Title } from '../../../components/Title.tsx';

interface AlumnosTableProps {
  alumnos: Alumno[];
  onEdit: (a: Alumno) => void;
  onDelete: (id: number) => void;
  onAcademicDetail: (a: Alumno) => void;
  onEmail: (a: Alumno) => void;
}

export function AlumnosTable({ alumnos, onEdit, onDelete, onAcademicDetail, onEmail }: AlumnosTableProps) {
  return (
    <div className="bg-white rounded-4xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-250">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Alumno</th>
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">DNI / Pasaporte</th>
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Contacto</th>
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Email EducaMadrid</th>
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado Asignación</th>
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">FFE Pte.</th>
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {alumnos.map(alumno => {
            const isAssigned = alumno.relacionId !== null;
            return (
              <tr key={alumno.id} className="hover:bg-slate-50/50 transition-colors group font-sans">

                {/* Nombre */}
                <td className="px-8 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-colors">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{alumno.nombre}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{alumno.apellidos}</div>
                    </div>
                  </div>
                </td>

                {/* DNI */}
                <td className="px-6 py-4">
                  <span className="text-sm font-medium text-slate-600 font-mono">{alumno.dni}</span>
                </td>

                {/* Teléfono */}
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-600 flex items-center gap-1.5 font-medium">
                    <Phone className="h-3.5 w-3.5 text-slate-300" /> {alumno.tlfn}
                  </div>
                </td>

                {/* Email */}
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-500 truncate max-w-45 font-medium">{alumno.emailEduca}</div>
                </td>

                {/* Estado asignación */}
                <td className="px-6 py-4">
                  {isAssigned ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold uppercase tracking-tight border border-emerald-100">
                      Asignado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[9px] font-bold uppercase tracking-tight border border-amber-100">
                      Pdte. Asignar
                    </span>
                  )}
                </td>

                {/* Horas FFE */}
                <td className="px-6 py-4">
                  {(alumno.totalHorasFFE || 0) > 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider border border-amber-100">
                      <Clock className="h-3 w-3" /> {alumno.totalHorasFFE} Horas
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                      <CheckCircle className="h-3 w-3" /> Completado
                    </span>
                  )}
                </td>

                {/* Acciones */}
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Title text="Enviar correo">
                      <button
                        onClick={() => onEmail(alumno)}
                        className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                    </Title>
                    <button
                      onClick={() => onEdit(alumno)}
                      className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(alumno.id!)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {alumnos.length === 0 && (
        <div className="p-20 text-center">
          <Search className="h-12 w-12 mx-auto text-slate-200 mb-4" />
          <p className="text-slate-500 font-bold text-sm">
            No se encontraron alumnos con los criterios de búsqueda.
          </p>
        </div>
      )}
    </div>
  );
}
