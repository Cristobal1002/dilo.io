import type { ClientTaxIdType } from '@/lib/client-fields'

export type ClientKind = 'person' | 'company'

export const CLIENT_COUNTRIES = [
  { code: 'CO', name: 'Colombia', iso2: 'co' },
  { code: 'MX', name: 'México', iso2: 'mx' },
  { code: 'PE', name: 'Perú', iso2: 'pe' },
  { code: 'CL', name: 'Chile', iso2: 'cl' },
  { code: 'AR', name: 'Argentina', iso2: 'ar' },
  { code: 'EC', name: 'Ecuador', iso2: 'ec' },
  { code: 'VE', name: 'Venezuela', iso2: 've' },
  { code: 'HN', name: 'Honduras', iso2: 'hn' },
  { code: 'CR', name: 'Costa Rica', iso2: 'cr' },
  { code: 'US', name: 'Estados Unidos', iso2: 'us' },
  { code: 'ES', name: 'España', iso2: 'es' },
] as const

export type ClientCountryCode = (typeof CLIENT_COUNTRIES)[number]['code']

type RegionOption = { value: string; label: string }

/** Departamento / estado / provincia por país (sin texto libre). */
const REGIONS: Record<string, RegionOption[]> = {
  CO: [
    'Amazonas',
    'Antioquia',
    'Arauca',
    'Atlántico',
    'Bolívar',
    'Boyacá',
    'Caldas',
    'Caquetá',
    'Casanare',
    'Cauca',
    'Cesar',
    'Chocó',
    'Córdoba',
    'Cundinamarca',
    'Guainía',
    'Guaviare',
    'Huila',
    'La Guajira',
    'Magdalena',
    'Meta',
    'Nariño',
    'Norte de Santander',
    'Putumayo',
    'Quindío',
    'Risaralda',
    'San Andrés y Providencia',
    'Santander',
    'Sucre',
    'Tolima',
    'Valle del Cauca',
    'Vaupés',
    'Vichada',
    'Bogotá D.C.',
  ].map((r) => ({ value: r, label: r })),
  MX: [
    'Aguascalientes',
    'Baja California',
    'Baja California Sur',
    'Campeche',
    'Chiapas',
    'Chihuahua',
    'Ciudad de México',
    'Coahuila',
    'Colima',
    'Durango',
    'Estado de México',
    'Guanajuato',
    'Guerrero',
    'Hidalgo',
    'Jalisco',
    'Michoacán',
    'Morelos',
    'Nayarit',
    'Nuevo León',
    'Oaxaca',
    'Puebla',
    'Querétaro',
    'Quintana Roo',
    'San Luis Potosí',
    'Sinaloa',
    'Sonora',
    'Tabasco',
    'Tamaulipas',
    'Tlaxcala',
    'Veracruz',
    'Yucatán',
    'Zacatecas',
  ].map((r) => ({ value: r, label: r })),
  PE: [
    'Amazonas',
    'Áncash',
    'Apurímac',
    'Arequipa',
    'Ayacucho',
    'Cajamarca',
    'Callao',
    'Cusco',
    'Huancavelica',
    'Huánuco',
    'Ica',
    'Junín',
    'La Libertad',
    'Lambayeque',
    'Lima',
    'Loreto',
    'Madre de Dios',
    'Moquegua',
    'Pasco',
    'Piura',
    'Puno',
    'San Martín',
    'Tacna',
    'Tumbes',
    'Ucayali',
  ].map((r) => ({ value: r, label: r })),
  CL: [
    'Arica y Parinacota',
    'Tarapacá',
    'Antofagasta',
    'Atacama',
    'Coquimbo',
    'Valparaíso',
    'Metropolitana de Santiago',
    'O\'Higgins',
    'Maule',
    'Ñuble',
    'Biobío',
    'Araucanía',
    'Los Ríos',
    'Los Lagos',
    'Aysén',
    'Magallanes',
  ].map((r) => ({ value: r, label: r })),
  AR: [
    'Buenos Aires',
    'CABA',
    'Catamarca',
    'Chaco',
    'Chubut',
    'Córdoba',
    'Corrientes',
    'Entre Ríos',
    'Formosa',
    'Jujuy',
    'La Pampa',
    'La Rioja',
    'Mendoza',
    'Misiones',
    'Neuquén',
    'Río Negro',
    'Salta',
    'San Juan',
    'San Luis',
    'Santa Cruz',
    'Santa Fe',
    'Santiago del Estero',
    'Tierra del Fuego',
    'Tucumán',
  ].map((r) => ({ value: r, label: r })),
  EC: [
    'Azuay',
    'Bolívar',
    'Cañar',
    'Carchi',
    'Chimborazo',
    'Cotopaxi',
    'El Oro',
    'Esmeraldas',
    'Galápagos',
    'Guayas',
    'Imbabura',
    'Loja',
    'Los Ríos',
    'Manabí',
    'Morona Santiago',
    'Napo',
    'Orellana',
    'Pastaza',
    'Pichincha',
    'Santa Elena',
    'Santo Domingo de los Tsáchilas',
    'Sucumbíos',
    'Tungurahua',
    'Zamora Chinchipe',
  ].map((r) => ({ value: r, label: r })),
  VE: [
    'Amazonas',
    'Anzoátegui',
    'Apure',
    'Aragua',
    'Barinas',
    'Bolívar',
    'Carabobo',
    'Cojedes',
    'Delta Amacuro',
    'Distrito Capital',
    'Falcón',
    'Guárico',
    'Lara',
    'Mérida',
    'Miranda',
    'Monagas',
    'Nueva Esparta',
    'Portuguesa',
    'Sucre',
    'Táchira',
    'Trujillo',
    'Vargas',
    'Yaracuy',
    'Zulia',
  ].map((r) => ({ value: r, label: r })),
  HN: [
    'Atlántida',
    'Choluteca',
    'Colón',
    'Comayagua',
    'Copán',
    'Cortés',
    'El Paraíso',
    'Francisco Morazán',
    'Gracias a Dios',
    'Intibucá',
    'Islas de la Bahía',
    'La Paz',
    'Lempira',
    'Ocotepeque',
    'Olancho',
    'Santa Bárbara',
    'Valle',
    'Yoro',
  ].map((r) => ({ value: r, label: r })),
  CR: [
    'San José',
    'Alajuela',
    'Cartago',
    'Heredia',
    'Guanacaste',
    'Puntarenas',
    'Limón',
  ].map((r) => ({ value: r, label: r })),
  US: [
    'California',
    'Texas',
    'Florida',
    'New York',
    'Illinois',
    'Georgia',
    'Otro estado',
  ].map((r) => ({ value: r, label: r })),
  ES: [
    'Andalucía',
    'Aragón',
    'Canarias',
    'Castilla y León',
    'Castilla-La Mancha',
    'Cataluña',
    'Comunidad de Madrid',
    'Comunidad Valenciana',
    'Galicia',
    'País Vasco',
    'Otra comunidad',
  ].map((r) => ({ value: r, label: r })),
}

