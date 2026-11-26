import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Check, Edit2, ExternalLink, Link2, Loader2, Plus, Trash2, X } from 'lucide-react';
import { Title } from '../../../components/Title.tsx';
import { errorEnlace, type Enlace } from '../../../lib/enlaces.ts';
import { avisarEnlacesCambiados, useEnlaces } from '../../../hooks/useEnlaces.ts';

const inputCls = 'w-full bg-surface-card border border-border-base rounded-lg px-3 py-2 text-sm text-text-main outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all';

/**
 * Configuracion -> Enlaces: los enlaces que salen en la cabecera. Cada uno
 * tiene nombre y URL, y se abre siempre en el navegador por defecto.
 */
export function TabEnlaces() {
  const { enlaces, cargar } = useEnlaces();
  const [nombre, setNombre] = useState('');
  const [url, setUrl] = useState('');
  const [editando, setEditando] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const limpiar = () => { setNombre(''); setUrl(''); setEditando(null); setError(''); };

  const tras = async () => { await cargar(); avisarEnlacesCambiados(); };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const fallo = errorEnlace(nombre, url);
    if (fallo) { setError(fallo); return; }
    setGuardando(true);
    try {
      const res = await fetch(editando ? `/api/enlaces/${editando}` : '/api/enlaces', {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, url }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: 'No se pudo guardar el enlace.' }));
        setError(msg);
        return;
      }
      limpiar();
      await tras();
    } catch {
      setError('Error de conexión.');
    } finally {
      setGuardando(false);
    }
  };

  const editar = (e: Enlace) => { setEditando(e.id!); setNombre(e.nombre); setUrl(e.url); setError(''); };

  const borrar = async (e: Enlace) => {
    if (!window.confirm(`¿Eliminar el enlace «${e.nombre}»?`)) return;
    await fetch(`/api/enlaces/${e.id}`, { method: 'DELETE' });
    if (editando === e.id) limpiar();
    await tras();
  };

  const mover = async (indice: number, delta: number) => {
    const ids = enlaces.map(e => e.id!);
    const destino = indice + delta;
    if (destino < 0 || destino >= ids.length) return;
    [ids[indice], ids[destino]] = [ids[destino], ids[indice]];
    await fetch('/api/enlaces/orden', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    await tras();
  };

  return (
    <div className="bg-surface-card rounded-xl shadow-sm border border-border-base overflow-hidden">
      <div className="p-6 border-b border-border-base bg-surface-subtle">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary-light text-primary">
            <Link2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-main">Enlaces</h3>
            <p className="text-sm text-text-muted">
              Enlaces a webs que usas a menudo. Salen en un icono de la cabecera y se abren en tu navegador.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Formulario */}
        <form onSubmit={guardar} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-3">
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">Nombre</label>
              <input className={inputCls} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Raíces" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">URL</label>
              <input className={inputCls} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://raices.madrid.org" />
            </div>
          </div>
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={guardando}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg uppercase tracking-wider hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : editando ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editando ? 'Guardar cambios' : 'Añadir enlace'}
            </button>
            {editando && (
              <button
                type="button"
                onClick={limpiar}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-text-muted rounded-lg uppercase tracking-wider hover:bg-surface-hover transition-all"
              >
                <X className="h-4 w-4" /> Cancelar
              </button>
            )}
          </div>
        </form>

        {/* Lista */}
        <div className="border-t border-border-base pt-4">
          {enlaces.length === 0 ? (
            <p className="text-sm text-text-muted italic">
              Todavía no hay enlaces. Cuando añadas el primero, aparecerá un icono en la cabecera.
            </p>
          ) : (
            <ul className="divide-y divide-border-base">
              {enlaces.map((e, i) => (
                <li key={e.id} className={`flex items-center gap-3 py-2.5 ${editando === e.id ? 'bg-primary-light/30 -mx-2 px-2 rounded-lg' : ''}`}>
                  <div className="flex flex-col">
                    <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} className="p-0.5 text-text-muted hover:text-primary disabled:opacity-30" aria-label="Subir">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => mover(i, 1)} disabled={i === enlaces.length - 1} className="p-0.5 text-text-muted hover:text-primary disabled:opacity-30" aria-label="Bajar">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-text-main truncate">{e.nombre}</p>
                    <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate inline-flex items-center gap-1 max-w-full">
                      <span className="truncate">{e.url}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                  <Title text="Editar">
                    <button type="button" onClick={() => editar(e)} className="p-1.5 text-text-muted hover:text-primary rounded-lg transition-colors">
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </Title>
                  <Title text="Eliminar">
                    <button type="button" onClick={() => borrar(e)} className="p-1.5 text-text-muted hover:text-danger rounded-lg transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </Title>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
