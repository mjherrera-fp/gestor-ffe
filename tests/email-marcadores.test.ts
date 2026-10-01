import { describe, it, expect } from 'vitest';
import {
  MARCADORES_POR_AMBITO,
  applyCustomMarkers,
  interpolarCuerpo,
  marcadoresAjenos,
  marcadoresDeAmbito,
  textoMarcador,
} from '../templates/emails/emailTemplates.ts';

// ─────────────────────────────────────────────────────────────────────────────
//  Marcadores de las plantillas de correo.
//
//  Lo que se mide aquí es una regla de la que depende el resto: lo que el
//  profesor ve en Configuración > Correo tiene que ser exactamente lo que el
//  envío sabe resolver. Cuando las dos listas se separaron, el catálogo ofrecía
//  marcadores que ningún ámbito implementaba, y el correo salía a la empresa con
//  las llaves puestas. Estos tests son lo que impide que vuelvan a separarse.
//
//  La otra mitad es el comportamiento ante un marcador sin valor: hueco y aviso,
//  nunca texto crudo. Un correo enviado a una empresa no puede llevar
//  `{{profesor.nombre}}` dentro.
// ─────────────────────────────────────────────────────────────────────────────

const CONTEXTO = {
  profesor: { nombre: 'Ana', apellidos: 'Ruiz' },
  empresa: { nombre: 'Talleres SL', direccion: 'Calle Mayor 1', personaContacto: 'Luis' },
  tutor: { nombre: 'Marta', apellidos: 'Gómez' },
  centro: { nombre: 'IES Prueba' },
  curso: { descripcion: 'Administración' },
  relacion: { numRelacion: 'R-2025-01' },
  nombreApellidosAlumnos: 'Ana Ruiz',
  alumnoTutor: 'Marta Gómez',
};

describe('el catálogo de marcadores', () => {
  it('cada ámbito tiene marcadores, y ninguno se repite', () => {
    for (const [ambito, marcadores] of Object.entries(MARCADORES_POR_AMBITO)) {
      expect(marcadores.length, `${ambito} se quedó sin marcadores`).toBeGreaterThan(0);

      const claves = marcadores.map(m => m.clave);
      expect(new Set(claves).size, `${ambito} tiene marcadores repetidos`).toBe(claves.length);
    }
  });

  it('sin ámbito se cae a los de empresa, que es lo que se crea por defecto', () => {
    expect(marcadoresDeAmbito(undefined)).toBe(MARCADORES_POR_AMBITO.empresa);
    expect(marcadoresDeAmbito(null)).toBe(MARCADORES_POR_AMBITO.empresa);
    expect(marcadoresDeAmbito('lo-que-sea')).toBe(MARCADORES_POR_AMBITO.empresa);
    expect(marcadoresDeAmbito('relaciones')).toBe(MARCADORES_POR_AMBITO.relaciones);
  });

  it('los marcadores por destinatario se escriben con el prefijo @', () => {
    expect(textoMarcador({ clave: 'contacto', etiqueta: '', grupo: '', porDestinatario: true }))
      .toBe('{{@contacto}}');
    expect(textoMarcador({ clave: 'empresa.nombre', etiqueta: '', grupo: '' }))
      .toBe('{{empresa.nombre}}');
  });

  it('lo que se ofrece son marcadores, no llaves sueltas: el @ no está dentro de la clave', () => {
    // El motor no distingue `{{@contacto}}` de `{{contacto}}`: los dos se
    // resuelven con `interpolarCuerpo`. Si la clave llevara el `@`, el modal
    // seek-and-replace por destinatario no encontraría su marca.
    const porDestinatario = MARCADORES_POR_AMBITO.relaciones.filter(m => m.porDestinatario);
    expect(porDestinatario.length).toBeGreaterThan(0);
    for (const m of porDestinatario) {
      expect(m.clave).not.toContain('@');
    }
  });
});

