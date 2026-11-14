// Configuración de las decoraciones navideñas con foto. Módulo sin dependencias
// para que lo compartan el estudio, el carrito, los correos y el servidor.

export type OrnamentShape = 'gift' | 'bauble' | 'tree' | 'star' | 'bell' | 'house';
export type OrnamentWindow = 'arch' | 'circle' | 'square';
export type OrnamentTier = 'small' | 'medium' | 'large';

export interface OrnamentConfig {
  imageUrl: string | null;
  shape: OrnamentShape;
  window: OrnamentWindow;
  text: string;
  size: number;          // lado mayor del adorno en mm (sin el ojal)
  thickness: number;     // grosor del marco frontal en mm
  relief: number;        // altura del relieve de color en mm
  backThickness: number; // grosor de la tapa trasera en mm
  holeDiameter: number;  // orificio para el cordón en mm
  bodyColor: string;
  accentColor: string;
  photoZoom: number;     // 1 = la foto cubre justo la ventana
  photoX: number;        // -1 a 1, desplazamiento horizontal del encuadre
  photoY: number;        // -1 a 1, desplazamiento vertical del encuadre
}

export const ORNAMENT_SHAPE_LABELS: Record<OrnamentShape, string> = {
  gift: 'Regalo con moño',
  bauble: 'Esfera',
  tree: 'Árbol',
  star: 'Estrella',
  bell: 'Campana',
  house: 'Casita',
};

export const ORNAMENT_WINDOW_LABELS: Record<OrnamentWindow, string> = {
  arch: 'Arco',
  circle: 'Círculo',
  square: 'Cuadro',
};

export const ORNAMENT_SIZES: ReadonlyArray<{ label: string; size: number; tier: OrnamentTier }> = [
  { label: 'Pequeño', size: 60, tier: 'small' },
  { label: 'Mediano', size: 75, tier: 'medium' },
  { label: 'Grande', size: 90, tier: 'large' },
];

export const ORNAMENT_MIN_SIZE = 50;
export const ORNAMENT_MAX_SIZE = 100;
export const ORNAMENT_TEXT_MAX = 14;

// El precio va por tramo de tamaño; el servidor repite esta misma regla.
export const ornamentTier = (size: number): OrnamentTier => (size <= 67 ? 'small' : size <= 82 ? 'medium' : 'large');

export const DEFAULT_ORNAMENT: OrnamentConfig = {
  imageUrl: null,
  shape: 'gift',
  window: 'arch',
  text: '',
  size: 75,
  thickness: 2.4,
  relief: 0.8,
  backThickness: 1,
  holeDiameter: 3,
  bodyColor: '#f8fafc',
  accentColor: '#c81e1e',
  photoZoom: 1,
  photoX: 0,
  photoY: 0,
};
