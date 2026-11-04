import type { Point, DocumentCorners } from '../types';

export function distance(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

export function midpoint(p1: Point, p2: Point): Point {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

export function orderCorners(pts: Point[]): DocumentCorners {
  if (pts.length !== 4) {
    throw new Error('4 points required');
  }

  const sortedByY = [...pts].sort((a, b) => a.y - b.y);
  const topTwo = sortedByY.slice(0, 2).sort((a, b) => a.x - b.x);
  const topLeft = topTwo[0];
  const topRight = topTwo[1];

  const bottomTwo = sortedByY.slice(2, 4).sort((a, b) => a.x - b.x);
  const bottomLeft = bottomTwo[0];
  const bottomRight = bottomTwo[1];

  return { topLeft, topRight, bottomRight, bottomLeft };
}

export function evalCurveThroughMid(p0: Point, pMid: Point, p1: Point, t: number): Point {
  const ctrlX = 2 * pMid.x - 0.5 * (p0.x + p1.x);
  const ctrlY = 2 * pMid.y - 0.5 * (p0.y + p1.y);

  const t1 = 1 - t;
  const x = t1 * t1 * p0.x + 2 * t1 * t * ctrlX + t * t * p1.x;
  const y = t1 * t1 * p0.y + 2 * t1 * t * ctrlY + t * t * p1.y;
  return { x, y };
}

function getInverseHomographyMatrix(src: Point[], dst: Point[]): number[] {
  const a: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const u = dst[i].x;
    const v = dst[i].y;
    const x = src[i].x;
    const y = src[i].y;

    a.push([u, v, 1, 0, 0, 0, -u * x, -v * x]);
    b.push(x);

    a.push([0, 0, 0, u, v, 1, -u * y, -v * y]);
    b.push(y);
  }

  const n = 8;
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(a[k][i]) > Math.abs(a[maxRow][i])) {
        maxRow = k;
      }
    }
    const tempA = a[i];
    a[i] = a[maxRow];
    a[maxRow] = tempA;

    const tempB = b[i];
    b[i] = b[maxRow];
    b[maxRow] = tempB;

    for (let k = i + 1; k < n; k++) {
      const c = -a[k][i] / a[i][i];
      for (let j = i; j < n; j++) {
        if (i === j) {
          a[k][j] = 0;
        } else {
          a[k][j] += c * a[i][j];
        }
      }
      b[k] += c * b[i];
    }
  }

  const h: number[] = new Array(9);
  h[8] = 1;
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < n; j++) {
      sum += a[i][j] * h[j];
    }
    h[i] = (b[i] - sum) / a[i][i];
  }

  return h;
}

/**
 * High-Precision Document Perspective & Coons Patch Surface Dewarping
 */
