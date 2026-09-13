import { AtmosphereTheme, AtmosphereOption } from '../types';

export const VALID_ATMOSPHERES: readonly AtmosphereTheme[] = [
  'atelier-morning',
  'fog-chamber',
  'copper-dusk',
  'ice-nocturne',
  'pure-obsidian',
] as const;

export const isAtmosphereTheme = (val: unknown): val is AtmosphereTheme => {
  return typeof val === 'string' && (VALID_ATMOSPHERES as readonly string[]).includes(val);
};

export const getInitialAtmosphere = (): AtmosphereTheme => {
  if (typeof window === 'undefined') return 'atelier-morning';
  try {
    const saved = localStorage.getItem('nocturne-atmosphere');
    if (isAtmosphereTheme(saved)) {
      return saved;
    }
  } catch (e) {
    // Gracefully handle any localStorage access exceptions
  }
  return 'atelier-morning';
};

export const ATMOSPHERE_OPTIONS: AtmosphereOption[] = [
  {
    id: 'atelier-morning',
    index: '01',
    name: 'ATELIER MORNING',
    descriptor: 'Copper sunrise / Ice fog',
    swatchGradient: 'linear-gradient(135deg, #D19A72 0%, #071423 50%, #38BDF8 100%)',
  },
  {
    id: 'fog-chamber',
    index: '02',
    name: 'FOG CHAMBER',
    descriptor: 'Abstract optical mist',
    swatchGradient: 'linear-gradient(135deg, #A87452 0%, #050E18 45%, #7DD3FC 100%)',
  },
  {
    id: 'copper-dusk',
    index: '03',
    name: 'COPPER DUSK',
    descriptor: 'Warm cinematic depth',
    swatchGradient: 'linear-gradient(135deg, #D19A72 0%, #8A5A3B 40%, #071321 100%)',
  },
  {
    id: 'ice-nocturne',
    index: '04',
    name: 'ICE NOCTURNE',
    descriptor: 'Cold precision atmosphere',
    swatchGradient: 'linear-gradient(135deg, #1E4060 0%, #05111F 45%, #38BDF8 100%)',
  },
  {
    id: 'pure-obsidian',
    index: '05',
    name: 'PURE OBSIDIAN',
    descriptor: 'Minimal dark workstation',
    swatchGradient: 'linear-gradient(180deg, #071423 0%, #040911 100%)',
  },
];