describe('interpolarCuerpo', () => {
  it('sustituye los marcadores anidados por su valor', () => {
    const { texto, sinResolver } = interpolarCuerpo(
      'Hola {{profesor.nombre}} {{profesor.apellidos}}, de {{empresa.nombre}}.',
      CONTEXTO,
    );
    expect(texto).toBe('Hola Ana Ruiz, de Talleres SL.');
    expect(sinResolver).toEqual([]);
  });

  it('un marcador sin valor se queda vacío, nunca con las llaves puestas', () => {
    const { texto, sinResolver } = interpolarCuerpo('Hola {{empresa.nombre}}', {});
    // Lo leen la empresa, no el profesor: `{{empresa.nombre}}` en un correo
    // enviado no es un marcador pendiente, es un fallo.
    expect(texto).toBe('Hola ');
    expect(texto).not.toContain('{{');
    expect(sinResolver).toEqual(['empresa.nombre']);
  });

  it('avisa de cada marcador sin resolver una sola vez', () => {
    const { sinResolver } = interpolarCuerpo(
      '{{profesor.nombre}} {{profesor.apellidos}} {{profesor.nombre}}',
      { profesor: {} },
    );
    expect(sinResolver).toEqual(['profesor.nombre', 'profesor.apellidos']);
  });

  it('una cadena vacía cuenta como sin resolver: "Estimado/a, " sin nombre es un fallo', () => {
    const { texto, sinResolver } = interpolarCuerpo('Estimado/a, {{alumnoTutor}}:', {
      alumnoTutor: '   ',
    });
    expect(texto).toBe('Estimado/a, :');
    expect(sinResolver).toEqual(['alumnoTutor']);
  });

  it('un valor de 0 es un valor, no un hueco', () => {
    const { texto, sinResolver } = interpolarCuerpo('Duración: {{duracion}}', { duracion: 0 });
    expect(texto).toBe('Duración: 0');
    expect(sinResolver).toEqual([]);
  });

  it('no se confond los marcadores por destinatario con los normales', () => {
    // Los `{{@...}}` los pone el modal uno a uno. Este motor no los toca, y no
    // debe reportarlos como fallidos: no es que falte el dato, es que aquí no
    // es donde se resuelve.
    const { texto, sinResolver } = interpolarCuerpo('Hola {{@contacto}}', {});
    expect(texto).toBe('Hola {{@contacto}}');
    expect(sinResolver).toEqual([]);
  });

  it('deja intacto lo que no es un marcador', () => {
    const cuerpo = '<p>Ver <a href="https://x.test">x</a></p>';
    expect(interpolarCuerpo(cuerpo, CONTEXTO).texto).toBe(cuerpo);
  });
});

describe('marcadoresAjenos', () => {
  it('avisa de lo que ese ámbito no puede resolver', () => {
    // El caso real: el catálogo antiguo ofrecía estos en 'relaciones' y nadie
    // los implementaba, así que llegaban en crudo a la empresa.
    const ajenos = marcadoresAjenos('Hola {{empresa.nombre}} y {{curso.descripcion}}', 'empresa');
    expect(ajenos).not.toContain('{{empresa.nombre}}');
    expect(ajenos).not.toContain('{{centro.nombre}}');
  });

  it('no se queja de los que el ámbito sí resuelve', () => {
    expect(marcadoresAjenos('{{profesor.nombre}} {{tutor.nombre}}', 'relaciones')).toEqual([]);
  });

  it('ignora los personalizados y los por destinatario', () => {
    // Los `per_` los resuelve `applyCustomMarkers`, y los `{{@...}}` el modal.
    // Ninguno de los dos pasa por aquí, así que avisar de ellos sería ruido.
    expect(marcadoresAjenos('{{per_cargo}} {{@contacto}}', 'empresa')).toEqual([]);
  });

  it('señala la errata una sola vez aunque se repita', () => {
    expect(marcadoresAjenos('{{relaion.numero}} {{relaion.numero}}', 'relaciones'))
      .toEqual(['{{relaion.numero}}']);
  });
});