/** Ciudades principales por departamento (evita texto libre). */
const CITIES: Record<string, Record<string, string[]>> = {
  CO: {
    Antioquia: ['Medellín', 'Bello', 'Envigado', 'Itagüí', 'Rionegro'],
    'Bogotá D.C.': ['Bogotá'],
    Cundinamarca: ['Soacha', 'Facatativá', 'Chía', 'Zipaquirá', 'Girardot'],
    'Valle del Cauca': ['Cali', 'Palmira', 'Buenaventura', 'Tuluá'],
    Atlántico: ['Barranquilla', 'Soledad', 'Malambo'],
    Santander: ['Bucaramanga', 'Floridablanca', 'Piedecuesta'],
    Bolívar: ['Cartagena', 'Magangué'],
    'Norte de Santander': ['Cúcuta', 'Villa del Rosario'],
    Risaralda: ['Pereira', 'Dosquebradas'],
    Quindío: ['Armenia', 'Calarcá'],
    Tolima: ['Ibagué', 'Espinal'],
    Meta: ['Villavicencio'],
    Nariño: ['Pasto', 'Ipiales'],
    Huila: ['Neiva', 'Pitalito'],
    Magdalena: ['Santa Marta', 'Ciénaga'],
    Cesar: ['Valledupar'],
    Boyacá: ['Tunja', 'Duitama', 'Sogamoso'],
    Caldas: ['Manizales'],
    Casanare: ['Yopal'],
    Sucre: ['Sincelejo'],
    'La Guajira': ['Riohacha', 'Maicao'],
  },
  MX: {
    Jalisco: ['Guadalajara', 'Zapopan', 'Tlaquepaque'],
    'Ciudad de México': ['Ciudad de México'],
    'Nuevo León': ['Monterrey', 'San Pedro Garza García'],
    'Estado de México': ['Ecatepec', 'Naucalpan', 'Toluca'],
    Puebla: ['Puebla', 'Tehuacán'],
    Guanajuato: ['León', 'Irapuato', 'Celaya'],
    Veracruz: ['Veracruz', 'Xalapa'],
    Yucatán: ['Mérida'],
    'Quintana Roo': ['Cancún', 'Playa del Carmen'],
  },
  PE: {
    Lima: ['Lima', 'Miraflores', 'San Isidro', 'Callao'],
    Arequipa: ['Arequipa'],
    'La Libertad': ['Trujillo'],
    Cusco: ['Cusco'],
    Piura: ['Piura'],
  },
  CL: {
    'Metropolitana de Santiago': ['Santiago', 'Maipú', 'Las Condes', 'Puente Alto'],
    Valparaíso: ['Valparaíso', 'Viña del Mar'],
    Biobío: ['Concepción', 'Talcahuano'],
  },
  AR: {
    CABA: ['Ciudad Autónoma de Buenos Aires'],
    'Buenos Aires': ['La Plata', 'Mar del Plata'],
    Córdoba: ['Córdoba', 'Villa Carlos Paz'],
    Mendoza: ['Mendoza'],
    'Santa Fe': ['Rosario', 'Santa Fe'],
  },
  EC: { Pichincha: ['Quito'], Guayas: ['Guayaquil', 'Durán'] },
  VE: { Miranda: ['Caracas', 'Los Teques'], Carabobo: ['Valencia'], Zulia: ['Maracaibo'] },
  HN: { 'Francisco Morazán': ['Tegucigalpa', 'Comayagüela'], Cortés: ['San Pedro Sula'] },
  CR: { 'San José': ['San José'], Alajuela: ['Alajuela'], Heredia: ['Heredia'] },
  US: {
    California: ['Los Angeles', 'San Francisco', 'San Diego'],
    Texas: ['Houston', 'Dallas', 'Austin'],
    Florida: ['Miami', 'Orlando', 'Tampa'],
    'New York': ['New York City', 'Buffalo'],
  },
  ES: {
    'Comunidad de Madrid': ['Madrid'],
    Cataluña: ['Barcelona'],
    Andalucía: ['Sevilla', 'Málaga'],
    'Comunidad Valenciana': ['Valencia'],
  },
}

