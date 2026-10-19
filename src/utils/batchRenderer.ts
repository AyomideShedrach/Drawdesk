import JSZip from 'jszip';
import { Frame } from '../types/storyboard';

export interface BatchRenderConfig {
  panelsPerPage: number; // 4 (default), 6, 2, 1
  projectTitle: string;
  theme?: 'light' | 'dark';
}

export interface BatchPageInfo {
  pageIndex: number;
  totalBatches: number;
  frames: Frame[];
  startFrameNumber: number;
  endFrameNumber: number;
}

/**
 * Split frames into batches (default 4 frames per batch page)
 */
export function getBatchPages(frames: Frame[], panelsPerPage = 4): BatchPageInfo[] {
  if (!frames || frames.length === 0) return [];
  const batches: BatchPageInfo[] = [];
  const totalBatches = Math.ceil(frames.length / panelsPerPage);

  for (let i = 0; i < totalBatches; i++) {
    const startIndex = i * panelsPerPage;
    const batchSlice = frames.slice(startIndex, startIndex + panelsPerPage);
    batches.push({
      pageIndex: i,
      totalBatches,
      frames: batchSlice,
      startFrameNumber: startIndex + 1,
      endFrameNumber: startIndex + batchSlice.length,
    });
  }

  return batches;
}

/**
 * Render a single multi-panel batch page to an HTML5 Canvas
 */
