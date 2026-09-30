import React from 'react';
import { Profesor } from '../../types/index.ts';

import { usePerfilProfesor } from './hooks/usePerfilProfesor.ts';
import { ProfesorForm }      from './components/ProfesorForm.tsx';

interface Props {
  profesor: Profesor | null;
  onUpdate: (profesor: Profesor) => void;
}

/**
 * Seccion Profesor: solo los datos personales.
 *
 * Los centros educativos y sus ciclos son la seccion Centros, con su propia
 * entrada en el menu y su propio hook. El calendario de festivos de cada
 * centro tambien vive alli, dentro del formulario del centro.
 */
export default function ProfesorView({ profesor, onUpdate }: Props) {
  const ctx = usePerfilProfesor(profesor, onUpdate);

  return (
    <ProfesorForm
      formData={ctx.formData}
      setFormData={ctx.setFormData}
      saving={ctx.saving}
      success={ctx.success}
      onSubmit={ctx.handleSubmitProfesor}
    />
  );
}
