import { useState } from 'react';
import { X } from 'lucide-react';
import { Modal } from './ui/Modal.tsx';

interface CreateNotificationModalProps {
  open: boolean;
  onClose: () => void;
  onCreado: () => void;
}

export default function CreateNotificationModal({ open, onClose, onCreado }: CreateNotificationModalProps) {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [asunto, setAsunto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fecha || !asunto || !descripcion) return;
    setLoading(true);
    try {
      await fetch('/api/avisos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha_aviso: fecha, asunto, descripcion }),
      });
      onCreado();
      onClose();
      setAsunto('');
      setDescripcion('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="md" backdropClass="bg-slate-900/60 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <h3 className="text-sm font-bold text-slate-800">Nuevo aviso</h3>
        <button onClick={onClose} className="p-1 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
        <div>
          <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Fecha del aviso</label>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary"
            required
          />
        </div>
        <div>
          <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Asunto</label>
          <input
            type="text"
            value={asunto}
            onChange={e => setAsunto(e.target.value)}
            placeholder="Ej: Revisar documentación"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary"
            required
          />
        </div>
        <div>
          <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Descripción</label>
          <textarea
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            placeholder="Descripción del aviso..."
            rows={4}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary resize-none"
            required
          />
        </div>
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 text-[10px] font-bold uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg py-2 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 text-[10px] font-bold uppercase text-white bg-primary hover:bg-indigo-600 rounded-lg py-2 transition-colors disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Crear aviso'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
