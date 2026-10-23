import type { Scope } from './types';

export interface Example {
  text: string;
  scope: Scope;
  tag: string;
  /** The same decision in Spanish (Ripple reads both). */
  es: string;
}

/** Sample decisions used across the UI (hero placeholder, chips, use cases). */
export const EXAMPLES: Example[] = [
  { text: 'Start high school at 9:00 a.m. instead of 7:30 so students get more sleep', scope: 'school', tag: 'School board', es: 'Empezar la secundaria a las 9:00 a.m. en vez de las 7:30 para que los estudiantes duerman más' },
  { text: 'Ban phones during the school day', scope: 'school', tag: 'Principal', es: 'Prohibir los celulares durante la jornada escolar' },
  { text: 'Switch our district to a four-day school week', scope: 'school', tag: 'District', es: 'Cambiar nuestro distrito a una semana escolar de cuatro días' },
  { text: 'Replace final exams with group projects', scope: 'school', tag: 'Teachers', es: 'Reemplazar los exámenes finales con proyectos en grupo' },
  { text: 'Turn the downtown parking lot into a public park', scope: 'community', tag: 'City council', es: 'Convertir el estacionamiento del centro en un parque público' },
  { text: 'Ban gas-powered leaf blowers in our town starting next spring', scope: 'community', tag: 'Town board', es: 'Prohibir las sopladoras de hojas a gasolina en nuestro pueblo a partir de la próxima primavera' },
  { text: 'Raise the local sales tax by 1% to fund a new library', scope: 'community', tag: 'Ballot measure', es: 'Subir el impuesto local sobre las ventas un 1% para financiar una nueva biblioteca' },
  { text: 'Make city buses free for everyone', scope: 'community', tag: 'Transit', es: 'Hacer gratis los autobuses de la ciudad para todos' },
  { text: "I'm thinking about quitting my job to start a bakery", scope: 'personal', tag: 'Career', es: 'Estoy pensando en dejar mi trabajo para abrir una panadería' },
  { text: 'Should I take a gap year before college?', scope: 'personal', tag: 'Education', es: '¿Debería tomarme un año sabático antes de la universidad?' },
  { text: 'Move across the country for a new job', scope: 'personal', tag: 'Life', es: 'Mudarme al otro lado del país por un nuevo trabajo' },
  { text: 'Raise our café prices by 15% to pay staff a living wage', scope: 'business', tag: 'Small business', es: 'Subir los precios de nuestro café un 15% para pagarle al personal un salario digno' },
  { text: 'Let our employees work remote on Fridays', scope: 'business', tag: 'Workplace', es: 'Dejar que nuestros empleados trabajen a distancia los viernes' },
  { text: 'Switch our shop to 100% compostable packaging', scope: 'business', tag: 'Sustainability', es: 'Cambiar nuestra tienda a empaques 100% compostables' },
];
