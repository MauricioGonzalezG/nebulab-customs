export type LithophaneShape = 'flat' | 'arc' | 'cylinder';
export type BaseType = 'none' | 'flat-stand' | 'night-light' | 'led-wooden-base';
export type MaterialType = 'white-pla' | 'warm-ivory' | 'marble' | 'glow-blue';

export interface LithophaneConfig {
  // Image properties
  imageUrl: string | null;
  sampleId?: string;
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
  frameWidth: number;   // mm (e.g., 4.5mm border frame width)
  frameThickness?: number; // mm (e.g., 5mm frame Z-depth)

  // Base & Mounting
  baseType: BaseType;
  material: MaterialType;

  // Puck Socket & Struts Parametrization
  puckDiameter: number;   // mm (e.g., 70mm)
  puckDepth: number;      // mm (e.g., 25mm)
  puckAngle: number;      // degrees (e.g., 55deg)
  puckArcCoverage: number;// degrees for open C-cup (e.g., 180deg)
  strutCount: number;     // 3 or 4 support beams
  strutLength?: number;   // mm (e.g., 60mm default, modifiable)
  strutWidth?: number;    // mm (e.g., 5mm default, modifiable)
  showLampPuck: boolean;  // Inserted / Removed toggle for battery LED puck lamp

  // Lighting Simulation
  enableLight: boolean;
  lightWarmth: number;  // 0 (cool white) to 100 (warm yellow)
  lightIntensity: number; // 0 to 100

  // Observaciones del usuario
  notes?: string;
}

export type ClickerType = 'clicker' | 'keychain';
export type ClickerBaseStyle = 'outline' | 'circle' | 'square' | 'rounded-square' | 'hexagon' | 'pill' | 'heart' | 'shield';
export type ClickerReliefStyle = 'inlaid' | 'embossed' | 'debossed' | 'flat';
export type ClickerLightingMode = 'studio' | 'neon' | 'daylight' | 'warm';
export type ClickerSwitchType = 'red' | 'blue' | 'brown' | 'black' | 'yellow';

export interface ClickerConfig {
  imageUrl: string | null;
  sampleId?: string;
  removeBackground: boolean;
  type: ClickerType;
  baseStyle: ClickerBaseStyle;
  strokeMode: 'multi' | 'single'; // 'multi' = hasta 4 colores, 'single' = trazo único silueta
  reliefStyle: ClickerReliefStyle; // 'inlaid' | 'embossed' | 'debossed' | 'flat'
  reliefDepth: number; // mm (0.4 to 2.0)
  size: number; // mm (25 to 60)
  topHeight: number; // mm (5 to 14)
  baseHeight: number; // mm (8 to 20)
  baseBevel: number; // mm (0 to 3)
  baseMargin: number; // mm (1 to 5)
  colorsCount: number; // 2, 3, 4
  smoothing: number; // 0 to 50%
  baseColor: string;
  outlineColor: string;
  accentColor: string;
  detailColor: string;
  showSwitch: boolean;
  switchType: ClickerSwitchType;
  switchCount: 1 | 2 | 3;
  switchTolerance: number; // offset mm (-0.2 to +0.3)
  viewMode: 'assembled' | 'exploded' | 'printbed';
  renderStyle: 'color' | 'extrude';
  lightingMode: ClickerLightingMode;
  ringPosition: 'top' | 'top-left' | 'top-right' | 'left' | 'right' | 'bottom';
  ringAngle: number; // 0 to 360 degrees
  ringOffsetX: number; // mm (-25 to +25)
  ringOffsetY: number; // mm (-25 to +25)
  ringHeight: number;  // mm (-10 to +15)
  ringHoleDiameter: number; // mm (3 to 6)
  ringThickness: number; // mm (1.5 to 3.5)
  includeRing: boolean; // toggle arandela de llavero en el clicker
  imageRotation: number; // 0, 90, 180, 270 degrees
  flipHorizontal: boolean; // espejo horizontal
  soundEnabled: boolean; // sonido de click mecánico al interactuar
}

export type CollarPlateStyle = 'bone' | 'silhouette' | 'rounded' | 'circle' | 'shield' | 'heart' | 'hexagon' | 'pill' | 'rectangle';
export type CollarMountType = 'slide' | 'dangling';
export type CollarFontFamily = 'outfit' | 'cinzel' | 'inter' | 'bungee';
export type CollarReliefStyle = 'inlaid' | 'embossed' | 'debossed';
export type CollarIcon = 'paw' | 'bone' | 'heart' | 'crown' | 'star' | 'cross' | 'none';
export type CollarStrapColor = 'olive' | 'crimson' | 'black' | 'navy' | 'pink' | 'brown' | 'yellow';
export type CollarLightingMode = 'studio' | 'neon' | 'daylight' | 'warm';
export type CollarViewMode = 'assembled' | 'plate' | 'exploded' | 'printbed';

export interface CollarConfig {
  imageUrl: string | null;
  sampleId?: string;
  removeBackground: boolean;
  petName: string;
  phoneText: string;
  plateStyle: CollarPlateStyle;
  mountType: CollarMountType; // 'slide' (pasante) | 'dangling' (colgante)
  fontFamily: CollarFontFamily;
  reliefStyle: CollarReliefStyle;
  icon: CollarIcon;
  plateColor: string; // Color principal de la placa (ej: '#1E293B', '#D4AF37')
  borderColor: string; // Color del borde decorativo
  textColor: string;  // Color del texto grabado / en relieve
  strapColor: CollarStrapColor;
  size: 'S' | 'M' | 'L' | 'XL';
  plateWidth: number; // mm (35 to 65)
  plateHeight: number; // mm (25 to 50)
  plateThickness: number; // mm (2.5 to 6)
  plateBevel: number; // mm (0.5 to 2)
  ringDiameter: number; // mm (3 to 6) para medalla colgante
  imageRotation: number;
  flipHorizontal: boolean;
  lightingMode: CollarLightingMode;
  viewMode: CollarViewMode;
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
  department?: string;
  city: string;
  postalCode: string;
  country: string;
  notes?: string;
}

export interface OrderLogEntry {
  id: string;
  timestamp: string; // ISO date string
  type: 'status_change' | 'payment_update' | 'email_sent' | 'note' | 'system';
  title: string;
  description?: string;
  actor?: string; // e.g. 'Admin (admin@nebuladb3d.com.co)', 'Sistema (Checkout)', 'Mercado Pago Webhook'
  metadata?: Record<string, any>;
}

export interface Order {
  id: string;
  items: CartItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  currency?: 'COP' | 'USD';
  shippingDetails: ShippingDetails;
  paymentMethod: 'whatsapp' | 'card' | 'paypal' | 'mercadopago' | 'wompi';
  status: 'confirmed' | 'processing' | 'completed' | 'cancelled';
  paymentStatus?: 'pending' | 'approved' | 'rejected' | 'refunded';
  paymentDetails?: {
    transactionId?: string;
    paymentGateway?: string;
    paidAt?: string;
    rawResponse?: string;
    notes?: string;
    [key: string]: any;
  };
  logs?: OrderLogEntry[];
  createdAt: string;
}

export * from './email';

