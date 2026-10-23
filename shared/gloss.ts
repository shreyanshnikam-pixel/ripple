/**
 * Reading Spanish. The engine's keywords are English, so a decision typed in Spanish is
 * glossed word by word into rough English before it is read: "Prohibir los celulares
 * durante la clase" is read as "ban the phones during class". The gloss only needs the
 * words that carry meaning to come through; the person still sees what they typed.
 */

const strip = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’‘]/g, "'");

/** Multi-word phrases first (longest wins), then single words. Keys are lowercase, without accents. */
const PHRASES: [string, string][] = [
  // phones & school
  ['telefonos celulares', 'phones'],
  ['durante las clases', 'during class'],
  ['durante la clase', 'during class'],
  ['en la clase', 'during class'],
  ['en clase', 'during class'],
  ['todo el dia escolar', 'for the entire school day'],
  ['toda la jornada escolar', 'for the entire school day'],
  ['la jornada escolar', 'the school day'],
  ['todo el dia', 'all day'],
  ['escuela secundaria', 'high school'],
  ['escuela preparatoria', 'high school'],
  ['escuela intermedia', 'middle school'],
  ['escuela primaria', 'elementary school'],
  ['en vez de', 'instead of'],
  ['en lugar de', 'instead of'],
  ['mas tarde', 'later'],
  ['mas temprano', 'earlier'],
  ['almuerzo escolar', 'school lunch'],
  ['comidas escolares', 'school meals'],
  ['semana escolar de cuatro dias', 'four-day school week'],
  ['semana de cuatro dias', 'four-day week'],
  ['inteligencia artificial', 'artificial intelligence'],
  ['redes sociales', 'social media'],
  ['consentimiento de los padres', 'parental consent'],
  ['permiso de los padres', 'parental consent'],
  ['detectores de metales', 'metal detectors'],
  ['detector de metales', 'metal detector'],
  ['oficial de recursos escolares', 'school resource officer'],
  ['oficiales de recursos escolares', 'school resource officers'],
  ['policias armados', 'armed police officers'],
  ['policia armada', 'armed police officers'],
  ['agentes de policia', 'police officers'],
  ['guardias armados', 'armed guards'],
  ['guardias de seguridad', 'security guards'],
  ['en todas las escuelas', 'in every school'],
  ['porten armas', 'carry guns'],
  ['portar armas', 'carry guns'],
  ['lleven armas', 'carry guns'],
  ['llevar armas', 'carry guns'],
  ['armas de fuego', 'guns'],
  // money, taxes, wages
  ['salario minimo', 'minimum wage'],
  ['sueldo minimo', 'minimum wage'],
  ['la hora', 'an hour'],
  ['por hora', 'an hour'],
  ['subir los impuestos', 'raise taxes'],
  ['subir impuestos', 'raise taxes'],
  ['aumentar los impuestos', 'raise taxes'],
  ['impuesto sobre la propiedad', 'property tax'],
  ['impuestos sobre la propiedad', 'property taxes'],
  ['impuesto predial', 'property tax'],
  ['impuestos prediales', 'property taxes'],
  ['impuesto sobre las ventas', 'sales tax'],
  ['impuesto a las ventas', 'sales tax'],
  ['grandes corporaciones', 'large corporations'],
  ['grandes empresas', 'large corporations'],
  ['los ricos', 'the rich'],
  ['bono escolar', 'school bond'],
  ['sueldos de los maestros', 'teacher salaries'],
  ['salarios de los maestros', 'teacher salaries'],
  ['sueldos docentes', 'teacher salaries'],
  // places & streets
  ['estacionamiento del centro', 'downtown parking lot'],
  ['del centro', 'downtown'],
  ['el centro', 'downtown'],
  ['cerca del centro', 'near downtown'],
  ['parque publico', 'public park'],
  ['en las afueras', 'outside town'],
  ['transporte publico', 'public transit'],
  ['de la ciudad', 'city'],
  ['carriles para bicicletas', 'bike lanes'],
  ['carriles de bicicleta', 'bike lanes'],
  ['ciclovias protegidas', 'protected bike lanes'],
  ['camaras de velocidad', 'speed cameras'],
  ['camaras de trafico', 'traffic cameras'],
  ['sopladoras de hojas', 'leaf blowers'],
  ['sopladores de hojas', 'leaf blowers'],
  ['a gasolina', 'gas-powered'],
  ['de gasolina', 'gas-powered'],
  ['autos a gasolina', 'gas-powered cars'],
  ['carros a gasolina', 'gas-powered cars'],
  ['coches a gasolina', 'gas-powered cars'],
  // housing
  ['personas sin hogar', 'homeless people'],
  ['sin hogar', 'homeless'],
  ['sin techo', 'homeless'],
  ['casas adosadas', 'townhomes'],
  ['casas unifamiliares', 'single-family homes'],
  ['viviendas unifamiliares', 'single-family homes'],
  ['vivienda publica', 'public housing'],
  ['viviendas publicas', 'public housing'],
  ['control de alquileres', 'rent control'],
  ['control de rentas', 'rent control'],
  ['aumentos anuales del alquiler', 'yearly rent increases'],
  ['aumentos anuales de la renta', 'yearly rent increases'],
  ['aumentos del alquiler', 'rent increases'],
  ['aumentos de alquiler', 'rent increases'],
  ['aumentos de la renta', 'rent increases'],
  ['subidas del alquiler', 'rent increases'],
  ['alta densidad', 'high-density'],
  ['bajos ingresos', 'low-income'],
  ['vivienda asequible', 'affordable housing'],
  ['viviendas asequibles', 'affordable housing'],
  ['edificio de apartamentos', 'apartment building'],
  ['edificios de apartamentos', 'apartment buildings'],
  // energy & climate
  ['granja solar', 'solar farm'],
  ['parque solar', 'solar farm'],
  ['planta solar', 'solar farm'],
  ['parque eolico', 'wind farm'],
  ['granja eolica', 'wind farm'],
  ['energia eolica', 'wind power'],
  ['energia solar', 'solar power'],
  ['energia limpia', 'clean energy'],
  ['energias renovables', 'renewable energy'],
  ['energia renovable', 'renewable energy'],
  ['combustibles fosiles', 'fossil fuels'],
  ['emisiones de carbono', 'carbon emissions'],
  ['impuesto al carbono', 'carbon tax'],
  ['estufas de gas', 'gas stoves'],
  ['cocinas de gas', 'gas stoves'],
  ['estufa de gas', 'gas stove'],
  ['plasticos de un solo uso', 'single-use plastics'],
  ['bolsas de plastico', 'plastic bags'],
  ['horario de verano', 'daylight saving time'],
  ['cambio de hora', 'clock change'],
  // Congress & elections
  ['miembros del congreso', 'members of Congress'],
  ['compren y vendan acciones', 'trading individual stocks'],
  ['comprar y vender acciones', 'trading individual stocks'],
  ['comerciar con acciones', 'trading individual stocks'],
  ['dia de las elecciones', 'Election Day'],
  ['dia de elecciones', 'Election Day'],
  ['dia electoral', 'Election Day'],
  ['feriado nacional', 'national holiday'],
  ['dia festivo nacional', 'national holiday'],
  ['identificacion con foto', 'photo ID'],
  ['prueba de ciudadania', 'proof of citizenship'],
  ['verificacion de antecedentes', 'background checks'],
  ['verificaciones de antecedentes', 'background checks'],
  ['armas de asalto', 'assault weapons'],
  ['corte suprema', 'Supreme Court'],
  ['limites de mandato', 'term limits'],
  ['voto popular', 'popular vote'],
  ['colegio electoral', 'Electoral College'],
  ['medicamentos recetados', 'prescription drugs'],
  // work & life
  ['trabajar desde casa', 'work remote'],
  ['trabajo remoto', 'remote work'],
  ['ano sabatico', 'gap year'],
  ['ano de descanso', 'gap year'],
  ['mi propio negocio', 'my own business'],
  ['examenes finales', 'final exams'],
  ['proyectos en grupo', 'group projects'],
  ['estoy pensando en', "I'm thinking about"],
  ['dejar mi trabajo', 'quit my job'],
  ['renunciar a mi trabajo', 'quit my job'],
  ['para abrir', 'to start'],
  ['abrir mi propio', 'start my own'],
  ['trabajen a distancia', 'work remote'],
  ['trabajar a distancia', 'work remote'],
  ['trabajo a distancia', 'remote work'],
  ['los viernes', 'on Fridays'],
  ['a partir de', 'starting'],
  ['impuesto local sobre las ventas', 'local sales tax'],
  ['al otro lado del pais', 'across the country'],
  ['antes de', 'before'],
  ['salario digno', 'living wage'],
  ['sueldo digno', 'living wage'],
  ['hacer del', 'make'],
  ['permitir que', 'allow'],
  ['gratis para', 'free for'],
  ['gratis a', 'free for'],
  ['dejar que', 'let'],
];

