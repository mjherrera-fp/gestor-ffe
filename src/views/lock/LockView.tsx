import React, { useState } from 'react';
import { Lock, ShieldAlert, KeyRound, ArrowRight, Copyright } from 'lucide-react';
import { motion } from 'motion/react';
import packageJson from '../../../package.json';
import CopyrightModal from '../../components/CopyrightModal.tsx';
import { required } from '../../utils/validation.ts';
import { useFormValidation } from '../../hooks/useFormValidation.ts';

const isDev = (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true;

const inputCls = 'block w-full pl-10 pr-3 py-3 bg-surface-subtle border border-border-base rounded-xl text-text-main placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all';
const inputErrCls = 'border-danger ring-2 ring-danger/30';
const errMsgCls = 'text-danger text-xs mt-1 italic font-medium';

const RULES = {
  password: [required('Contraseña Maestra')],
};

interface LockViewProps {
  onUnlock: (password: string) => Promise<void>;
  error: string;
}

export default function LockView({ onUnlock, error }: LockViewProps) {
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCopyright, setShowCopyright] = useState(false);
  const { errors, onBlur, validateAll } = useFormValidation(RULES);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll({ password })) return;

    setIsSubmitting(true);
    await onUnlock(password);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-bg-base relative overflow-hidden">
      {/* Decoración de fondo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-success/10 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 relative z-10"
      >
        <div className="bg-surface-card border border-border-base rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/40 mb-4">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-text-main">Acceso Restringido</h1>
            <p className="text-text-muted text-sm mt-2 text-center">
              La base de datos <span className="text-primary font-mono">ffe_management.db</span> está cifrada. Introduce la clave para continuar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <KeyRound className="h-5 w-5 text-text-muted" />
              </div>
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña Maestra"
                className={`${inputCls} ${errors.password ? inputErrCls : ''}`}
                onBlur={() => onBlur('password', password)}
              />
              {errors.password && <p className={errMsgCls}>{errors.password}</p>}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-danger text-sm bg-danger/10 p-3 rounded-lg border border-danger/20"
              >
                <ShieldAlert className="h-4 w-4" />
                <span>{error}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !password}
              className="w-full py-3 px-4 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
            >
              {isSubmitting ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Desbloquear Datos
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-text-muted text-xs uppercase tracking-widest font-medium">
          Sistema de Gestión de las FFE
        </p>
        <p className="text-center mt-2 text-[10px] text-text-muted font-medium uppercase tracking-widest">
          v{packageJson.version}
          {isDev && <span className="ml-1 text-warning-strong font-bold">dev</span>}
        </p>
        <p className="text-center mt-2 text-[9px] text-text-muted font-medium tracking-widest">
            <Copyright size={12} className="inline"/> <button onClick={() => setShowCopyright(true)} className="hover:text-primary transition-colors cursor-pointer">mjherrera-fp</button>
          </p>
      </motion.div>

      <CopyrightModal open={showCopyright} onClose={() => setShowCopyright(false)} />
    </div>
  );
}