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

  // Lighting Simulation
  enableLight: boolean;
  lightWarmth: number;  // 0 (cool white) to 100 (warm yellow)
  lightIntensity: number; // 0 to 100
}

export interface CartItem {
  id: string;
  config: LithophaneConfig;
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
  paymentMethod: 'whatsapp' | 'card' | 'paypal' | 'mercadopago';
  status: 'confirmed' | 'processing';
  createdAt: string;
}