export function warpPerspective(
  sourceCanvas: HTMLCanvasElement,
  corners: DocumentCorners,
  targetWidth?: number,
  targetHeight?: number,
  aspectRatio: 'a4' | 'auto' = 'a4'
): HTMLCanvasElement {
  const { topLeft, topRight, bottomRight, bottomLeft, edgeCurves } = corners;

  const widthTop = distance(topLeft, topRight);
  const widthBottom = distance(bottomLeft, bottomRight);
  const heightLeft = distance(topLeft, bottomLeft);
  const heightRight = distance(topRight, bottomRight);

  const baseWidth = Math.max(widthTop, widthBottom);
  const baseHeight = Math.max(heightLeft, heightRight);

  let outWidth = Math.max(10, Math.round(targetWidth || baseWidth));
  let outHeight = Math.max(10, Math.round(targetHeight || baseHeight));

  // A4 aspect ratio rectification (prevents perspective squashing)
  if (aspectRatio === 'a4' && !targetHeight) {
    if (baseHeight >= baseWidth * 0.9) {
      outHeight = Math.round(outWidth * 1.4142);
    } else {
      outWidth = Math.round(outHeight * 1.4142);
    }
  }

  const srcCtx = sourceCanvas.getContext('2d');
  if (!srcCtx) throw new Error('Cannot get 2d context');

  const srcData = srcCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const srcPixels = srcData.data;
  const sw = sourceCanvas.width;
  const sh = sourceCanvas.height;

  const destCanvas = document.createElement('canvas');
  destCanvas.width = outWidth;
  destCanvas.height = outHeight;
  const destCtx = destCanvas.getContext('2d');
  if (!destCtx) throw new Error('Cannot get dest context');

  const destData = destCtx.createImageData(outWidth, outHeight);
  const destPixels = destData.data;

  const hasCurves = Boolean(
    edgeCurves &&
    (edgeCurves.top || edgeCurves.bottom || edgeCurves.left || edgeCurves.right)
  );

  if (hasCurves) {
    // 3D Curved Surface Dewarping via Coons Patch
    const topMid = edgeCurves?.top || midpoint(topLeft, topRight);
    const bottomMid = edgeCurves?.bottom || midpoint(bottomLeft, bottomRight);
    const leftMid = edgeCurves?.left || midpoint(topLeft, bottomLeft);
    const rightMid = edgeCurves?.right || midpoint(topRight, bottomRight);

    let destIdx = 0;
    const invW = 1 / (outWidth - 1);
    const invH = 1 / (outHeight - 1);

    for (let y = 0; y < outHeight; y++) {
      const v = y * invH;
      const v1 = 1 - v;

      for (let x = 0; x < outWidth; x++) {
        const u = x * invW;
        const u1 = 1 - u;

        const cTop = evalCurveThroughMid(topLeft, topMid, topRight, u);
        const cBottom = evalCurveThroughMid(bottomLeft, bottomMid, bottomRight, u);
        const cLeft = evalCurveThroughMid(topLeft, leftMid, bottomLeft, v);
        const cRight = evalCurveThroughMid(topRight, rightMid, bottomRight, v);

        const linX = u1 * v1 * topLeft.x + u * v1 * topRight.x + u1 * v * bottomLeft.x + u * v * bottomRight.x;
        const linY = u1 * v1 * topLeft.y + u * v1 * topRight.y + u1 * v * bottomLeft.y + u * v * bottomRight.y;

        const srcX = v1 * cTop.x + v * cBottom.x + u1 * cLeft.x + u * cRight.x - linX;
        const srcY = v1 * cTop.y + v * cBottom.y + u1 * cLeft.y + u * cRight.y - linY;

        samplePixelBilinear(srcPixels, sw, sh, srcX, srcY, destPixels, destIdx);
        destIdx += 4;
      }
    }
  } else {
    // 4-Point Homography
    const srcPts = [topLeft, topRight, bottomRight, bottomLeft];
    const dstPts = [
      { x: 0, y: 0 },
      { x: outWidth - 1, y: 0 },
      { x: outWidth - 1, y: outHeight - 1 },
      { x: 0, y: outHeight - 1 },
    ];

    const H = getInverseHomographyMatrix(srcPts, dstPts);

    let destIdx = 0;
    for (let y = 0; y < outHeight; y++) {
      for (let x = 0; x < outWidth; x++) {
        const z = H[6] * x + H[7] * y + H[8];
        const srcX = (H[0] * x + H[1] * y + H[2]) / z;
        const srcY = (H[3] * x + H[4] * y + H[5]) / z;

        samplePixelBilinear(srcPixels, sw, sh, srcX, srcY, destPixels, destIdx);
        destIdx += 4;
      }
    }
  }

  destCtx.putImageData(destData, 0, 0);
  return destCanvas;
}

function samplePixelBilinear(
  srcPixels: Uint8ClampedArray,
  sw: number,
  sh: number,
  srcX: number,
  srcY: number,
  destPixels: Uint8ClampedArray,
  destIdx: number
) {
  if (srcX >= 0 && srcX < sw - 1 && srcY >= 0 && srcY < sh - 1) {
    const x0 = Math.floor(srcX);
    const y0 = Math.floor(srcY);
    const x1 = x0 + 1;
    const y1 = y0 + 1;

    const dx = srcX - x0;
    const dy = srcY - y0;
    const dx1 = 1 - dx;
    const dy1 = 1 - dy;

    const w00 = dx1 * dy1;
    const w10 = dx * dy1;
    const w01 = dx1 * dy;
    const w11 = dx * dy;

    const idx00 = (y0 * sw + x0) * 4;
    const idx10 = (y0 * sw + x1) * 4;
    const idx01 = (y1 * sw + x0) * 4;
    const idx11 = (y1 * sw + x1) * 4;

    destPixels[destIdx] = Math.round(
      srcPixels[idx00] * w00 + srcPixels[idx10] * w10 + srcPixels[idx01] * w01 + srcPixels[idx11] * w11
    );
    destPixels[destIdx + 1] = Math.round(
      srcPixels[idx00 + 1] * w00 + srcPixels[idx10 + 1] * w10 + srcPixels[idx01 + 1] * w01 + srcPixels[idx11 + 1] * w11
    );
    destPixels[destIdx + 2] = Math.round(
      srcPixels[idx00 + 2] * w00 + srcPixels[idx10 + 2] * w10 + srcPixels[idx01 + 2] * w01 + srcPixels[idx11 + 2] * w11
    );
    destPixels[destIdx + 3] = 255;
  } else {
    destPixels[destIdx] = 255;
    destPixels[destIdx + 1] = 255;
    destPixels[destIdx + 2] = 255;
    destPixels[destIdx + 3] = 255;
  }
}
