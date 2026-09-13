import { useState } from 'react';
import { CheckSquare, Square, Copyright, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import packageJson from '../../package.json';
import CopyrightModal from './CopyrightModal.tsx';

const isDev = (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true;

interface TermsViewProps {
  onAccept: () => void;
}

export default function TermsView({ onAccept }: TermsViewProps) {
  const [accepted, setAccepted] = useState(false);
  const [showCopyright, setShowCopyright] = useState(false);

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-900/10 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg p-8 relative z-10"
      >
        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-6">
            <img
              src="/assets/favicon.png"
              alt="Logo"
              className="h-16 w-16 mb-4"
            />
            <h1 className="text-2xl font-bold text-white">Gestor FFE</h1>
            <p className="text-slate-400 text-sm mt-1 text-center">
              Sistema de Gestión de las FFE
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-5 mb-6 max-h-64 overflow-y-auto text-sm text-slate-300 leading-relaxed space-y-3">
            <p className="font-semibold text-white text-base mb-2">Condiciones de uso</p>
            <p>
              El usuario es responsable de cumplir con todas las leyes y regulaciones aplicables al utilizar este software.
            </p>
            <p>
              El desarrollador de esta aplicación no se hace responsable de ningún daño, pérdida o perjuicio que pueda derivarse del uso indebido, inapropiado o incorrecto de la aplicación. El uso de esta aplicación es bajo su propio riesgo.
            </p>
            <p>
              No garantizamos que la aplicación funcione sin errores, interrupciones o fallos, ni que los resultados obtenidos sean precisos o completos. La aplicación se proporciona "tal cual" y "según disponibilidad", sin ninguna garantía expresa o implícita de ningún tipo.
            </p>
            <p>
              Al utilizar esta aplicación, usted acepta que el desarrollador no será responsable de ningún daño directo, indirecto, incidental, especial o consecuente que pueda surgir del uso o mal funcionamiento de la aplicación.
            </p>
            <p className="font-semibold text-white text-base mb-2">Derechos de autor</p>
            <p>
              Copyright (c) {currentYear} Manuel Jesús Herrera Morgaz. Todos los derechos reservados.
            </p>
            <p>
              Este software se distribuye bajo una licencia de código fuente disponible. Se permite usar,
              ver y estudiar el código. <a href="https://github.com/mjherrera-fp/gestor-ffe" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">El código fuente está disponible en GitHub</a>.
            </p>
            <p>
              No se permite copiar, redistribuir, sublicenciar o usar con fines comerciales o de ningún otro tipo sin
              autorización expresa del autor.
            </p>
            <p>
              Toda copia autorizada deberá mantener esta nota de copyright y atribuir al autor original.
            </p>
            <p className="font-semibold text-white text-base mb-2">Uso de datos</p>
            <p>
              Al aceptar estas condiciones, el usuario se compromete a hacer un uso responsable de la
              aplicación y de los datos gestionados a través de la misma, cumpliendo con la normativa
              vigente en materia de protección de datos.
            </p>
            <p>
              El desarrollador no se hace responsable de la gestión, almacenamiento o protección de los datos introducidos en la aplicación. Es responsabilidad del usuario asegurarse de que los datos gestionados a través de la aplicación cumplen con las leyes y regulaciones aplicables, incluyendo pero no limitándose a la Ley de Protección de Datos Personales.
            </p>
          </div>

          <button
            onClick={() => setAccepted(!accepted)}
            className="flex items-center gap-3 text-left w-full p-3 rounded-xl hover:bg-slate-800/50 transition-colors group"
          >
            {accepted ? (
              <CheckSquare className="h-6 w-6 text-blue-400 shrink-0" />
            ) : (
              <Square className="h-6 w-6 text-slate-500 group-hover:text-slate-400 shrink-0" />
            )}
            <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
              He leído y acepto las condiciones de uso
            </span>
          </button>

          <button
            onClick={onAccept}
            disabled={!accepted}
            className="w-full mt-4 py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
          >
            Iniciar aplicación
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        <p className="text-center mt-6 text-slate-500 text-[10px] font-medium uppercase tracking-widest">
          v{packageJson.version}
          {isDev && <span className="ml-1 text-orange-500 font-bold">dev</span>}
        </p>
        <p className="text-center mt-2 text-[9px] text-slate-500 tracking-widest">
          <Copyright size={12} className="inline" />{' '}
          <button onClick={() => setShowCopyright(true)} className="hover:text-blue-400 transition-colors cursor-pointer">mjherrera-fp</button>
        </p>
      </motion.div>

      <CopyrightModal open={showCopyright} onClose={() => setShowCopyright(false)} />
    </div>
  );
}
