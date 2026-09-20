import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, ShieldCheck, RefreshCw, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { createPortal } from 'react-dom';
import { required } from '../../../utils/validation.ts';
import { useFormValidation } from '../../../hooks/useFormValidation.ts';

const labelClass = 'block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5';
const inputClass = 'w-full bg-surface-card border border-border-base rounded-lg px-4 py-2.5 text-text-main text-sm outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-sans';
const inputErrCls = 'border-red-400 ring-2 ring-red-200';
const errMsgCls = 'text-red-500 text-xs mt-1 italic font-medium';

const RULES = {
  newPassword: [required('Contraseña')],
  confirmPassword: [required('Confirmar Contraseña')],
};

interface Message {
  type: 'success' | 'error' | '';
  text: string;
}

interface TabSeguridadProps {
  isEncrypted: boolean;
  isEncrypting: boolean;
  newPassword: string;
  confirmPassword: string;
  message: Message;
  showConfirmModal: boolean;
  onNewPasswordChange: (v: string) => void;
  onConfirmPasswordChange: (v: string) => void;
  onEncrypt: () => void;
  onExecuteEncryption: () => Promise<void>;
  onCloseConfirmModal: () => void;
}

export function TabSeguridad({
  isEncrypted, isEncrypting,
  newPassword, confirmPassword,
  message, showConfirmModal,
  onNewPasswordChange, onConfirmPasswordChange,
  onEncrypt, onExecuteEncryption, onCloseConfirmModal,
}: TabSeguridadProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { errors, onBlur, validateAll } = useFormValidation(RULES);

  const handleEncrypt = () => {
    if (!validateAll({ newPassword, confirmPassword })) return;
    onEncrypt();
  };
  return (
    <>
      <div className="bg-surface-card rounded-xl shadow-sm border border-border-base overflow-hidden">
        <div className="p-6 border-b border-border-base bg-surface-subtle">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isEncrypted ? 'bg-success-soft text-success-strong' : 'bg-primary-light text-primary'}`}>
              {isEncrypted ? <ShieldCheck className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-main">
                {isEncrypted ? 'Gestión de Contraseña Maestra' : 'Seguridad de la Base de Datos'}
              </h3>
              <p className="text-sm text-text-muted">
                {isEncrypted ? 'Tu base de datos está cifrada' : 'Cifra tus datos para mayor seguridad'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {isEncrypting && (
            <div className="bg-warning-soft border border-warning/20 rounded-lg p-4 mb-6 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-warning-strong shrink-0" />
              <p className="text-sm text-warning-strong">
                <strong>Atención:</strong> Al cifrar la base de datos, el archivo de tu BBDD será ilegible
                para cualquier otra aplicación. Necesitarás esta clave cada vez que abras el Gestor FFE.
                <br />
                Si olvidas la contraseña, no podrás recuperar tus datos. La contraseña{' '}
                <strong>NO se puede recuperar</strong> de ninguna forma. Asegúrate de guardarla en un lugar seguro.
              </p>
            </div>
          )}

          {message.text && (
            <div className={`p-3 rounded-lg mb-4 text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-1 ${message.type === 'success'
              ? 'bg-success-soft text-success-strong border border-success/20'
              : 'bg-danger-soft text-danger border border-danger/20'
              }`}>
              {message.type === 'success'
                ? <ShieldCheck className="h-4 w-4" />
                : <AlertTriangle className="h-4 w-4" />}
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className={labelClass}>
                {isEncrypted ? 'Nueva Contraseña' : 'Establecer Contraseña'}<span className="text-red-500 ml-0.5">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => onNewPasswordChange(e.target.value)}
                  className={`${inputClass} pr-10 ${errors.newPassword ? inputErrCls : ''}`}
                  placeholder="Escribe la clave..."
                  onBlur={() => onBlur('newPassword', newPassword)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.newPassword && <p className={errMsgCls}>{errors.newPassword}</p>}
            </div>
            <div>
              <label className={labelClass}>Confirmar Contraseña<span className="text-red-500 ml-0.5">*</span></label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => onConfirmPasswordChange(e.target.value)}
                  className={`${inputClass} pr-10 ${errors.confirmPassword ? inputErrCls : ''}`}
                  placeholder="Repite la clave..."
                  onBlur={() => onBlur('confirmPassword', confirmPassword)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className={errMsgCls}>{errors.confirmPassword}</p>}
            </div>
          </div>

          <div className="flex justify-start pt-4 border-t border-border-base">
            <button
              onClick={handleEncrypt}
              disabled={isEncrypting || !newPassword}
              className={`flex items-center justify-center gap-2 text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed ${isEncrypted ? 'bg-success hover:bg-success/90' : 'bg-primary hover:bg-primary/90'
                }`}
            >
              {isEncrypting ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {isEncrypted ? <RefreshCw className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                  {isEncrypted ? 'Actualizar Contraseña' : 'Activar Cifrado de Datos'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {createPortal(
        <AnimatePresence mode="wait">
          {showConfirmModal && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-overlay backdrop-blur-sm z-9999"
                onClick={onCloseConfirmModal}
              />
              <div className="fixed inset-0 flex items-center justify-center z-9999 pointer-events-none px-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-surface-card rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 h-12 w-12 rounded-full bg-warning-soft flex items-center justify-center">
                        <AlertTriangle className="h-6 w-6 text-warning-strong" />
                      </div>
                      <div className="flex-1 pt-1">
                        <h3 className="text-xl font-bold text-text-main">
                          {isEncrypted ? '¿Cambiar la contraseña?' : '¿Cifrar Base de Datos?'}
                        </h3>
                        <p className="mt-2 text-sm text-text-muted leading-relaxed">
                          {isEncrypted
                            ? 'Estás a punto de cambiar la clave maestra. Asegúrate de recordarla bien.'
                            : 'Toda la base de datos se encriptará. Si olvidas esta contraseña en el futuro, los datos serán totalmente irrecuperables.'}
                        </p>
                        {!isEncrypted && (
                            <p className='mt-2 text-sm text-text-muted leading-relaxed'>Una vez cifrada, la base de datos permanecerá cifrada para siempre. Esta operación <span className='text-warning-strong font-bold'>NO</span> se puede revertir</p>)}
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 bg-surface-subtle border-t border-border-base flex justify-end gap-3">
                    <button
                      onClick={onCloseConfirmModal}
                      className="px-4 py-2 text-sm font-semibold text-text-muted hover:bg-surface-hover bg-surface-hover rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={onExecuteEncryption}
                      className="px-4 py-2 text-sm font-bold text-white bg-warning-strong hover:bg-warning-strong/90 rounded-lg transition-colors shadow-sm"
                    >
                      {isEncrypted ? 'Sí, actualizar clave' : 'Sí, cifrar datos'}
                    </button>
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
