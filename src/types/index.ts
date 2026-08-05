export type LithophaneShape = 'flat' | 'arc' | 'cylinder';
export type BaseType = 'none' | 'flat-stand' | 'night-light' | 'led-wooden-base';
export type MaterialType = 'white-pla' | 'warm-ivory' | 'marble' | 'glow-blue';

export interface LithophaneConfig {
  // Image properties
  imageUrl: string | null;
  brightness: number; // -100 to 100
  contrast: number;   // -100 to 100
  invert: boolean;    // true = dark is thick, false = light is thick

  // Shape & Dimensions
  shape: LithophaneShape;
  resolutionMode: 'standard' | 'hd' | 'ultra'; // 180, 300, 450 grid points
  width: number;        // mm (e.g., 120mm)
  height: number;       // mm (e.g., 100mm)
  minThickness: number; // mm (e.g., 0.8mm)
  maxThickness: number; // mm (e.g., 3.2mm)
  arcAngle: number;     // degrees for arc/curved (e.g., 60 deg)
  frameWidth: number;   // mm (e.g., 3mm border frame)

  // Base & Mounting
  baseType: BaseType;
  material: MaterialType;

  // Puck Socket & Struts Parametrization
  puckDiameter: number;   // mm (e.g., 60mm)
  puckDepth: number;      // mm (e.g., 25mm)
  puckAngle: number;      // degrees (e.g., 45deg)
  puckArcCoverage: number;// degrees for open C-cup (e.g., 240deg)
  strutCount: number;     // 3 or 4 support beams
  strutLength?: number;   // mm (e.g., 60mm default, modifiable)
  showLampPuck: boolean;  // Inserted / Removed toggle for battery LED puck lamp

  // Lighting Simulation
  enableLight: boolean;
  lightWarmth: number;  // 0 (cool white) to 100 (warm yellow)
  lightIntensity: number; // 0 to 100
}

export type ClickerType = 'clicker' | 'keychain';
export type ClickerBaseStyle = 'outline' | 'circle' | 'square' | 'hexagon' | 'shield' | 'heart';

export interface ClickerConfig {
  imageUrl: string | null;
  sampleId?: string;
  removeBackground: boolean;
  type: ClickerType;
  baseStyle: ClickerBaseStyle;
  strokeMode: 'multi' | 'single'; // 'multi' = hasta 4 colores, 'single' = trazo único silueta
  size: number; // mm (25 to 60)
  topHeight: number; // mm
  baseHeight: number; // mm
  colorsCount: number; // 2, 3, 4
  smoothing: number; // 0 to 50%
  baseColor: string;
  outlineColor: string;
  accentColor: string;
  detailColor: string;
  showSwitch: boolean;
  switchType: 'red' | 'blue' | 'brown';
  switchCount: 1 | 2 | 3;
  switchTolerance: number; // offset mm
  viewMode: 'assembled' | 'exploded';
  renderStyle: 'color' | 'extrude';
  ringPosition: 'top' | 'top-left' | 'top-right' | 'left' | 'right' | 'bottom';
  ringAngle: number; // 0 to 360 degrees
  ringOffsetX: number; // mm (-25 to +25)
  ringOffsetY: number; // mm (-25 to +25)
  ringHeight: number;  // mm (-10 to +15)
  includeRing: boolean; // toggle arandela de llavero en el clicker
  imageRotation: number; // 0, 90, 180, 270 degrees
  flipHorizontal: boolean; // espejo horizontal
}







export type CollarPlateStyle = 'rounded' | 'rectangle' | 'bone' | 'shield';
export type CollarStrapColor = 'olive' | 'crimson' | 'black' | 'navy' | 'pink';

export interface CollarConfig {
  imageUrl: string | null;
  sampleId?: string;
  removeBackground: boolean;
  petName: string;
  phoneText: string;
  plateStyle: CollarPlateStyle;
  plateColor: string; // e.g. '#D4AF37' (Gold/Bronze), '#1E293B' (Black), '#FFFFFF' (White)
  textColor: string;  // e.g. '#FFFFFF', '#000000', '#D4AF37'
  strapColor: CollarStrapColor;
  size: 'S' | 'M' | 'L' | 'XL';
  plateWidth: number; // mm (e.g. 45mm)
  plateHeight: number; // mm (e.g. 35mm)
  imageRotation: number;
  flipHorizontal: boolean;
  viewMode: 'assembled' | 'exploded';
}

export interface CartItem {
  id: string;
  itemType?: 'lithophane' | 'clicker' | 'collar';
  title?: string;
  config: LithophaneConfig;
  clickerConfig?: ClickerConfig;
  collarConfig?: CollarConfig;
  previewImageDataUrl: string;
  price: number;
  quantity: number;
  createdAt: string;
}


export interface ShippingDetails {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  notes?: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  shippingDetails: ShippingDetails;
  paymentMethod: 'whatsapp' | 'card' | 'paypal' | 'mercadopago' | 'wompi';
  status: 'confirmed' | 'processing' | 'completed' | 'cancelled';
  createdAt: string;
}
