import React from 'react';
import { Heart } from 'lucide-react';

export function InteresesEmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
      <div className="bg-surface-subtle p-8 rounded-full mb-6">
        <Heart className="h-16 w-16 text-text-muted fill-surface-subtle" />
      </div>
      <h3 className="text-lg font-bold text-text-main mb-2">Panel de Mapeo de Intereses</h3>
      <p className="text-xs text-text-muted max-w-xs leading-relaxed">
        Selecciona un alumno del listado lateral para comenzar a cruzar sus preferencias
        personales con las solicitudes oficiales de las empresas colaboradoras.
      </p>
    </div>
  );
}
