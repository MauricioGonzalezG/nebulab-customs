import type { CollarConfig } from '../types';

// Millimetres. Shared by the manufactured rear passage and the preview strap.
export const COLLAR_SIZES: Record<CollarConfig['size'], { radius: number; width: number }> = {
  S: { radius: 30, width: 10 },
  M: { radius: 38, width: 12 },
  L: { radius: 46, width: 14 },
  XL: { radius: 54, width: 16 },
};

export const COLLAR_REAR_PASSAGE = {
  gap: 1.6,
  recess: 0.7,
  wall: 0.9,
  sideWall: 1.8,
  widthClearance: 1.0,
} as const;

export const collarRearPassageLength = (plateWidth: number) =>
  Math.min(30, Math.max(18, plateWidth * 0.55));