const WORDS: Record<string, string> = {
  // function words
  el: 'the', la: 'the', los: 'the', las: 'the', lo: '', del: 'of the', de: 'of', en: 'in', un: 'a', una: 'a', unos: 'some', unas: 'some',
  y: 'and', e: 'and', o: 'or', para: 'for', por: 'for', con: 'with', sin: 'without', que: 'that', al: 'to the', a: 'to', se: '', su: 'their', sus: 'their',
  mi: 'my', mis: 'my', nuestro: 'our', nuestra: 'our', nuestros: 'our', nuestras: 'our', este: 'this', esta: 'this', es: 'is', muy: 'very',
  mas: 'more', menos: 'less', cada: 'every', todo: 'all', toda: 'all', todos: 'all', todas: 'all', nuevo: 'new', nueva: 'new', nuevos: 'new', nuevas: 'new',
  cerca: 'near', entre: 'between', hasta: 'until', desde: 'from', antes: 'before', despues: 'after', durante: 'during', nunca: 'never', siempre: 'always',
  // verbs
  prohibir: 'ban', prohibe: 'ban', prohiban: 'ban', vetar: 'ban', permitir: 'allow', permitan: 'allow', dejar: 'let', subir: 'raise', aumentar: 'raise',
  bajar: 'lower', reducir: 'reduce', recortar: 'cut', eliminar: 'eliminate', quitar: 'remove', cerrar: 'close', abrir: 'open', construir: 'build',
  crear: 'create', convertir: 'turn', empezar: 'start', comenzar: 'start', iniciar: 'start', terminar: 'end', acabar: 'end', hacer: 'make', dar: 'give',
  poner: 'put', instalar: 'install', contratar: 'hire', exigir: 'require', requerir: 'require', obligar: 'require', limitar: 'cap', congelar: 'freeze',
  aprobar: 'pass', legalizar: 'legalize', financiar: 'fund', pagar: 'pay', cobrar: 'charge', gastar: 'spend', invertir: 'invest', arreglar: 'fix',
  reparar: 'fix', renovar: 'renovate', ampliar: 'expand', cambiar: 'switch', priorizar: 'prioritize', gravar: 'tax', renunciar: 'quit', mudarme: 'move',
  mudarnos: 'move', mudarse: 'move', adoptar: 'adopt', comprar: 'buy', vender: 'sell', votar: 'vote', registrar: 'register', cancelar: 'cancel',
  // nouns
  celular: 'phone', celulares: 'phones', telefono: 'phone', telefonos: 'phones', movil: 'phone', moviles: 'phones', dispositivos: 'devices',
  escuela: 'school', escuelas: 'schools', escolar: 'school', escolares: 'school', colegio: 'school', secundaria: 'high school', preparatoria: 'high school',
  clase: 'class', clases: 'classes', estudiantes: 'students', alumnos: 'students', maestros: 'teachers', maestras: 'teachers', profesores: 'teachers',
  docentes: 'teachers', padres: 'parents', adolescentes: 'teens', jovenes: 'young people', menores: 'minors', ninos: 'kids', almuerzo: 'lunch',
  desayuno: 'breakfast', uniformes: 'uniforms', tareas: 'homework', examenes: 'exams', biblioteca: 'library', piscina: 'pool', parque: 'park',
  parques: 'parks', estacionamiento: 'parking lot', ciudad: 'city', pueblo: 'town', barrio: 'neighborhood', barrios: 'neighborhoods', calle: 'street',
  calles: 'streets', autobuses: 'buses', autobus: 'bus', camiones: 'buses', ciclovias: 'bike lanes', policia: 'police', policias: 'police officers',
  armas: 'guns', seguridad: 'security', salario: 'wage', impuesto: 'tax', impuestos: 'taxes', bono: 'bond', bonos: 'bonds', millones: 'million',
  dolares: 'dollars', precios: 'prices', alquiler: 'rent', renta: 'rent', vivienda: 'housing', viviendas: 'housing', apartamentos: 'apartments',
  departamentos: 'apartments', condominios: 'condos', duplex: 'duplexes', albergue: 'shelter', refugio: 'shelter', edificios: 'buildings',
  edificio: 'building', viejos: 'old', viejas: 'old', acciones: 'stocks', congreso: 'Congress', elecciones: 'elections', marihuana: 'marijuana',
  empresa: 'company', negocio: 'business', tienda: 'shop', cafeteria: 'cafe', empleados: 'employees', trabajadores: 'workers', trabajo: 'job',
  universidad: 'college', mascota: 'pet', perro: 'dog', gato: 'cat', comunidad: 'community', gratis: 'free', gratuito: 'free', gratuita: 'free',
  gratuitos: 'free', gratuitas: 'free', publico: 'public', publica: 'public', asequible: 'affordable', asequibles: 'affordable', solar: 'solar',
  eolica: 'wind', carbono: 'carbon', emisiones: 'emissions', anual: 'yearly', anuales: 'yearly', aumentos: 'increases', grandes: 'large',
  corporaciones: 'corporations', ricos: 'rich', tiktok: 'TikTok',
  reemplazar: 'replace', sustituir: 'replace', finales: 'final', proyectos: 'projects', grupo: 'group', panaderia: 'bakery', proxima: 'next', proximo: 'next',
  primavera: 'spring', otono: 'fall', verano: 'summer', invierno: 'winter', deberia: 'should I', tomarme: 'take', tomar: 'take', personal: 'staff',
  pagarle: 'pay', pagarles: 'pay', empaques: 'packaging', envases: 'packaging', compostables: 'compostable', distrito: 'district', estoy: "I'm",
  pais: 'country', mudar: 'move', viajar: 'travel', estudiar: 'study',
};

