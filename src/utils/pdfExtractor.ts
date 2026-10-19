import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set up the worker for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type ExtractedSourceType =
  | 'embedded-image'
  | 'detected-panel'
  | 'page-crop'
  | 'grid-slice';

export interface ExtractedDrawing {
  id: string;
  pageNumber: number;
  panelIndex: number;
  totalPanelsOnPage: number;
  dataUrl: string; // 960x540 base64 png
  originalAspectRatio: number;
  thumbnailUrl: string;
  detectedText?: string;
  actionNotes?: string;
  dialogueNotes?: string;
  sourceType: ExtractedSourceType;
  nativeWidth?: number;
  nativeHeight?: number;
}

export type PdfLayoutMode =
  | 'smart-extract' // Smartest: extracts pure embedded drawing image data; falls back to panel box detection
  | 'embedded-images-only' // Strictly extracts raw embedded drawing images from PDF data stream
  | 'detect-panel-boxes' // Segment rectangular panel boxes from storyboard template sheet
  | '1-per-page' // 1 frame per page with borders trimmed
  | 'auto-detect' // Auto grid based on sheet aspect ratio
  | '2x1'
  | '1x2'
  | '2x2'
  | '3x2'
  | '3x3';

export interface ExtractionOptions {
  layoutMode: PdfLayoutMode;
  trimBorders: boolean;
  minImageSize?: number; // Minimum width/height to filter out icons (default 80px)
  extractTextNotes?: boolean;
  targetWidth?: number;
  targetHeight?: number;
  onProgress?: (current: number, total: number, status: string) => void;
}

interface RawInterceptedImage {
  canvas: HTMLCanvasElement;
  pageX: number;
  pageY: number;
  pageWidth: number;
  pageHeight: number;
  naturalWidth: number;
  naturalHeight: number;
}