const TAX_BY_COUNTRY_COMPANY: Partial<Record<string, ClientTaxIdType[]>> = {
  CO: ['nit_co', 'generic'],
  MX: ['rfc_mx', 'generic'],
  PE: ['ruc_pe', 'generic'],
  CL: ['rut_cl', 'generic'],
  AR: ['cuit_ar', 'generic'],
  EC: ['ruc_ec', 'generic'],
  VE: ['rif_ve', 'generic'],
  HN: ['rtn_hn', 'generic'],
  CR: ['cedula_juridica_cr', 'generic'],
}

const TAX_BY_COUNTRY_PERSON: Partial<Record<string, ClientTaxIdType[]>> = {
  CO: ['generic'],
  MX: ['generic'],
  PE: ['generic'],
  CL: ['generic'],
  AR: ['generic'],
  EC: ['generic'],
  VE: ['generic'],
  HN: ['generic'],
  CR: ['generic'],
  US: ['generic'],
  ES: ['generic'],
}

export function getCountryIso2(code: string | null | undefined): string {
  if (!code) return 'co'
  const row = CLIENT_COUNTRIES.find((c) => c.code === code.toUpperCase())
  return row?.iso2 ?? 'co'
}

export function getRegionsForCountry(countryCode: string | null | undefined): RegionOption[] {
  if (!countryCode) return []
  return REGIONS[countryCode.toUpperCase()] ?? []
}

export function getCitiesForRegion(
  countryCode: string | null | undefined,
  region: string | null | undefined,
): RegionOption[] {
  if (!countryCode || !region) return []
  const byCountry = CITIES[countryCode.toUpperCase()]
  if (!byCountry) return []
  const list = byCountry[region] ?? []
  return list.map((c) => ({ value: c, label: c }))
}

export function countryHasLocationSelects(countryCode: string | null | undefined): boolean {
  return getRegionsForCountry(countryCode).length > 0
}

export function getTaxIdTypesForClient(
  countryCode: string | null | undefined,
  kind: ClientKind,
): ClientTaxIdType[] {
  const code = countryCode?.toUpperCase() ?? ''
  const map = kind === 'company' ? TAX_BY_COUNTRY_COMPANY : TAX_BY_COUNTRY_PERSON
  return map[code] ?? ['generic']
}

export function regionLabelForCountry(countryCode: string | null | undefined): string {
  switch (countryCode?.toUpperCase()) {
    case 'CO':
      return 'Departamento'
    case 'MX':
    case 'US':
      return 'Estado'
    case 'PE':
      return 'Departamento'
    case 'CL':
      return 'Región'
    case 'AR':
      return 'Provincia'
    case 'ES':
      return 'Comunidad autónoma'
    case 'CR':
      return 'Provincia'
    default:
      return 'Departamento / estado'
  }
}

export function resolveStoredCity(
  countryCode: string | null | undefined,
  region: string | null | undefined,
  stored: string | null | undefined,
): string {
  if (!stored?.trim()) return ''
  const options = getCitiesForRegion(countryCode, region)
  if (options.some((o) => o.value === stored)) return stored
  if (options.length === 0) return stored
  return ''
}

export function resolveStoredRegion(countryCode: string | null | undefined, stored: string | null | undefined): string {
  if (!stored?.trim()) return ''
  const options = getRegionsForCountry(countryCode)
  if (options.some((o) => o.value === stored)) return stored
  if (options.length === 0) return stored
  return ''
}