export async function renderBatchPageCanvas(
  batch: BatchPageInfo,
  config: BatchRenderConfig
): Promise<HTMLCanvasElement> {
  const { panelsPerPage, projectTitle } = config;
  const isDark = config.theme === 'dark';

  // Sheet dimensions (High-res 2400 x 1700 A4/Letter Landscape standard ratio)
  const W = 2400;
  const H = 1700;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  // 1. Studio Sheet Paper Background
  ctx.fillStyle = isDark ? '#141417' : '#FAF8F4';
  ctx.fillRect(0, 0, W, H);

  // Subtle paper edge border
  ctx.strokeStyle = isDark ? '#27272d' : '#DED9CE';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, W - 40, H - 40);

  // 2. Authentic Acme 3-Hole Peg Registration Punch Holes (Top)
  const pegY = 46;
  ctx.fillStyle = isDark ? '#0b0b0d' : '#B8B2A4';
  // Left Acme slot (0.500 x 0.125 in)
  ctx.beginPath();
  ctx.roundRect(W / 2 - 280, pegY, 68, 18, 9);
  ctx.fill();
  // Center Acme circle (0.250 in)
  ctx.beginPath();
  ctx.arc(W / 2, pegY + 9, 13, 0, Math.PI * 2);
  ctx.fill();
  // Right Acme slot (0.500 x 0.125 in)
  ctx.beginPath();
  ctx.roundRect(W / 2 + 212, pegY, 68, 18, 9);
  ctx.fill();

  // 3. Page Header Stamp Bar
  const headerY = 90;
  ctx.fillStyle = isDark ? '#1a1a20' : '#EDE8DF';
  ctx.fillRect(40, headerY, W - 80, 72);
  ctx.strokeStyle = isDark ? '#2e2e38' : '#D0C9BC';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(40, headerY, W - 80, 72);

  // Brand Stamp & Title
  ctx.fillStyle = isDark ? '#f4f4f5' : '#18181b';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText('STORYBOARD DESK', 65, headerY + 45);

  ctx.fillStyle = isDark ? '#a1a1aa' : '#52525b';
  ctx.font = '18px monospace';
  ctx.fillText(`PROJECT: ${(projectTitle || 'UNTITLED').toUpperCase().slice(0, 32)}`, 380, headerY + 45);

  // Batch Page & Panel Stamp
  ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(
    `BATCH PAGE ${batch.pageIndex + 1} OF ${batch.totalBatches}`,
    W - 550,
    headerY + 45
  );

  ctx.fillStyle = isDark ? '#9ca3af' : '#6b7280';
  ctx.font = '16px monospace';
  ctx.fillText(
    `PANELS ${batch.startFrameNumber}–${batch.endFrameNumber}`,
    W - 220,
    headerY + 45
  );

  // 4. Panel Grid Calculations
  let cols = 2;
  let rows = 2;

  if (panelsPerPage === 6) {
    cols = 3;
    rows = 2;
  } else if (panelsPerPage === 2) {
    cols = 2;
    rows = 1;
  } else if (panelsPerPage === 1) {
    cols = 1;
    rows = 1;
  }

  const gridMarginX = 50;
  const gridMarginY = 185;
  const gridGapX = 40;
  const gridGapY = 35;

  const availableW = W - gridMarginX * 2 - gridGapX * (cols - 1);
  const availableH = H - gridMarginY - 80 - gridGapY * (rows - 1);

  const cardW = availableW / cols;
  const cardH = availableH / rows;

  // Render each panel card
  for (let slot = 0; slot < cols * rows; slot++) {
    const col = slot % cols;
    const row = Math.floor(slot / cols);
    const cardX = gridMarginX + col * (cardW + gridGapX);
    const cardY = gridMarginY + row * (cardH + gridGapY);

    const frame = batch.frames[slot];

    if (!frame) {
      // Empty slot placeholder
      ctx.strokeStyle = isDark ? '#23232a' : '#E2DCD2';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(cardX, cardY, cardW, cardH);
      ctx.setLineDash([]);
      continue;
    }

    // Panel Card Container
    ctx.fillStyle = isDark ? '#1c1c22' : '#FFFFFF';
    ctx.fillRect(cardX, cardY, cardW, cardH);

    ctx.strokeStyle = isDark ? '#32323c' : '#D6CFBF';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cardX, cardY, cardW, cardH);

    // Card Header Bar
    const cardHeaderH = 38;
    ctx.fillStyle = isDark ? '#24242c' : '#F5F2EB';
    ctx.fillRect(cardX, cardY, cardW, cardHeaderH);
    ctx.strokeStyle = isDark ? '#32323c' : '#D6CFBF';
    ctx.lineWidth = 1;
    ctx.strokeRect(cardX, cardY, cardW, cardHeaderH);

    // Scene / Panel / Shot Stamp
    ctx.fillStyle = isDark ? '#e4e4e7' : '#1f2937';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(
      `SCENE: ${frame.sceneNumber}   PANEL: ${frame.panelNumber}   SHOT: ${frame.shotNumber}`,
      cardX + 16,
      cardY + 25
    );

    // Timing Stamp
    ctx.fillStyle = isDark ? '#9ca3af' : '#4b5563';
    ctx.font = '14px monospace';
    const frCount = Math.round((frame.durationSec || 1.0) * 24);
    ctx.fillText(
      `TIME: ${frame.durationSec || 1.0}s (${frCount} FR)`,
      cardX + cardW - 200,
      cardY + 25
    );

    // Drawing Canvas Area (16:9)
    const padding = 18;
    const drawW = cardW - padding * 2;
    // Leave room for notes at bottom (approx 95px for 2-row layout)
    const notesAreaH = rows === 1 ? 160 : 96;
    const maxDrawH = cardH - cardHeaderH - padding - notesAreaH;

    let targetDrawW = drawW;
    let targetDrawH = targetDrawW * (9 / 16);

    if (targetDrawH > maxDrawH) {
      targetDrawH = maxDrawH;
      targetDrawW = targetDrawH * (16 / 9);
    }

    const drawX = cardX + (cardW - targetDrawW) / 2;
    const drawY = cardY + cardHeaderH + 12;

    // Drawing box background & border
    ctx.fillStyle = isDark ? '#141416' : '#FAF9F6';
    ctx.fillRect(drawX, drawY, targetDrawW, targetDrawH);
    ctx.strokeStyle = isDark ? '#383844' : '#DDD6C8';
    ctx.lineWidth = 1;
    ctx.strokeRect(drawX, drawY, targetDrawW, targetDrawH);

    // Draw frame artwork
    if (frame.canvasData && frame.canvasData.length > 50) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, drawX, drawY, targetDrawW, targetDrawH);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = frame.canvasData;
      });
    } else {
      // Empty frame placeholder
      ctx.fillStyle = isDark ? '#3f3f46' : '#9ca3af';
      ctx.font = 'italic 16px sans-serif';
      ctx.fillText('(Blank Frame)', drawX + targetDrawW / 2 - 45, drawY + targetDrawH / 2 + 5);
    }

    // Notes Box Area
    const notesY = drawY + targetDrawH + 16;
    ctx.fillStyle = isDark ? '#f4f4f5' : '#18181b';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('ACTION:', cardX + 18, notesY);

    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = isDark ? '#d4d4d8' : '#374151';
    const action = frame.actionNotes || '—';
    ctx.fillText(action.slice(0, 95), cardX + 85, notesY);

    const dialY = notesY + 22;
    ctx.fillStyle = isDark ? '#f4f4f5' : '#18181b';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('DIALOGUE:', cardX + 18, dialY);

    ctx.font = 'italic 13px system-ui, sans-serif';
    ctx.fillStyle = isDark ? '#a1a1aa' : '#4b5563';
    const dialogue = frame.dialogueNotes ? `"${frame.dialogueNotes}"` : '—';
    ctx.fillText(dialogue.slice(0, 95), cardX + 105, dialY);
  }

  // 5. Page Footer Bar
  const footerY = H - 38;
  ctx.fillStyle = isDark ? '#71717a' : '#8c8577';
  ctx.font = '13px monospace';
  ctx.fillText(
    `TRADITIONAL ANIMATION STORYBOARD DESK • BATCH RENDER (${panelsPerPage} PANELS/SHEET)`,
    60,
    footerY
  );

  ctx.fillText(
    `PAGE ${batch.pageIndex + 1} OF ${batch.totalBatches} • TOTAL ${config.projectTitle || 'STORYBOARD'}`,
    W - 550,
    footerY
  );

  return canvas;
}

