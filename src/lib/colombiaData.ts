export interface DepartmentInfo {
  name: string;
  code: string;
  municipalities: string[];
}

export const COLOMBIA_DEPARTMENTS: DepartmentInfo[] = [
  {
    name: 'Bogotá D.C.',
    code: 'BOG',
    municipalities: [
      'Bogotá D.C.',
      'Usaquén',
      'Chapinero',
      'Santa Fe',
      'San Cristóbal',
      'Usme',
      'Tunjuelito',
      'Bosa',
      'Kennedy',
      'Fontibón',
      'Engativá',
      'Suba',
      'Barrios Unidos',
      'Teusaquillo',
      'Los Mártires',
      'Antonio Nariño',
      'Puente Aranda',
      'La Candelaria',
      'Rafael Uribe Uribe',
      'Ciudad Bolívar',
      'Sumapaz'
    ]
  },
  {
    name: 'Antioquia',
    code: 'ANT',
    municipalities: [
      'Medellín',
      'Envigado',
      'Bello',
      'Itagüí',
      'Sabaneta',
      'Rionegro',
      'La Estrella',
      'Caldas',
      'Copacabana',
      'Girardota',
      'Barbosa',
      'Marinilla',
      'Guarne',
      'El Retiro',
      'La Ceja',
      'El Carmen de Viboral',
      'Apartadó',
      'Turbo',
      'Caucasia',
      'Santa Fe de Antioquia',
      'Yarumal',
      'Puerto Berrío',
      'Andes',
      'Amagá',
      'Jardín',
      'Jericó',
      'Sonsón',
      'Santa Rosa de Osos',
      'Urrao'
    ]
  },
  {
    name: 'Valle del Cauca',
    code: 'VAC',
    municipalities: [
      'Cali',
      'Palmira',
      'Buenaventura',
      'Tuluá',
      'Buga (Guadalajara de Buga)',
      'Cartago',
      'Jamundí',
      'Yumbo',
      'Candelaria',
      'Pradera',
      'Florida',
      'Zarzal',
      'Sevilla',
      'Roldanillo',
      'El Cerrito',
      'Ginebra',
      'Guacarí',
      'La Unión',
      'Caicedonia',
      'Dagua'
    ]
  },
  {
    name: 'Cundinamarca',
    code: 'CUN',
    municipalities: [
      'Soacha',
      'Chía',
      'Zipaquirá',
      'Facatativá',
      'Fusagasugá',
      'Madrid',
      'Mosquera',
      'Funza',
      'Girardot',
      'Cajicá',
      'Cota',
      'Sopó',
      'Tocancipá',
      'Tabio',
      'Tenjo',
      'La Calera',
      'Siboté',
      'Gachancipá',
      'Ubaté',
      'Villeta',
      'Silvania',
      'Cáqueza',
      'Pacho',
      'Choachí'
    ]
  },
  {
    name: 'Atlántico',
    code: 'ATL',
    municipalities: [
      'Barranquilla',
      'Soledad',
      'Malambo',
      'Puerto Colombia',
      'Galapa',
      'Baranoa',
      'Sabanalarga',
      'Palmar de Varela',
      'Santo Tomás',
      'Ponedera',
      'Tubará',
      'Juan de Acosta'
    ]
  },
  {
    name: 'Santander',
    code: 'SAN',
    municipalities: [
      'Bucaramanga',
      'Floridablanca',
      'Girón',
      'Piedecuesta',
      'Barrancabermeja',
      'San Gil',
      'Socorro',
      'Barbosa',
      'Lebrija',
      'Málaga',
      'Cimitarra',
      'Vélez',
      'Zapatoca',
      'Barichara',
      'Charalá'
    ]
  },
  {
    name: 'Bolívar',
    code: 'BOL',
    municipalities: [
      'Cartagena',
      'Magangué',
      'Turbaco',
      'Arjona',
      'El Carmen de Bolívar',
      'Mompós (Santa Cruz de Mompox)',
      'San Juan Nepomuceno',
      'Turbana',
      'Clemencia',
      'Santa Rosa del Sur'
    ]
  },
  {
    name: 'Caldas',
    code: 'CAL',
    municipalities: [
      'Manizales',
      'Villamaría',
      'Chinchiná',
      'La Dorada',
      'Riosucio',
      'Anserma',
      'Neira',
      'Supía',
      'Salamina',
      'Aguadas',
      'Pensilvania',
      'Manzanares',
      'Palestina',
      'Marquetalia',
      'Viterbo',
      'Belalcázar',
      'Marmato'
    ]
  },
  {
    name: 'Risaralda',
    code: 'RIS',
    municipalities: [
      'Pereira',
      'Dosquebradas',
      'Santa Rosa de Cabal',
      'La Virginia',
      'Belén de Umbría',
      'Santuario',
      'Marsella',
      'Quinchía',
      'Apía',
      'Guática'
    ]
  },
  {
    name: 'Quindío',
    code: 'QUI',
    municipalities: [
      'Armenia',
      'Calarcá',
      'Montenegro',
      'Quimbaya',
      'La Tebaida',
      'Circasia',
      'Filandia',
      'Salento',
      'Génova',
      'Pijao',
      'Buenavista',
      'Córdoba'
    ]
  },
  {
    name: 'Tolima',
    code: 'TOL',
    municipalities: [
      'Ibagué',
      'Espinal',
      'Melgar',
      'Chaparral',
      'Mariquita (San Sebastián de Mariquita)',
      'Honda',
      'Líbano',
      'Guamo',
      'Flandes',
      'Fresno',
      'Purificación',
      'Cajamarca',
      'Saldaña'
    ]
  },
  {
    name: 'Huila',
    code: 'HUI',
    municipalities: [
      'Neiva',
      'Pitalito',
      'Garzón',
      'La Plata',
      'Campoalegre',
      'San Agustín',
      'Palermo',
      'Gigante',
      'Rivera',
      'Aipe'
    ]
  },
  {
    name: 'Meta',
    code: 'MET',
    municipalities: [
      'Villavicencio',
      'Acacías',
      'Granada',
      'Puerto López',
      'San Martín',
      'Cumaral',
      'Puerto Gaitán',
      'Restrepo',
      'Guamal'
    ]
  },
  {
    name: 'Nariño',
    code: 'NAR',
    municipalities: [
      'Pasto',
      'Ipiales',
      'Tumaco',
      'Túquerres',
      'La Unión',
      'Samaniego',
      'Sandoná',
      'Cumbal',
      'Buesaco'
    ]
  },
  {
    name: 'Boyacá',
    code: 'BOY',
    municipalities: [
      'Tunja',
      'Duitama',
      'Sogamoso',
      'Chiquinquirá',
      'Paipa',
      'Villa de Leyva',
      'Puerto Boyacá',
      'Moniquirá',
      'Garagoa',
      'Nobsa',
      'Tibásosa',
      'Samacá'
    ]
  },
  {
    name: 'Norte de Santander',
    code: 'NSA',
    municipalities: [
      'Cúcuta',
      'Ocaña',
      'Pamplona',
      'Villa del Rosario',
      'Los Patios',
      'Tibú',
      'Chinácota',
      'El Zulia',
      'Ábrego'
    ]
  },
  {
    name: 'Cesar',
    code: 'CES',
    municipalities: [
      'Valledupar',
      'Aguachica',
      'Agustín Codazzi',
      'Bosconia',
      'Curumaní',
      'La Jagua de Ibirico',
      'El Paso',
      'San Alberto'
    ]
  },
  {
    name: 'Córdoba',
    code: 'COR',
    municipalities: [
      'Montería',
      'Cereté',
      'Lorica',
      'Sahagún',
      'Montelíbano',
      'Planeta Rica',
      'Tierralta',
      'Ciénaga de Oro',
      'Chinú'
    ]
  },
  {
    name: 'Cauca',
    code: 'CAU',
    municipalities: [
      'Popayán',
      'Santander de Quilichao',
      'Puerto Tejada',
      'Patía (El Bordo)',
      'Piendamó',
      'El Tambo',
      'Miranda',
      'Corinto',
      'Guapi'
    ]
  },
  {
    name: 'Magdalena',
    code: 'MAG',
    municipalities: [
      'Santa Marta',
      'Ciénaga',
      'Fundación',
      'Plato',
      'El Banco',
      'Aracataca',
      'Pivijay',
      'Zona Bananera'
    ]
  },
  {
    name: 'La Guajira',
    code: 'LAG',
    municipalities: [
      'Riohacha',
      'Maicao',
      'Uribia',
      'San Juan del Cesar',
      'Fonseca',
      'Villanueva',
      'Manaure',
      'Barrancas'
    ]
  },
  {
    name: 'Sucre',
    code: 'SUC',
    municipalities: [
      'Sincelejo',
      'Corozal',
      'San Marcos',
      'Sampués',
      'Tolú (Santiago de Tolú)',
      'San Onofre',
      'Coveñas'
    ]
  },
  {
    name: 'Casanare',
    code: 'CAS',
    municipalities: [
      'Yopal',
      'Aguazul',
      'Villanueva',
      'Tauramena',
      'Monterrey',
      'Paz de Ariporo',
      'Maní'
    ]
  },
  {
    name: 'Caquetá',
    code: 'CAQ',
    municipalities: [
      'Florencia',
      'San Vicente del Caguán',
      'Puerto Rico',
      'Curillo',
      'El Doncello',
      'Belén de los Andaquíes'
    ]
  },
  {
    name: 'Putumayo',
    code: 'PUT',
    municipalities: [
      'Mocoa',
      'Puerto Asís',
      'Orito',
      'Valle del Guamuez (La Hormiga)',
      'Villagarzón',
      'Sibundoy',
      'Puerto Leguízamo'
    ]
  },
  {
    name: 'Arauca',
    code: 'ARA',
    municipalities: [
      'Arauca',
      'Saravena',
      'Tame',
      'Arauquita',
      'Fortul'
    ]
  },
  {
    name: 'Chocó',
    code: 'CHO',
    municipalities: [
      'Quibdó',
      'Istmina',
      'Tadó',
      'Condoto',
      'Bahía Solano',
      'Nuquí',
      'Acandí',
      'Riosucio'
    ]
  },
  {
    name: 'San Andrés y Providencia',
    code: 'SAP',
    municipalities: [
      'San Andrés',
      'Providencia',
      'Santa Catalina'
    ]
  },
  {
    name: 'Amazonas',
    code: 'AMA',
    municipalities: [
      'Leticia',
      'Puerto Nariño'
    ]
  },
  {
    name: 'Guaviare',
    code: 'GUV',
    municipalities: [
      'San José del Guaviare',
      'Calamar',
      'El Retorno',
      'Miraflores'
    ]
  },
  {
    name: 'Guainía',
    code: 'GUA',
    municipalities: [
      'Inírida',
      'Barranco Minas'
    ]
  },
  {
    name: 'Vaupés',
    code: 'VAU',
    municipalities: [
      'Mitú',
      'Carurú',
      'Taraira'
    ]
  },
  {
    name: 'Vichada',
    code: 'VID',
    municipalities: [
      'Puerto Carreño',
      'La Primavera',
      'Santa Rosalía',
      'Cumaribo'
    ]
  }
];

export const getDepartmentByName = (name: string): DepartmentInfo | undefined => {
  if (!name) return undefined;
  const clean = name.trim().toLowerCase();
  return COLOMBIA_DEPARTMENTS.find(
    (d) => d.name.toLowerCase() === clean || d.code.toLowerCase() === clean
  );
};

export const getMunicipalitiesForDepartment = (deptName: string): string[] => {
  const dept = getDepartmentByName(deptName);
  return dept ? dept.municipalities : [];
};
