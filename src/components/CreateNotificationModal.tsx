import { useState } from 'react';
import { X } from 'lucide-react';
import { Modal } from './ui/Modal.tsx';
import { required } from '../utils/validation.ts';
import { useFormValidation } from '../hooks/useFormValidation.ts';

const inputCls = 'w-full border border-border-base rounded-lg px-3 py-2 text-xs outline-none focus:border-primary';
const inputErrCls = 'border-danger ring-2 ring-danger/20';
const errMsgCls = 'text-danger text-xs mt-1 italic font-medium';

const RULES = {
  fecha: [required('Fecha del aviso')],
  asunto: [required('Asunto')],
  descripcion: [required('Descripción')],
};

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
  const { errors, onBlur, validateAll } = useFormValidation(RULES);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll({ fecha, asunto, descripcion })) return;
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
    <Modal open={open} onClose={onClose} maxWidth="md" backdropClass="bg-overlay backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-base shrink-0">
        <h3 className="text-sm font-bold text-text-main">Nuevo aviso</h3>
        <button onClick={onClose} className="p-1 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-hover transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
        <div>
          <label className="text-[9px] font-bold text-text-muted uppercase mb-1 block">Fecha del aviso<span className="text-danger ml-0.5">*</span></label>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className={`${inputCls} ${errors.fecha ? inputErrCls : ''}`}
            onBlur={() => onBlur('fecha', fecha)}
          />
          {errors.fecha && <p className={errMsgCls}>{errors.fecha}</p>}
        </div>
        <div>
          <label className="text-[9px] font-bold text-text-muted uppercase mb-1 block">Asunto<span className="text-danger ml-0.5">*</span></label>
          <input
            type="text"
            value={asunto}
            onChange={e => setAsunto(e.target.value)}
            placeholder="Ej: Revisar documentación"
            className={`${inputCls} ${errors.asunto ? inputErrCls : ''}`}
            onBlur={() => onBlur('asunto', asunto)}
          />
          {errors.asunto && <p className={errMsgCls}>{errors.asunto}</p>}
        </div>
        <div>
          <label className="text-[9px] font-bold text-text-muted uppercase mb-1 block">Descripción<span className="text-danger ml-0.5">*</span></label>
          <textarea
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            placeholder="Descripción del aviso..."
            rows={4}
            className={`${inputCls} ${errors.descripcion ? inputErrCls : ''} resize-none`}
            onBlur={() => onBlur('descripcion', descripcion)}
          />
          {errors.descripcion && <p className={errMsgCls}>{errors.descripcion}</p>}
        </div>
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 text-[10px] font-bold uppercase text-text-muted bg-surface-hover hover:bg-surface-strong rounded-lg py-2 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 text-[10px] font-bold uppercase text-white bg-primary hover:bg-primary/90 rounded-lg py-2 transition-colors disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Crear aviso'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
