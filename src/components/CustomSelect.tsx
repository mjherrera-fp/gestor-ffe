import { Listbox, ListboxButton, ListboxOptions, ListboxOption, Transition } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';
import { Fragment } from 'react';

interface Option {
  id: string | number | undefined; // Añadimos undefined aquí
  label: string;
}

interface Props {
  options: Option[];
  value: string | number;
  onChange: (value: any) => void;
  label?: string;
  required?: boolean; // 1. Añadimos la prop required
  name?: string;     // 2. Recomendado añadir un nombre para el formulario
  classListboxButton?: string; // 3. Para personalizar estilos desde el padre
}

export function CustomSelect({ options, value, onChange, label, required, name, classListboxButton }: Props) {
  const selected = options.find(o => o.id === value);

  return (
    <div className="w-full">
      {label && <label className="block text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1">{label}</label>}

      <Listbox value={value} onChange={onChange}>
        <div className="relative mt-1">
          {/* Input oculto para validación nativa */}
          <input
            tabIndex={-1}
            autoComplete="off"
            style={{ opacity: 0, position: 'absolute', bottom: 0, left: '50%', height: 1, width: 1 }}
            value={value || ''}
            readOnly
            required={required}
            name={name}
          />

          {/* ListboxButton en lugar de Listbox.Button */}
          <ListboxButton className={`relative w-full cursor-pointer bg-white border rounded-xl py-2.5 pl-4 pr-10 text-left text-xs font-bold transition-all outline-none focus:ring-4 focus:ring-primary/10 
            ${required && !value ? 'border-red-200' : 'border-slate-200 focus:border-primary'} 
            ${value ? 'text-slate-700' : 'text-slate-400'} ${classListboxButton}`}>
            <span className="block truncate">{selected ? selected.label : 'Seleccionar...'}</span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
            </span>
          </ListboxButton>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            {/* ListboxOptions en lugar de Listbox.Options */}
            <ListboxOptions
              className="absolute z-50 mt-2 max-h-60 overflow-auto rounded-2xl bg-white py-2 text-xs shadow-2xl ring-1 ring-black/5 focus:outline-none animate-in fade-in zoom-in-95 duration-200
               w-max min-w-full left-0">
              {options.map((option) => (
                /* ListboxOption en lugar de Listbox.Option */
                <ListboxOption
                  key={option.id}
                  value={option.id}
                  className={({ focus }) =>
                    `relative cursor-pointer select-none py-3 pl-10 pr-4 transition-colors ${focus ? 'bg-slate-50 text-primary' : 'text-slate-700'
                    }`
                  }
                >
                  {({ selected }) => (
                    <>
                      <span className={`block truncate ${selected ? 'font-black' : 'font-medium'}`}>
                        {option.label}
                      </span>
                      {selected && (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary">
                          <Check className="h-4 w-4" aria-hidden="true" />
                        </span>
                      )}
                    </>
                  )}
                </ListboxOption>
              ))}
            </ListboxOptions>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
}