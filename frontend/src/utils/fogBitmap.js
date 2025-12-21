import { GRID_SIZE } from '../../config'

const BITMAP_SIZE = (GRID_SIZE * GRID_SIZE) / 8

export function createEmptyFog() {
  return new Uint8Array(BITMAP_SIZE);
}


export function createRevealedFog() {
  const bitmap = new Uint8Array(BITMAP_SIZE);
  bitmap.fill(255);
  return bitmap;
}


export function isRevealed(bitmap, x, y) {
  if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return false;
  const index = y * GRID_SIZE + x;
  const byteIndex = Math.floor(index / 8);
  const bitIndex = index % 8;
  return (bitmap[byteIndex] & (1 << bitIndex)) !== 0;
}


export function setCell(bitmap, x, y, revealed) {
  if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;
  const index = y * GRID_SIZE + x;
  const byteIndex = Math.floor(index / 8);
  const bitIndex = index % 8;
  if (revealed) {
    bitmap[byteIndex] |= (1 << bitIndex);
  } else {
    bitmap[byteIndex] &= ~(1 << bitIndex);
  }
}


export function applyBrush(bitmap, centerX, centerY, radius, reveal) {
  const newBitmap = new Uint8Array(bitmap);
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      setCell(newBitmap, centerX + dx, centerY + dy, reveal);
    }
  }
  return newBitmap;
}


export function applyCircleBrush(bitmap, centerX, centerY, radius, reveal) {
  const newBitmap = new Uint8Array(bitmap);
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= radius * radius) {
        setCell(newBitmap, centerX + dx, centerY + dy, reveal);
      }
    }
  }
  return newBitmap;
}


export function encodeToBase64(bitmap) {
  let binary = '';
  for (let i = 0; i < bitmap.length; i++) {
    binary += String.fromCharCode(bitmap[i]);
  }
  return btoa(binary);
}


export function decodeFromBase64(base64) {
  if (!base64) return createEmptyFog();
  try {
    const binary = atob(base64);
    const bitmap = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bitmap[i] = binary.charCodeAt(i);
    }
    return bitmap;
  } catch {
    return createEmptyFog();
  }
}


export function cloneBitmap(bitmap) {
  return new Uint8Array(bitmap);
}

export { GRID_SIZE, BITMAP_SIZE };