const PHRASE_LIST = [...PHRASES].sort((a, b) => b[0].length - a[0].length);
const SPANISH_ONLY = new Set(['el', 'la', 'los', 'las', 'del', 'de', 'en', 'un', 'una', 'y', 'para', 'por', 'con', 'que', 'al', 'nuestra', 'nuestro', 'mas']);
const ENGLISH_ONLY = new Set(['the', 'of', 'to', 'for', 'and', 'in', 'on', 'at', 'with', 'from', 'by', 'our', 'every', 'all', 'is', 'an', 'my', 'we', 'i']);
const BOTH = new Set(['a', 'e', 'o', 'solar', 'duplex', 'tiktok', 'gratis', 'parque', 'personal', 'final', 'distrito']);
const SPANISH_ENDINGS = /(cion|ciones|idad|mente)$/;

/** True when a decision is written in Spanish. English with a Spanish word or two ("plan a fiesta") stays English. */
export function looksSpanish(text: string): boolean {
  const tokens = strip(text).split(/[^a-z0-9ñ]+/).filter(Boolean);
  if (!tokens.length) return false;
  let es = 0;
  let en = 0;
  let known = 0;
  for (const t of tokens) {
    if (SPANISH_ONLY.has(t)) es++;
    else if (ENGLISH_ONLY.has(t)) en++;
    else if (t in WORDS || SPANISH_ENDINGS.test(t)) {
      // Words spelled the same in both languages don't count.
      if (!BOTH.has(t)) known++;
    }
  }
  if (/[ñ¿¡]|[áéíóú]/i.test(text)) es++;
  return es + known >= 2 ? es + known > en : en === 0 && known >= 1;
}

/** A rough English reading of a Spanish decision, for the engine's keywords. */
export function glossSpanish(text: string): string {
  let s = ' ' + strip(text).replace(/\s+/g, ' ').trim() + ' ';
  // "al 5%" → "at 5%"; "$40 millones" → "$40 million"
  s = s.replace(/ al (\d)/g, ' at $1').replace(/ a las (\d)/g, ' at $1');
  // Phrases are replaced with placeholders so their English isn't glossed again word by word.
  const held: string[] = [];
  for (const [es, en] of PHRASE_LIST) {
    const re = new RegExp(` ${es.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?= )`, 'g');
    s = s.replace(re, () => {
      held.push(en);
      return ` \u0000${held.length - 1}\u0000`;
    });
  }
  const out = s
    .trim()
    .split(' ')
    .map((w) => {
      const m = /^\u0000(\d+)\u0000$/.exec(w);
      if (m) return held[Number(m[1])];
      const core = w.replace(/^[^a-z0-9ñ$]+|[^a-z0-9ñ%.]+$/g, '');
      if (core in WORDS) return w.replace(core, WORDS[core]);
      return w;
    })
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return out;
}
