import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

const LIMIT_OPTIONS = [25, 50, 100, 200];

export default function Pagination({ page, totalPages, limit, total, onPageChange, onLimitChange }: PaginationProps) {
  if (totalPages <= 1 && total <= limit) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-surface-card border-t border-border-base rounded-b-2xl">
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <span>Mostrar</span>
        <select
          value={limit}
          onChange={e => onLimitChange(Number(e.target.value))}
          className="border border-border-base rounded-lg px-2 py-1 text-xs outline-none focus:border-primary bg-surface-card"
        >
          {LIMIT_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <span>de {total} registros</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs text-text-muted font-medium px-2">
          Página {page} de {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
