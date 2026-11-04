import type { Point, DocumentCorners } from '../types';

/**
 * Intelligent Document Edge & 4-Corner Detection with Curve Deflection Tracking
 */
export function detectDocumentCorners(
  sourceCanvas: HTMLCanvasElement
): DocumentCorners {
  const origW = sourceCanvas.width;
  const origH = sourceCanvas.height;

  // Analysis downscaling (target width ~450px)
  const scale = Math.min(1.0, 450 / origW);
  const sw = Math.max(50, Math.round(origW * scale));
  const sh = Math.max(50, Math.round(origH * scale));

  const smallCanvas = document.createElement('canvas');
  smallCanvas.width = sw;
  smallCanvas.height = sh;
  const ctx = smallCanvas.getContext('2d');

  if (!ctx) {
    return getDefaultCorners(origW, origH);
  }

  ctx.drawImage(sourceCanvas, 0, 0, sw, sh);
  const imgData = ctx.getImageData(0, 0, sw, sh);
  const data = imgData.data;

  // Grayscale & luminance calculation
  const gray = new Uint8Array(sw * sh);
  let sumLum = 0;
  for (let i = 0; i < sw * sh; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const l = (r * 77 + g * 150 + b * 29) >> 8;
    gray[i] = l;
    sumLum += l;
  }

  const avgLum = sumLum / (sw * sh);

  // Otsu-style threshold for bright paper detection against darker surroundings
  // Calculate histogram
  const hist = new Int32Array(256);
  for (let i = 0; i < sw * sh; i++) {
    hist[gray[i]]++;
  }

  let total = sw * sh;
  let sumB = 0;
  let wB = 0;
  let maximum = 0;
  let otsuThreshold = 128;
  let sum1 = 0;
  for (let i = 0; i < 256; i++) sum1 += i * hist[i];

  for (let i = 0; i < 256; i++) {
    wB += hist[i];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += i * hist[i];
    const mB = sumB / wB;
    const mF = (sum1 - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maximum) {
      maximum = between;
      otsuThreshold = i;
    }
  }

  // Refined threshold: bright paper is usually well above the average
  const paperThreshold = Math.max(90, Math.min(210, Math.max(otsuThreshold, Math.round(avgLum * 1.05))));

  // Collect candidate paper mask coordinates
  const paperPoints: Point[] = [];
  for (let y = 4; y < sh - 4; y += 2) {
    for (let x = 4; x < sw - 4; x += 2) {
      if (gray[y * sw + x] >= paperThreshold) {
        paperPoints.push({ x, y });
      }
    }
  }

  // If too few paper pixels, fallback to safe margins
  if (paperPoints.length < 200) {
    return getDefaultCorners(origW, origH);
  }

  // Find 4 extreme boundary corners
  let minSum = Infinity;
  let maxSum = -Infinity;
  let minDiff = Infinity;
  let maxDiff = -Infinity;

  let tl: Point = { x: 0, y: 0 };
  let br: Point = { x: sw, y: sh };
  let tr: Point = { x: sw, y: 0 };
  let bl: Point = { x: 0, y: sh };

  for (const p of paperPoints) {
    const sum = p.x + p.y;
    const diff = p.x - p.y;

    if (sum < minSum) {
      minSum = sum;
      tl = p;
    }
    if (sum > maxSum) {
      maxSum = sum;
      br = p;
    }
    if (diff > maxDiff) {
      maxDiff = diff;
      tr = p;
    }
    if (diff < minDiff) {
      minDiff = diff;
      bl = p;
    }
  }

  // Measure top edge curve deflection (find actual paper boundary between tl and tr)
  const midX = Math.round((tl.x + tr.x) / 2);
  let topCurveY = Math.min(tl.y, tr.y);

  // Scan downward at midX to find first paper pixel
  for (let y = 1; y < Math.min(sh - 1, Math.max(tl.y, tr.y) + 30); y++) {
    if (gray[y * sw + midX] >= paperThreshold) {
      topCurveY = y;
      break;
    }
  }

  // Scale back to original resolution
  const mappedTL = { x: Math.round(tl.x / scale), y: Math.round(tl.y / scale) };
  const mappedTR = { x: Math.round(tr.x / scale), y: Math.round(tr.y / scale) };
  const mappedBR = { x: Math.round(br.x / scale), y: Math.round(br.y / scale) };
  const mappedBL = { x: Math.round(bl.x / scale), y: Math.round(bl.y / scale) };

  const mappedTopMid = {
    x: Math.round(midX / scale),
    y: Math.round(topCurveY / scale),
  };

  clampPoint(mappedTL, origW, origH);
  clampPoint(mappedTR, origW, origH);
  clampPoint(mappedBR, origW, origH);
  clampPoint(mappedBL, origW, origH);
  clampPoint(mappedTopMid, origW, origH);

  return {
    topLeft: mappedTL,
    topRight: mappedTR,
    bottomRight: mappedBR,
    bottomLeft: mappedBL,
    edgeCurves: {
      top: mappedTopMid,
      right: { x: Math.round((mappedTR.x + mappedBR.x) / 2), y: Math.round((mappedTR.y + mappedBR.y) / 2) },
      bottom: { x: Math.round((mappedBL.x + mappedBR.x) / 2), y: Math.round((mappedBL.y + mappedBR.y) / 2) },
      left: { x: Math.round((mappedTL.x + mappedBL.x) / 2), y: Math.round((mappedTL.y + mappedBL.y) / 2) },
    },
  };
}

function clampPoint(pt: Point, w: number, h: number) {
  pt.x = Math.max(0, Math.min(w, pt.x));
  pt.y = Math.max(0, Math.min(h, pt.y));
}

export function getDefaultCorners(w: number, h: number, marginPercent: number = 0.04): DocumentCorners {
  const mx = Math.round(w * marginPercent);
  const my = Math.round(h * marginPercent);

  const tl = { x: mx, y: my };
  const tr = { x: w - mx, y: my };
  const br = { x: w - mx, y: h - my };
  const bl = { x: mx, y: h - my };

  return {
    topLeft: tl,
    topRight: tr,
    bottomRight: br,
    bottomLeft: bl,
    edgeCurves: {
      top: { x: Math.round(w / 2), y: my },
      right: { x: w - mx, y: Math.round(h / 2) },
      bottom: { x: Math.round(w / 2), y: h - my },
      left: { x: mx, y: Math.round(h / 2) },
    },
  };
}