/**
 * Generate a ZIP file of all batch pages and trigger browser download
 */
export async function exportAllBatchesAsZip(
  frames: Frame[],
  config: BatchRenderConfig,
  onProgress?: (progressPercent: number, statusText: string) => void
): Promise<void> {
  const batches = getBatchPages(frames, config.panelsPerPage);
  if (batches.length === 0) return;

  const zip = new JSZip();
  const folderName = `${(config.projectTitle || 'storyboard')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')}_batch_pages`;
  const folder = zip.folder(folderName) || zip;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    if (onProgress) {
      const pct = Math.round((i / batches.length) * 80);
      onProgress(pct, `Rendering Batch Page ${i + 1} of ${batches.length} (Panels ${batch.startFrameNumber}–${batch.endFrameNumber})...`);
    }

    const canvas = await renderBatchPageCanvas(batch, config);
    const dataUrl = canvas.toDataURL('image/png');
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');

    const pageStr = String(i + 1).padStart(2, '0');
    const pStart = String(batch.startFrameNumber).padStart(2, '0');
    const pEnd = String(batch.endFrameNumber).padStart(2, '0');
    const filename = `batch_page_${pageStr}_panels_${pStart}-${pEnd}.png`;

    folder.file(filename, base64Data, { base64: true });
  }

  if (onProgress) {
    onProgress(85, 'Packaging ZIP archive...');
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
    if (onProgress) {
      const pct = 85 + Math.round((metadata.percent / 100) * 15);
      onProgress(pct, `Compressing files (${Math.round(metadata.percent)}%)...`);
    }
  });

  // Trigger download
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${folderName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  if (onProgress) {
    onProgress(100, 'Batch export complete!');
  }
}

/**
 * Print batch pages directly or open in print dialog
 */
export async function printBatchPages(
  frames: Frame[],
  config: BatchRenderConfig,
  onProgress?: (progressPercent: number, statusText: string) => void
): Promise<void> {
  const batches = getBatchPages(frames, config.panelsPerPage);
  if (batches.length === 0) return;

  const imageUrls: string[] = [];
  for (let i = 0; i < batches.length; i++) {
    if (onProgress) {
      onProgress(Math.round(((i + 1) / batches.length) * 100), `Preparing print page ${i + 1} of ${batches.length}...`);
    }
    const canvas = await renderBatchPageCanvas(batches[i], config);
    imageUrls.push(canvas.toDataURL('image/png'));
  }

  const printWin = window.open('', '_blank');
  if (!printWin) {
    alert('Please allow popups to print batch pages.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${config.projectTitle || 'Storyboard'} - Batch Print</title>
        <style>
          @page {
            size: landscape;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            background: #fff;
          }
          .page {
            page-break-after: always;
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100vw;
            height: 100vh;
            box-sizing: border-box;
            padding: 10mm;
          }
          img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
          }
        </style>
      </head>
      <body>
        ${imageUrls.map((src, i) => `<div class="page"><img src="${src}" alt="Batch Page ${i + 1}" /></div>`).join('')}
        <script>
          window.onload = function() {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWin.document.write(html);
  printWin.document.close();
}
