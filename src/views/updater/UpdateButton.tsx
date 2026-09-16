import { Download } from 'lucide-react';
import { Title } from '../../components/Title.tsx';
import { useUpdaterStatus } from './useUpdaterStatus.tsx';

export function UpdateButton() {
  const { relevant, reShow } = useUpdaterStatus();

  if (!window.updater || !relevant) return null;
  const version = relevant.version || '';

  return (
    <Title text={`Actualización ${version} disponible - pulsar para mostrar aviso`}>
      <button
        onClick={() => reShow(version)}
        className="relative p-2 rounded-full text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all flex items-center justify-center"
        aria-label="Actualización disponible"
      >
        <Download className="h-5 w-5" />
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
      </button>
    </Title>
  );
}

export default UpdateButton;