import type { FilterOptions } from '../types';

/**
 * Fast integral image generation for O(1) box blur calculation
 */
function createIntegralImage(gray: Uint8Array, width: number, height: number): Float64Array {
  const integral = new Float64Array((width + 1) * (height + 1));
  const intW = width + 1;

  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    const grayRowOffset = y * width;
    const intRowOffset = (y + 1) * intW;
    const prevIntRowOffset = y * intW;

    for (let x = 0; x < width; x++) {
      rowSum += gray[grayRowOffset + x];
      integral[intRowOffset + (x + 1)] = integral[prevIntRowOffset + (x + 1)] + rowSum;
    }
  }

  return integral;
}

function getAreaAverage(
  integral: Float64Array,
  intW: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const area = (x2 - x1) * (y2 - y1);
  if (area <= 0) return 128;
  const total =
    integral[y2 * intW + x2] -
    integral[y1 * intW + x2] -
    integral[y2 * intW + x1] +
    integral[y1 * intW + x1];
  return total / area;
}

/**
 * Studio-Grade CamScanner "Magic Color" (Sihirli Renk):
 * 1. Removes all background shadows, yellowing and ambient light unevenness
 * 2. Turns paper into pure crisp white (#FFFFFF)
 * 3. Deepens black text and sharpens edges
 * 4. Preserves and boosts colored pen (blue/red) and stamps
 */
export function applyMagicColor(imageData: ImageData): void {
  const { data, width, height } = imageData;
  const numPixels = width * height;

  const gray = new Uint8Array(numPixels);
  for (let i = 0; i < numPixels; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = (r * 77 + g * 150 + b * 29) >> 8;
  }

  const integral = createIntegralImage(gray, width, height);
  const intW = width + 1;

  // Window radius for local illumination background estimation
  const radius = Math.max(16, Math.min(50, Math.round(width / 30)));

  for (let y = 0; y < height; y++) {
    const y1 = Math.max(0, y - radius);
    const y2 = Math.min(height, y + radius + 1);

    for (let x = 0; x < width; x++) {
      const x1 = Math.max(0, x - radius);
      const x2 = Math.min(width, x + radius + 1);

      const localBg = getAreaAverage(integral, intW, x1, y1, x2, y2);
      const idx = (y * width + x) * 4;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Normalized ratio against local background
      const safeBg = Math.max(30, localBg);
      const ratio = 255 / safeBg;

      let nr = r * ratio;
      let ng = g * ratio;
      let nb = b * ratio;

      // S-Curve contrast stretch: White point clipping at 210, Black point darkening at 105
      nr = enhancePixelCurve(nr);
      ng = enhancePixelCurve(ng);
      nb = enhancePixelCurve(nb);

      // Chroma enhancement: keep blue/red pen vivid
      const lum = nr * 0.299 + ng * 0.587 + nb * 0.114;
      const sat = 1.35;
      nr = lum + (nr - lum) * sat;
      ng = lum + (ng - lum) * sat;
      nb = lum + (nb - lum) * sat;

      data[idx] = Math.max(0, Math.min(255, Math.round(nr)));
      data[idx + 1] = Math.max(0, Math.min(255, Math.round(ng)));
      data[idx + 2] = Math.max(0, Math.min(255, Math.round(nb)));
    }
  }
}

function enhancePixelCurve(val: number): number {
  if (val >= 215) return 255; // Crisp pure paper white
  if (val <= 85) return Math.max(0, val * 0.7); // Dark ink deepening
  // Smooth cubic S-curve in midtones
  const t = (val - 85) / (215 - 85);
  const smooth = t * t * (3 - 2 * t);
  return 85 * 0.7 + smooth * (255 - 85 * 0.7);
}

/**
 * Adaptive Thresholding (Bradley-Roth) for 1-bit crisp document photocopy
 */
export function applyAdaptiveBW(imageData: ImageData, thresholdT: number = 0.14): void {
  const { data, width, height } = imageData;
  const numPixels = width * height;

  const gray = new Uint8Array(numPixels);
  for (let i = 0; i < numPixels; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = (r * 77 + g * 150 + b * 29) >> 8;
  }

  const integral = createIntegralImage(gray, width, height);
  const intW = width + 1;
  const radius = Math.max(12, Math.round(width / 32));

  for (let y = 0; y < height; y++) {
    const y1 = Math.max(0, y - radius);
    const y2 = Math.min(height, y + radius + 1);

    for (let x = 0; x < width; x++) {
      const x1 = Math.max(0, x - radius);
      const x2 = Math.min(width, x + radius + 1);

      const avg = getAreaAverage(integral, intW, x1, y1, x2, y2);
      const currentVal = gray[y * width + x];

      const idx = (y * width + x) * 4;
      const isForeground = currentVal < avg * (1.0 - thresholdT);
      const val = isForeground ? 0 : 255;

      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
    }
  }
}

/**
 * Clean high-contrast Grayscale
 */
export function applyGrayscale(imageData: ImageData): void {
  const { data } = imageData;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    let gray = (r * 77 + g * 150 + b * 29) >> 8;

    if (gray > 210) gray = 255;
    else if (gray < 85) gray = Math.max(0, gray * 0.7);
    else {
      const t = (gray - 85) / 125;
      gray = Math.round(59 + t * t * (3 - 2 * t) * (255 - 59));
    }

    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
}

/**
 * Sharp & Vivid filter
 */
export function applySharpVivid(imageData: ImageData): void {
  const { data, width, height } = imageData;
  const copy = new Uint8ClampedArray(data);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;

      for (let c = 0; c < 3; c++) {
        const top = copy[((y - 1) * width + x) * 4 + c];
        const bottom = copy[((y + 1) * width + x) * 4 + c];
        const left = copy[(y * width + (x - 1)) * 4 + c];
        const right = copy[(y * width + (x + 1)) * 4 + c];
        const center = copy[idx + c];

        let val = center * 5 - (top + bottom + left + right);
        val = (val - 128) * 1.15 + 138;
        data[idx + c] = Math.max(0, Math.min(255, val));
      }
    }
  }
}

export function adjustBrightnessContrast(
  imageData: ImageData,
  brightness: number,
  contrast: number
): void {
  if (brightness === 0 && contrast === 0) return;

  const { data } = imageData;
  const factor = (259 * (contrast + 100)) / (100 * (259 - contrast));

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let val = data[i + c] + brightness * 2;
      val = factor * (val - 128) + 128;
      data[i + c] = Math.max(0, Math.min(255, val));
    }
  }
}

export function processImageWithFilter(
  canvas: HTMLCanvasElement,
  options: FilterOptions
): HTMLCanvasElement {
  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = canvas.width;
  resultCanvas.height = canvas.height;

  const ctx = resultCanvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.drawImage(canvas, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  switch (options.type) {
    case 'magic':
      applyMagicColor(imageData);
      break;
    case 'bw':
      applyAdaptiveBW(imageData);
      break;
    case 'grayscale':
      applyGrayscale(imageData);
      break;
    case 'sharp':
      applySharpVivid(imageData);
      break;
    case 'original':
    default:
      break;
  }

  if (options.brightness !== 0 || options.contrast !== 0) {
    adjustBrightnessContrast(imageData, options.brightness, options.contrast);
  }

  ctx.putImageData(imageData, 0, 0);
  return resultCanvas;
}
