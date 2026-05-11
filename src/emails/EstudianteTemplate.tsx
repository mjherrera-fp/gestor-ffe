import { Html, Button, Text, Heading } from '@react-email/components';
import { Alumno } from '../types';

export const EstudianteTemplate = (estudiante: Alumno ) => (
  <Html>
    <Heading>Hola, {estudiante.nombre}</Heading>
    <Text>Te informamos que tu periodo de FCT está próximo a comenzar...</Text>
    <Button href="https://educamadrid.org">Ver Detalles</Button>
  </Html>
);