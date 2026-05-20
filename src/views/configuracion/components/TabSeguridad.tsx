import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, ShieldCheck, RefreshCw, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { createPortal } from 'react-dom';

const labelClass = 'block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5';
const inputClass = 'w-full bg-white border border-border-base rounded-lg px-4 py-2.5 text-text-main text-sm outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-sans';

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
  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isEncrypted ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
              {isEncrypted ? <ShieldCheck className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                {isEncrypted ? 'Gestión de Contraseña Maestra' : 'Seguridad de la Base de Datos'}
              </h3>
              <p className="text-sm text-slate-500">
                {isEncrypted ? 'Tu base de datos está cifrada' : 'Cifra tus datos para mayor seguridad'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {isEncrypting && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">
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
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              : 'bg-red-100 text-red-700 border border-red-200'
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
                {isEncrypted ? 'Nueva Contraseña' : 'Establecer Contraseña'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => onNewPasswordChange(e.target.value)}
                  className={`${inputClass} pr-10`}
                  placeholder="Escribe la clave..."
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelClass}>Confirmar Contraseña</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => onConfirmPasswordChange(e.target.value)}
                  className={`${inputClass} pr-10`}
                  placeholder="Repite la clave..."
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-start pt-4 border-t border-slate-100">
            <button
              onClick={onEncrypt}
              disabled={isEncrypting || !newPassword}
              className={`flex items-center justify-center gap-2 text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed ${isEncrypted ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
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
        <AnimatePresence>
          {showConfirmModal && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-9999"
                onClick={onCloseConfirmModal}
              />
              <div className="fixed inset-0 flex items-center justify-center z-9999 pointer-events-none px-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                        <AlertTriangle className="h-6 w-6 text-amber-600" />
                      </div>
                      <div className="flex-1 pt-1">
                        <h3 className="text-xl font-bold text-slate-800">
                          {isEncrypted ? '¿Cambiar la contraseña?' : '¿Cifrar Base de Datos?'}
                        </h3>
                        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                          {isEncrypted
                            ? 'Estás a punto de cambiar la clave maestra. Asegúrate de recordarla bien.'
                            : 'Toda la base de datos se encriptará. Si olvidas esta contraseña en el futuro, los datos serán totalmente irrecuperables.'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button
                      onClick={onCloseConfirmModal}
                      className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={onExecuteEncryption}
                      className="px-4 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-sm"
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
