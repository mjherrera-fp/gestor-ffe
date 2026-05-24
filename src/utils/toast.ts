type ToastType = 'success' | 'error' | 'info';

export function mostrarToast(mensaje: string, tipo: ToastType = 'success', duracion = 4000) {
  const iconos: Record<ToastType, string> = {
    success: `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>`,
    error: `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>`,
    info: `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>`
  };

  const bgColors: Record<ToastType, string> = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    error: 'bg-red-50 border-red-200 text-red-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700'
  };

  const iconColors: Record<ToastType, string> = {
    success: 'bg-emerald-100 text-emerald-600',
    error: 'bg-red-100 text-red-600',
    info: 'bg-blue-100 text-blue-600'
  };

  const toast = document.createElement('div');
  toast.className = `fixed bottom-4 right-4 z-[200] ${bgColors[tipo]} border rounded-2xl shadow-xl p-4 max-w-sm w-full animate-in slide-in-from-right-5 fade-in duration-300`;

  toast.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="p-1.5 rounded-lg ${iconColors[tipo]} shrink-0">
        ${iconos[tipo]}
      </div>
      <p class="text-sm font-medium">${mensaje}</p>
      <button class="ml-auto shrink-0 p-1 hover:opacity-70 transition-opacity" onclick="this.parentElement.parentElement.remove()">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, duracion);
}