interface TextItemInfo {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Trims white/light borders from a canvas image and returns cropped canvas
 */
function trimCanvasBorders(
  sourceCanvas: HTMLCanvasElement,
  threshold = 245
): HTMLCanvasElement {
  const ctx = sourceCanvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  if (width <= 0 || height <= 0) return sourceCanvas;

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // If pixel has opacity and is not light paper background
      if (a > 30 && (r < threshold || g < threshold || b < threshold)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If entire page was blank or content spans whole page, keep as-is
  if (minX >= maxX || minY >= maxY) {
    return sourceCanvas;
  }

  // Add 1.5% padding around content
  const paddingX = Math.round(width * 0.015);
  const paddingY = Math.round(height * 0.015);

  minX = Math.max(0, minX - paddingX);
  minY = Math.max(0, minY - paddingY);
  maxX = Math.min(width, maxX + paddingX);
  maxY = Math.min(height, maxY + paddingY);

  const cropW = maxX - minX;
  const cropH = maxY - minY;

  if (cropW < 40 || cropH < 40) {
    return sourceCanvas;
  }

  const cropped = document.createElement('canvas');
  cropped.width = cropW;
  cropped.height = cropH;
  const cCtx = cropped.getContext('2d');
  if (cCtx) {
    cCtx.drawImage(sourceCanvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
  }
  return cropped;
}

/**
 * Fits a cropped drawing into a standardized 16:9 960x540 storyboard canvas
 */
function fitIntoStoryboardCanvas(
  drawingCanvas: HTMLCanvasElement,
  targetWidth = 960,
  targetHeight = 540
): string {
  const outCanvas = document.createElement('canvas');
  outCanvas.width = targetWidth;
  outCanvas.height = targetHeight;
  const ctx = outCanvas.getContext('2d');
  if (!ctx) return '';

  // Clean white storyboard paper background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  // Aspect fit the drawing into the 16:9 canvas with slight margin
  const srcW = drawingCanvas.width;
  const srcH = drawingCanvas.height;
  if (srcW <= 0 || srcH <= 0) return '';

  const scale = Math.min((targetWidth - 16) / srcW, (targetHeight - 16) / srcH);

  const drawW = srcW * scale;
  const drawH = srcH * scale;
  const drawX = (targetWidth - drawW) / 2;
  const drawY = (targetHeight - drawH) / 2;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(drawingCanvas, drawX, drawY, drawW, drawH);

  return outCanvas.toDataURL('image/png');
}

/**
 * Sorts items placed on a 2D page into natural storyboard reading order:
 * Top-to-bottom, Left-to-right with row grouping tolerance.
 */
function sortItemsReadingOrder<T extends { pageX: number; pageY: number; pageHeight: number }>(
  items: T[]
): T[] {
  if (items.length <= 1) return items;

  // Clone to avoid mutating original
  const sorted = [...items].sort((a, b) => a.pageY - b.pageY);
  const rows: T[][] = [];
  let currentRow: T[] = [];
  let currentRowY = sorted[0].pageY;
  const rowThreshold = Math.max(30, (sorted[0].pageHeight || 100) * 0.4);

  for (const item of sorted) {
    if (currentRow.length === 0) {
      currentRow.push(item);
      currentRowY = item.pageY;
    } else if (Math.abs(item.pageY - currentRowY) <= rowThreshold) {
      currentRow.push(item);
    } else {
      rows.push(currentRow);
      currentRow = [item];
      currentRowY = item.pageY;
    }
  }
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  // Sort each row by X (left to right)
  const result: T[] = [];
  for (const row of rows) {
    row.sort((a, b) => a.pageX - b.pageX);
    result.push(...row);
  }

  return result;
}

/**
 * Finds text content located underneath or beside a panel's page coordinates
 */
function findAssociatedNotes(
  textItems: TextItemInfo[],
  panelBox: { pageX: number; pageY: number; pageWidth: number; pageHeight: number }
): { actionNotes: string; dialogueNotes: string } {
  if (textItems.length === 0) {
    return { actionNotes: '', dialogueNotes: '' };
  }

  const { pageX, pageY, pageWidth, pageHeight } = panelBox;
  const bottomY = pageY + pageHeight;

  // Look for text below the panel within 180 points, or slightly overlapping bottom
  const nearby = textItems.filter((t) => {
    const isHorizontallyAligned =
      t.x >= pageX - 40 && t.x <= pageX + pageWidth + 40;
    const isBelow = t.y >= bottomY - 20 && t.y <= bottomY + 220;
    return isHorizontallyAligned && isBelow;
  });

  nearby.sort((a, b) => (Math.abs(a.y - b.y) < 10 ? a.x - b.x : a.y - b.y));

  const combinedText = nearby.map((n) => n.str.trim()).filter(Boolean).join(' ');

  let actionNotes = '';
  let dialogueNotes = '';

  // Check for common storyboard keywords
  const dialMatch = combinedText.match(/(?:dialogue|dial|line)[:\-]\s*([^]+?)(?=(?:action|notes|scene|$))/i);
  const actMatch = combinedText.match(/(?:action|notes|desc)[:\-]\s*([^]+?)(?=(?:dialogue|dial|$))/i);

  if (dialMatch || actMatch) {
    if (dialMatch) dialogueNotes = dialMatch[1].trim();
    if (actMatch) actionNotes = actMatch[1].trim();
  } else if (combinedText) {
    actionNotes = combinedText;
  }

  return { actionNotes, dialogueNotes };
}

/**
 * Detects rectangular storyboard panel frames on a rendered page canvas
 * (used when PDF does not store separate image streams, e.g. printed pitch decks)
 */
function detectPanelBoxesOnCanvas(
  canvas: HTMLCanvasElement,
  trimBorders: boolean
): HTMLCanvasElement[] {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx || width < 200 || height < 200) return [];

  // Downsample to a fast analysis grid (max ~600px)
  const scale = Math.min(1.0, 600 / Math.max(width, height));
  const smallW = Math.round(width * scale);
  const smallH = Math.round(height * scale);

  const smallCanvas = document.createElement('canvas');
  smallCanvas.width = smallW;
  smallCanvas.height = smallH;
  const sCtx = smallCanvas.getContext('2d');
  if (!sCtx) return [];

  sCtx.drawImage(canvas, 0, 0, smallW, smallH);
  const imgData = sCtx.getImageData(0, 0, smallW, smallH);
  const d = imgData.data;

  // Create binary contrast mask: 1 = dark drawing stroke/ink, 0 = light paper
  const binary = new Uint8Array(smallW * smallH);
  for (let i = 0; i < smallW * smallH; i++) {
    const idx = i * 4;
    const r = d[idx];
    const g = d[idx + 1];
    const b = d[idx + 2];
    const a = d[idx + 3];
    // Dark ink or colored drawing marks
    if (a > 50 && (r < 220 || g < 220 || b < 220)) {
      binary[i] = 1;
    }
  }

  // Scan horizontal projection to identify candidate panel bands
  const hProj = new Float32Array(smallH);
  for (let y = 0; y < smallH; y++) {
    let count = 0;
    const rowOffset = y * smallW;
    for (let x = 0; x < smallW; x++) {
      count += binary[rowOffset + x];
    }
    hProj[y] = count / smallW;
  }

  // Scan vertical projection to identify candidate panel columns
  const vProj = new Float32Array(smallW);
  for (let x = 0; x < smallW; x++) {
    let count = 0;
    for (let y = 0; y < smallH; y++) {
      count += binary[y * smallW + x];
    }
    vProj[x] = count / smallH;
  }

  // Find candidate horizontal bands with significant drawing ink
  interface Band {
    start: number;
    end: number;
  }
  const hBands: Band[] = [];
  let inBand = false;
  let bandStart = 0;
  const hThreshold = 0.04;

  for (let y = 0; y < smallH; y++) {
    if (hProj[y] > hThreshold && !inBand) {
      inBand = true;
      bandStart = y;
    } else if (hProj[y] <= hThreshold && inBand) {
      if (y - bandStart > smallH * 0.08) {
        hBands.push({ start: bandStart, end: y });
      }
      inBand = false;
    }
  }
  if (inBand && smallH - bandStart > smallH * 0.08) {
    hBands.push({ start: bandStart, end: smallH });
  }

  // If no clear bands found or whole page is single band
  if (hBands.length === 0 || (hBands.length === 1 && hBands[0].end - hBands[0].start > smallH * 0.85)) {
    return [];
  }

  // For each band, find horizontal columns
  const panels: { x: number; y: number; w: number; h: number }[] = [];

  for (const hBand of hBands) {
    const bandH = hBand.end - hBand.start;
    // Compute vProj inside this band
    const bandVProj = new Float32Array(smallW);
    for (let x = 0; x < smallW; x++) {
      let count = 0;
      for (let y = hBand.start; y < hBand.end; y++) {
        count += binary[y * smallW + x];
      }
      bandVProj[x] = count / bandH;
    }

    let inCol = false;
    let colStart = 0;
    const vThreshold = 0.05;

    for (let x = 0; x < smallW; x++) {
      if (bandVProj[x] > vThreshold && !inCol) {
        inCol = true;
        colStart = x;
      } else if (bandVProj[x] <= vThreshold && inCol) {
        if (x - colStart > smallW * 0.12) {
          panels.push({
            x: Math.round(colStart / scale),
            y: Math.round(hBand.start / scale),
            w: Math.round((x - colStart) / scale),
            h: Math.round(bandH / scale),
          });
        }
        inCol = false;
      }
    }
    if (inCol && smallW - colStart > smallW * 0.12) {
      panels.push({
        x: Math.round(colStart / scale),
        y: Math.round(hBand.start / scale),
        w: Math.round((smallW - colStart) / scale),
        h: Math.round(bandH / scale),
      });
    }
  }

  // Filter out tiny header bars or footnotes: panels must have reasonable aspect ratio (0.8 to 3.0)
  const validPanels = panels.filter((p) => {
    const aspect = p.w / p.h;
    const areaFraction = (p.w * p.h) / (width * height);
    return aspect >= 0.75 && aspect <= 3.2 && areaFraction >= 0.03 && areaFraction <= 0.8;
  });

  if (validPanels.length < 2) {
    return [];
  }

  // Crop panels from original high-res canvas
  const results: HTMLCanvasElement[] = [];
  for (const p of validPanels) {
    const pCanvas = document.createElement('canvas');
    pCanvas.width = p.w;
    pCanvas.height = p.h;
    const pCtx = pCanvas.getContext('2d');
    if (pCtx) {
      pCtx.drawImage(canvas, p.x, p.y, p.w, p.h, 0, 0, p.w, p.h);
      results.push(trimBorders ? trimCanvasBorders(pCanvas) : pCanvas);
    }
  }

  return results;
}

/**
 * Extracts grid panels based on equal mathematical row/column divisions
 */
function extractGridPanels(
  pageCanvas: HTMLCanvasElement,
  rows: number,
  cols: number,
  trimBorders: boolean
): HTMLCanvasElement[] {
  const results: HTMLCanvasElement[] = [];
  const cellWidth = Math.floor(pageCanvas.width / cols);
  const cellHeight = Math.floor(pageCanvas.height / rows);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const subCanvas = document.createElement('canvas');
      subCanvas.width = cellWidth;
      subCanvas.height = cellHeight;
      const subCtx = subCanvas.getContext('2d');
      if (!subCtx) continue;

      subCtx.drawImage(
        pageCanvas,
        c * cellWidth,
        r * cellHeight,
        cellWidth,
        cellHeight,
        0,
        0,
        cellWidth,
        cellHeight
      );

      const processedCanvas = trimBorders ? trimCanvasBorders(subCanvas) : subCanvas;
      results.push(processedCanvas);
    }
  }

