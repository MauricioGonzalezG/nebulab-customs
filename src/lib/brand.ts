export const BRAND = {
  name: 'Nebulab 3D',
  workspaceName: 'Nebulab Studio',
  tagline: 'Si lo puedes imaginar, lo podemos crear.',
  eyebrow: 'Impresión 3D · Colombia',
  locations: 'Manizales · Madrid, Cundinamarca',
  whatsappNumber: '573232218586',
  whatsappDisplay: '+57 323 221 8586',
  instagramHandle: '@nebulab3d',
  instagramUrl: 'https://www.instagram.com/nebulab3d/',
  logoDarkUrl: 'https://www.nebulab3d.com.co/images/logo/logo-principal-dark.png',
  logoLightUrl: 'https://www.nebulab3d.com.co/images/logo/logo-principal-light.png',
  quoteMessage: 'Hola Nebulab 3D, quiero cotizar un proyecto',
} as const;

export const getWhatsAppUrl = (message: string = BRAND.quoteMessage): string =>
  `https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(message)}`;
