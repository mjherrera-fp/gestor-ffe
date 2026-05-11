import { Html, Button, Text, Heading } from '@react-email/components';
import { Alumno, Empresa } from '../types';

export const EmpresaTemplate = (empresa: Empresa) => (
  <Html>
    <Heading>Hola, {empresa.nombre}</Heading>
    <Text>Te informamos que tu periodo de FCT está próximo a comenzar...</Text>
    <Button href="https://educamadrid.org">Ver Detalles</Button>
  </Html>
);