  return results;
}

/**
 * Reads a PDF file, intercepts pure image data directly from the document streams,
 * and organizes all drawings into sequential storyboard frames.
 */
export async function extractDrawingsFromPdf(
  file: File,
  options: ExtractionOptions
): Promise<ExtractedDrawing[]> {
  const {
    layoutMode,
    trimBorders,
    minImageSize = 80,
    targetWidth = 960,
    targetHeight = 540,
    onProgress,
  } = options;

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  const allExtractedDrawings: ExtractedDrawing[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    onProgress?.(
      pageNum,
      numPages,
      `Analyzing PDF page ${pageNum} of ${numPages} for drawings...`
    );

    const page = await pdfDoc.getPage(pageNum);
    // Render at crisp 2.0x scale
    const viewport = page.getViewport({ scale: 2.0 });

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = viewport.width;
    pageCanvas.height = viewport.height;
    const pageCtx = pageCanvas.getContext('2d');

    if (!pageCtx) continue;

    // Fill white background before rendering
    pageCtx.fillStyle = '#FFFFFF';
    pageCtx.fillRect(0, 0, viewport.width, viewport.height);

    // List to capture pure embedded drawing image data during render
    const interceptedImages: RawInterceptedImage[] = [];

    // Wrap drawImage on page context to capture all embedded image assets directly
    const originalDrawImage = pageCtx.drawImage.bind(pageCtx);

    (pageCtx as any).drawImage = function (img: any, ...args: any[]) {
      // Call original so the page canvas still renders
      (originalDrawImage as any)(img, ...args);

      try {
        const naturalWidth = img.naturalWidth || img.videoWidth || img.width || 0;
        const naturalHeight = img.naturalHeight || img.videoHeight || img.height || 0;

        // Filter out tiny icons, dots, 1-pixel rules, and non-drawing stamps
        if (
          naturalWidth >= minImageSize &&
          naturalHeight >= minImageSize &&
          naturalWidth * naturalHeight >= 12000
        ) {
          const transform = pageCtx.getTransform();
          const pageX = transform.e;
          const pageY = transform.f;
          const scaleX = Math.sqrt(transform.a * transform.a + transform.b * transform.b);
          const scaleY = Math.sqrt(transform.c * transform.c + transform.d * transform.d);
          const pageWidth = naturalWidth * (scaleX || 1);
          const pageHeight = naturalHeight * (scaleY || 1);

          // Clone pristine image data onto its own drawing canvas
          const imgCanvas = document.createElement('canvas');
          imgCanvas.width = naturalWidth;
          imgCanvas.height = naturalHeight;
          const imgCtx = imgCanvas.getContext('2d');
          if (imgCtx) {
            imgCtx.drawImage(img, 0, 0);
            interceptedImages.push({
              canvas: imgCanvas,
              pageX,
              pageY,
              pageWidth,
              pageHeight,
              naturalWidth,
              naturalHeight,
            });
          }
        }
      } catch (err) {
        // Continue if interception had error on specific element
      }
    };

    // Render the page (triggers drawImage for each embedded drawing)
    await page.render({
      canvasContext: pageCtx,
      viewport: viewport,
      canvas: pageCanvas,
    }).promise;

    // Extract text content and coordinates for notes association
    const textItems: TextItemInfo[] = [];
    try {
      const textContent = await page.getTextContent();
      for (const item of textContent.items as any[]) {
        if ('str' in item && item.str.trim()) {
          const tx = item.transform?.[4] || 0;
          const ty = viewport.height - (item.transform?.[5] || 0); // Convert PDF inverted Y
          textItems.push({
            str: item.str,
            x: tx,
            y: ty,
            width: item.width || 0,
            height: item.height || 0,
          });
        }
      }
    } catch {
      // Continue if text layer absent
    }

    // Determine extraction strategy for this page
    const shouldLookForEmbeddedImages =
      layoutMode === 'smart-extract' || layoutMode === 'embedded-images-only';

    if (shouldLookForEmbeddedImages && interceptedImages.length > 0) {
      // SORT drawings in storyboard reading order (Top-to-bottom, Left-to-right)
      const sortedImages = sortItemsReadingOrder(interceptedImages);

      sortedImages.forEach((imgItem, idx) => {
        const processed = trimBorders ? trimCanvasBorders(imgItem.canvas) : imgItem.canvas;
        const dataUrl = fitIntoStoryboardCanvas(processed, targetWidth, targetHeight);
        const notes = findAssociatedNotes(textItems, imgItem);

        allExtractedDrawings.push({
          id: `pdf-img-${pageNum}-${idx + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          pageNumber: pageNum,
          panelIndex: idx + 1,
          totalPanelsOnPage: sortedImages.length,
          dataUrl,
          originalAspectRatio: imgItem.naturalWidth / imgItem.naturalHeight,
          thumbnailUrl: dataUrl,
          detectedText: notes.actionNotes || notes.dialogueNotes || undefined,
          actionNotes: notes.actionNotes,
          dialogueNotes: notes.dialogueNotes,
          sourceType: 'embedded-image',
          nativeWidth: imgItem.naturalWidth,
          nativeHeight: imgItem.naturalHeight,
        });
      });
      continue;
    }

    // If strictly embedded images only, skip fallback
    if (layoutMode === 'embedded-images-only') {
      continue;
    }

    // Next fallback for smart-extract or explicit 'detect-panel-boxes':
    if (layoutMode === 'smart-extract' || layoutMode === 'detect-panel-boxes') {
      const detectedPanels = detectPanelBoxesOnCanvas(pageCanvas, trimBorders);
      if (detectedPanels.length > 0) {
        detectedPanels.forEach((pCanvas, idx) => {
          const dataUrl = fitIntoStoryboardCanvas(pCanvas, targetWidth, targetHeight);
          allExtractedDrawings.push({
            id: `pdf-panel-${pageNum}-${idx + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            pageNumber: pageNum,
            panelIndex: idx + 1,
            totalPanelsOnPage: detectedPanels.length,
            dataUrl,
            originalAspectRatio: pCanvas.width / pCanvas.height,
            thumbnailUrl: dataUrl,
            sourceType: 'detected-panel',
            nativeWidth: pCanvas.width,
            nativeHeight: pCanvas.height,
          });
        });
        continue;
      }
    }

    // Grid modes:
    let rows = 1;
    let cols = 1;

    if (layoutMode === '2x1') {
      rows = 1;
      cols = 2;
    } else if (layoutMode === '1x2') {
      rows = 2;
      cols = 1;
    } else if (layoutMode === '2x2') {
      rows = 2;
      cols = 2;
    } else if (layoutMode === '3x2') {
      rows = 2;
      cols = 3;
    } else if (layoutMode === '3x3') {
      rows = 3;
      cols = 3;
    } else if (layoutMode === 'auto-detect') {
      const aspect = pageCanvas.width / pageCanvas.height;
      if (aspect < 0.85) {
        // Vertical sheet (Letter / A4 portrait pitch)
        rows = 3;
        cols = 2;
      } else if (aspect > 1.3 && aspect < 1.9) {
        rows = 1;
        cols = 1;
      } else {
        rows = 2;
        cols = 2;
      }
    }

    if (rows === 1 && cols === 1) {
      // 1 frame per page
      const processedCanvas = trimBorders ? trimCanvasBorders(pageCanvas) : pageCanvas;
      const dataUrl = fitIntoStoryboardCanvas(processedCanvas, targetWidth, targetHeight);
      const combinedText = textItems.map((t) => t.str).join(' ').trim();

      allExtractedDrawings.push({
        id: `pdf-page-${pageNum}-1-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        pageNumber: pageNum,
        panelIndex: 1,
        totalPanelsOnPage: 1,
        dataUrl,
        originalAspectRatio: pageCanvas.width / pageCanvas.height,
        thumbnailUrl: dataUrl,
        detectedText: combinedText || undefined,
        actionNotes: combinedText || undefined,
        sourceType: 'page-crop',
        nativeWidth: pageCanvas.width,
        nativeHeight: pageCanvas.height,
      });
    } else {
      const panelCanvases = extractGridPanels(pageCanvas, rows, cols, trimBorders);
      panelCanvases.forEach((pCanvas, idx) => {
        const dataUrl = fitIntoStoryboardCanvas(pCanvas, targetWidth, targetHeight);
        allExtractedDrawings.push({
          id: `pdf-grid-${pageNum}-${idx + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          pageNumber: pageNum,
          panelIndex: idx + 1,
          totalPanelsOnPage: panelCanvases.length,
          dataUrl,
          originalAspectRatio: 16 / 9,
          thumbnailUrl: dataUrl,
          sourceType: 'grid-slice',
          nativeWidth: pCanvas.width,
          nativeHeight: pCanvas.height,
        });
      });
    }
  }

  onProgress?.(
    numPages,
    numPages,
    `Successfully extracted ${allExtractedDrawings.length} drawing panels!`
  );
  return allExtractedDrawings;
}