describe('el ámbito de convenio', () => {
  const CONTEXTO_CONVENIO = {
    profesor: { nombre: 'Ana', apellidos: 'Ruiz' },
    empresa: { nombre: 'Talleres SL', direccion: 'Calle Mayor 1', personaContacto: 'Luis' },
    centro: { nombre: 'IES Prueba' },
    curso: { descripcion: 'Administración' },
    convenio: { numConvenio: 'C-28001-0004', fechaConvenio: '2026-03-02' },
  };

  it('resuelve los datos del convenio, que es lo que se comunica', () => {
    const { texto, sinResolver } = interpolarCuerpo(
      'Convenio {{convenio.numConvenio}} de {{curso.descripcion}} con fecha {{convenio.fechaConvenio}}',
      CONTEXTO_CONVENIO,
    );
    expect(texto).toBe('Convenio C-28001-0004 de Administración con fecha 2026-03-02');
    expect(sinResolver).toEqual([]);
  });

  it('no ofrece marcadores de relación ni de tutor: desde un convenio no hay de dónde sacarlos', () => {
    const claves = MARCADORES_POR_AMBITO.convenio.map(m => m.clave);
    // El catálogo solo ofrece lo que el ámbito resuelve. Ofrecer el alumnado o
    // el tutor aquí los dejaría vacíos en cada envío, que es justo la clase de
    // marcador que este archivo existe para que no exista.
    expect(claves).not.toContain('nombreApellidosAlumnos');
    expect(claves.some(c => c.startsWith('relacion.'))).toBe(false);
    expect(claves.some(c => c.startsWith('tutor.'))).toBe(false);
    expect(claves.some(c => c.startsWith('alumno'))).toBe(false);
  });

  it('avisa de los marcadores de relación si el profesor los escribe igualmente', () => {
    expect(marcadoresAjenos('Hola {{nombreApellidosAlumnos}}', 'convenio'))
      .toEqual(['{{nombreApellidosAlumnos}}']);
  });

  it('admite el envío por destinatario, que es a quien va este correo', () => {
    const porDestinatario = MARCADORES_POR_AMBITO.convenio.filter(m => m.porDestinatario);
    expect(porDestinatario.map(m => m.clave)).toEqual(['contacto', 'nombreEmpresa']);
  });

  it('un convenio sin fecha avisa en vez de mandar la llave en crudo', () => {
    const { texto, sinResolver } = interpolarCuerpo(
      'Fecha: {{convenio.fechaConvenio}}',
      { convenio: { numConvenio: 'C-28001-0004', fechaConvenio: '' } },
    );
    expect(texto).toBe('Fecha: ');
    expect(sinResolver).toEqual(['convenio.fechaConvenio']);
  });

  it('el asunto se interpola con las mismas reglas que el cuerpo', () => {
    // La línea de asunto la lee la empresa igual que el cuerpo. La
    // interpolación se aplicaba solo al cuerpo, así que un marcador en el
    // asunto llegaba en crudo: no era un marcador pendiente, era un fallo.
    const { texto, sinResolver } = interpolarCuerpo(
      'Convenio de prácticas {{convenio.numConvenio}}',
      CONTEXTO_CONVENIO,
    );
    expect(texto).toBe('Convenio de prácticas C-28001-0004');
    expect(texto).not.toContain('{{');
    expect(sinResolver).toEqual([]);
  });
});

describe('applyCustomMarkers', () => {
  it('sustituye los personalizados en todas sus apariciones', () => {
    const cuerpo = applyCustomMarkers('De {{per_departamento}}, {{per_departamento}}', [
      { nombre: 'departamento', valor: 'Administración' },
    ]);
    expect(cuerpo).toBe('De Administración, Administración');
  });

  it('un nombre con puntos no se trata como un comodín', () => {
    // El nombre lo escribe el profesor, y los puntos en un regex son comodines.
    // Sin escapar, `per_curso` sustituiría también a `per_curso2025`.
    const cuerpo = applyCustomMarkers('{{per_curso}} y {{per_curso2025}}', [
      { nombre: 'curso', valor: 'ADE' },
    ]);
    expect(cuerpo).toBe('ADE y {{per_curso2025}}');
  });

  it('un personalizado sin valor se deja como está', () => {
    // A diferencia de los marcadores del catálogo, aquí no se borra: el
    // `interpolarCuerpo` posterior es quien decide qué hacer con lo que queda.
    expect(applyCustomMarkers('{{per_vacio}}', [])).toBe('{{per_vacio}}');
  });
});