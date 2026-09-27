import { useState } from 'react';
import { CheckSquare, Square, Copyright, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import packageJson from '../../package.json';
import CopyrightModal from './CopyrightModal.tsx';

const isDev = (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true;

interface TermsViewProps {
  /** Devuelve false si el servidor no pudo registrar la aceptación. */
  onAccept: () => Promise<boolean>;
}

export default function TermsView({ onAccept }: TermsViewProps) {
  const [accepted, setAccepted] = useState(false);
  const [showCopyright, setShowCopyright] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();

  // El fallo se muestra en pantalla a proposito: si el POST no se acepta, la
  // pantalla se mantiene y sin este aviso el boton pareceria no responder.
  const aceptar = async () => {
    if (enviando) return;
    setEnviando(true);
    setError(null);
    try {
      if (!(await onAccept())) {
        setError('No se ha podido guardar la aceptación. Revisa la conexión e inténtalo de nuevo.');
      }
    } catch {
      setError('No se ha podido guardar la aceptación. Revisa la conexión e inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-bg-base relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-success/10 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg p-8 relative z-10"
      >
        <div className="bg-surface-card backdrop-blur-xl border border-border-base rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-6">
            <img
              src="/assets/favicon.png"
              alt="Logo"
              className="h-16 w-16 mb-4"
            />
            <h1 className="text-2xl font-bold text-text-main">Gestor FFE</h1>
            <p className="text-text-muted text-sm mt-1 text-center">
              Sistema de Gestión de las FFE
            </p>
          </div>

          <div className="bg-surface-subtle border border-border-base rounded-xl p-5 mb-6 max-h-64 overflow-y-auto text-sm text-text-main leading-relaxed space-y-3">
            <p className="font-semibold text-text-main text-base mb-2">Condiciones de uso</p>
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
            <p className="font-semibold text-text-main text-base mb-2">Derechos de autor</p>
            <p>
              Copyright (c) {currentYear} Manuel Jesús Herrera Morgaz. Todos los derechos reservados.
            </p>
            <p>
              Este software se distribuye bajo una licencia de código fuente disponible. Se permite usar,
              ver y estudiar el código. <a href="https://github.com/mjherrera-fp/gestor-ffe" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">El código fuente está disponible en GitHub</a>.
            </p>
            <p>
              No se permite copiar, redistribuir, sublicenciar o usar con fines comerciales o de ningún otro tipo sin
              autorización expresa del autor.
            </p>
            <p>
              Toda copia autorizada deberá mantener esta nota de copyright y atribuir al autor original.
            </p>
            <p className="font-semibold text-text-main text-base mb-2">Uso de datos</p>
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
            className="flex items-center gap-3 text-left w-full p-3 rounded-xl hover:bg-surface-hover transition-colors group"
          >
            {accepted ? (
              <CheckSquare className="h-6 w-6 text-primary shrink-0" />
            ) : (
              <Square className="h-6 w-6 text-text-muted group-hover:text-text-main shrink-0" />
            )}
            <span className="text-sm text-text-muted group-hover:text-text-main transition-colors">
              He leído y acepto las condiciones de uso
            </span>
          </button>

          <button
            onClick={aceptar}
            disabled={!accepted || enviando}
            className="w-full mt-4 py-3 px-4 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
          >
            {enviando ? 'Guardando…' : 'Iniciar aplicación'}
            <ArrowRight className="h-5 w-5" />
          </button>

          {error && (
            <p role="alert" className="mt-3 text-xs text-center text-danger bg-danger-soft border border-danger/20 rounded-lg py-2 px-3">
              {error}
            </p>
          )}
        </div>

        <p className="text-center mt-6 text-text-muted text-[10px] font-medium uppercase tracking-widest">
          v{packageJson.version}
          {isDev && <span className="ml-1 text-warning font-bold">dev</span>}
        </p>
        <p className="text-center mt-2 text-[9px] text-text-muted tracking-widest">
          <Copyright size={12} className="inline" />{' '}
          <button onClick={() => setShowCopyright(true)} className="hover:text-primary transition-colors cursor-pointer">mjherrera-fp</button>
        </p>
      </motion.div>

      <CopyrightModal open={showCopyright} onClose={() => setShowCopyright(false)} />
    </div>
  );
}
