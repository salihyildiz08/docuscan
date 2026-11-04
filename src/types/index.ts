export interface Point {
  x: number;
  y: number;
}

export type CornerIndex = 0 | 1 | 2 | 3; // 0: Top-Left, 1: Top-Right, 2: Bottom-Right, 3: Bottom-Left

export interface EdgeCurves {
  top?: Point;
  right?: Point;
  bottom?: Point;
  left?: Point;
}

export interface DocumentCorners {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
  edgeCurves?: EdgeCurves;
}

export type FilterType = 'magic' | 'bw' | 'grayscale' | 'sharp' | 'original';

export interface FilterOptions {
  type: FilterType;
  brightness: number; // -50 to 50, default 0
  contrast: number; // -50 to 50, default 0
}

export interface ScannedPage {
  id: string;
  originalImageDataUrl: string;
  originalWidth: number;
  originalHeight: number;
  corners: DocumentCorners;
  rotation: number; // 0, 90, 180, 270
  filter: FilterOptions;
  processedImageDataUrl: string | null;
}

export interface ScannerDocument {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  pages: ScannedPage[];
}
