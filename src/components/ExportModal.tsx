import React, { useState, useEffect, useRef } from 'react';
import { Frame } from '../types/storyboard';
import {
  Download,
  X,
  FileImage,
  LayoutGrid,
  FileCode2,
  Video,
  Layers,
  Archive,
  Printer,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowLeft,
  Check,
} from 'lucide-react';
import {
  getBatchPages,
  renderBatchPageCanvas,
  exportAllBatchesAsZip,
  printBatchPages,
  BatchPageInfo,
} from '../utils/batchRenderer';
import { DrawDeskLogo } from './DrawDeskLogo';

interface ExportModalProps {
  frames: Frame[];
  currentFrameIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onExportTrad?: () => void;
  onOpenTimelapse?: () => void;
  projectTitle?: string;
  theme?: 'light' | 'dark';
}

export const ExportModal: React.FC<ExportModalProps> = ({
  frames,
  currentFrameIndex,
  isOpen,
  onClose,
  onExportTrad,
  onOpenTimelapse,
  projectTitle = 'Storyboard Project',
  theme = 'light',
}) => {
  const [activeTab, setActiveTab] = useState<'options' | 'batch'>('options');
  const [isExporting, setIsExporting] = useState(false);

  // Batch Render State
  const [panelsPerPage, setPanelsPerPage] = useState<number>(4);
  const [currentBatchIndex, setCurrentBatchIndex] = useState<number>(0);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<number>(0);
  const [batchStatusText, setBatchStatusText] = useState<string>('');

  const previewCache = useRef<Map<string, string>>(new Map());
  const isDark = theme === 'dark';

  const batchPages: BatchPageInfo[] = getBatchPages(frames, panelsPerPage);
  const currentBatch = batchPages[currentBatchIndex] || batchPages[0];

  // Reset tab and batch index when modal opens
  useEffect(() => {
    if (isOpen) {
      previewCache.current.clear();
      setBatchProgress(0);
      setBatchStatusText('');
      setIsExporting(false);
    }
  }, [isOpen]);

  // Render preview for currently viewed batch page
  useEffect(() => {
    if (!isOpen || activeTab !== 'batch' || !currentBatch) return;

    let isMounted = true;
    const cacheKey = `${panelsPerPage}_${currentBatchIndex}_${theme}`;

    if (previewCache.current.has(cacheKey)) {
      setPreviewDataUrl(previewCache.current.get(cacheKey) || null);
      return;
    }

    setIsPreviewLoading(true);

    renderBatchPageCanvas(currentBatch, {
      panelsPerPage,
      projectTitle,
      theme,
    })
      .then((canvas) => {
        if (isMounted) {
          const url = canvas.toDataURL('image/png');
          previewCache.current.set(cacheKey, url);
          setPreviewDataUrl(url);
          setIsPreviewLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to render batch preview:', err);
        if (isMounted) setIsPreviewLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeTab, currentBatchIndex, panelsPerPage, projectTitle, theme, currentBatch]);

  if (!isOpen) return null;

  // 1. Export Current Frame
  const handleExportCurrent = () => {
    const frame = frames[currentFrameIndex];
    if (!frame.canvasData) return;
    const a = document.createElement('a');
    a.href = frame.canvasData;
    a.download = `${projectTitle.toLowerCase().replace(/\s+/g, '_')}_sc${frame.sceneNumber}_pn${frame.panelNumber}.png`;
    a.click();
  };

  // 2. Export Storyboard Contact Sheet (All panels on single sheet)
  const handleExportContactSheet = async () => {
    setIsExporting(true);
    try {
      const cols = 2;
      const rows = Math.ceil(frames.length / cols);
      const cardWidth = 640;
      const cardHeight = 440;
      const margin = 30;

      const totalWidth = cols * cardWidth + (cols + 1) * margin;
      const totalHeight = rows * cardHeight + (rows + 1) * margin + 80;

      const canvas = document.createElement('canvas');
      canvas.width = totalWidth;
      canvas.height = totalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = isDark ? '#141417' : '#FAF8F4';
      ctx.fillRect(0, 0, totalWidth, totalHeight);

      // Sheet title header
      ctx.fillStyle = isDark ? '#ffffff' : '#18181b';
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.fillText('STORYBOARD PRODUCTION SHEET', margin, 50);

      ctx.fillStyle = isDark ? '#a1a1aa' : '#71717a';
      ctx.font = '14px monospace';
      ctx.fillText(
        `TOTAL PANELS: ${frames.length} | EXPORT DATE: ${new Date().toLocaleDateString()}`,
        margin + 460,
        50
      );

      // Draw each frame
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const col = i % cols;
        const row = Math.floor(i / cols);

        const x = margin + col * (cardWidth + margin);
        const y = 90 + row * (cardHeight + margin);

        // Frame card background
        ctx.fillStyle = isDark ? '#1e1e24' : '#ffffff';
        ctx.fillRect(x, y, cardWidth, cardHeight);
        ctx.strokeStyle = isDark ? '#2e2e38' : '#d4d4d8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, cardWidth, cardHeight);

        // Header stamp
        ctx.fillStyle = isDark ? '#e4e4e7' : '#18181b';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(
          `SCENE: ${frame.sceneNumber}   PANEL: ${frame.panelNumber}   SHOT: ${frame.shotNumber}`,
          x + 16,
          y + 24
        );
        ctx.fillStyle = isDark ? '#a1a1aa' : '#71717a';
        ctx.fillText(`TIME: ${frame.durationSec}s`, x + cardWidth - 110, y + 24);

        // Canvas image
        if (frame.canvasData) {
          const img = new Image();
          await new Promise<void>((resolve) => {
            img.onload = () => {
              const imgW = cardWidth - 32;
              const imgH = imgW * (9 / 16);
              ctx.strokeStyle = isDark ? '#33333d' : '#e4e4e7';
              ctx.strokeRect(x + 16, y + 36, imgW, imgH);
              ctx.drawImage(img, x + 16, y + 36, imgW, imgH);
              resolve();
            };
            img.onerror = () => resolve();
            img.src = frame.canvasData;
          });
        }

        const imgH = (cardWidth - 32) * (9 / 16);
        ctx.fillStyle = isDark ? '#f4f4f5' : '#27272a';
        ctx.font = '11px sans-serif';
        const actionText = frame.actionNotes ? `ACTION: ${frame.actionNotes}` : 'ACTION: -';
        ctx.fillText(actionText.slice(0, 75), x + 16, y + 36 + imgH + 26);

        if (frame.dialogueNotes) {
          ctx.fillStyle = isDark ? '#a1a1aa' : '#52525b';
          ctx.font = 'italic 11px sans-serif';
          ctx.fillText(`DIALOGUE: "${frame.dialogueNotes.slice(0, 75)}"`, x + 16, y + 36 + imgH + 46);
        }
      }

      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `${projectTitle.toLowerCase().replace(/\s+/g, '_')}_contact_sheet.png`;
      a.click();
    } finally {
      setIsExporting(false);
    }
  };

  // 3. Batch Render: Download Current Batch Page (PNG)
  const handleDownloadSingleBatch = async () => {
    if (!currentBatch) return;
    setIsExporting(true);
    try {
      const canvas = await renderBatchPageCanvas(currentBatch, {
        panelsPerPage,
        projectTitle,
        theme,
      });
      const pageStr = String(currentBatch.pageIndex + 1).padStart(2, '0');
      const pStart = String(currentBatch.startFrameNumber).padStart(2, '0');
      const pEnd = String(currentBatch.endFrameNumber).padStart(2, '0');
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `${projectTitle.toLowerCase().replace(/\s+/g, '_')}_batch_p${pageStr}_panels_${pStart}-${pEnd}.png`;
      a.click();
    } finally {
      setIsExporting(false);
    }
  };

  // 4. Batch Render: Download All Batches as a ZIP file
  const handleDownloadAllBatchesZip = async () => {
    setIsExporting(true);
    setBatchProgress(5);
    setBatchStatusText('Initializing batch renderer...');
    try {
      await exportAllBatchesAsZip(
        frames,
        {
          panelsPerPage,
          projectTitle,
          theme,
        },
        (pct, status) => {
          setBatchProgress(pct);
          setBatchStatusText(status);
        }
      );
    } catch (err) {
      console.error('Batch ZIP export failed:', err);
      setBatchStatusText('Export failed. Please try again.');
    } finally {
      setTimeout(() => {
        setIsExporting(false);
      }, 800);
    }
  };

  // 5. Batch Render: Print / PDF
  const handlePrintBatches = async () => {
    setIsExporting(true);
    setBatchStatusText('Preparing print layout...');
    try {
      await printBatchPages(
        frames,
        {
          panelsPerPage,
          projectTitle,
          theme,
        },
        (pct, status) => {
          setBatchProgress(pct);
          setBatchStatusText(status);
        }
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className={`relative w-full ${
          activeTab === 'batch' ? 'max-w-3xl' : 'max-w-lg'
        } rounded-xl p-5 sm:p-6 shadow-2xl border transition-all duration-200 max-h-[92vh] flex flex-col overflow-hidden ${
          isDark
            ? 'bg-[#18181b] border-zinc-800 text-zinc-100'
            : 'bg-[#FDFBF7] border-zinc-300 text-zinc-900'
        }`}
      >
        {/* Header Bar */}
        <div
          className={`flex items-center justify-between border-b pb-3.5 shrink-0 ${
            isDark ? 'border-zinc-800' : 'border-zinc-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {activeTab === 'batch' ? (
              <button
                onClick={() => setActiveTab('options')}
                className={`p-1.5 rounded-lg border transition-colors ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'
                    : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700'
                }`}
                title="Back to all rendering options"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <DrawDeskLogo className="w-8 h-8 shrink-0" size={32} />
            )}
            <div>
              <h3 className={`font-semibold text-sm ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                {activeTab === 'batch' ? 'DrawDesk Batch Render (Multi-Page Sheets)' : 'DrawDesk Exporter'}
              </h3>
              <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {activeTab === 'batch'
                  ? `${batchPages.length} batch pages • ${frames.length} total panels`
                  : 'Select production rendering or export format'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-md transition-colors ${
              isDark
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab 1: List of All Rendering Options */}
        {activeTab === 'options' && (
          <div className="mt-4 flex flex-col gap-2.5 overflow-y-auto pr-1">
            {/* NEW / HIGHLIGHTED: Batch Render Option */}
            <button
              onClick={() => setActiveTab('batch')}
              className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all group relative shadow-2xs ${
                isDark
                  ? 'bg-sky-950/20 hover:bg-sky-900/30 border-sky-500/40 hover:border-sky-400'
                  : 'bg-sky-50/70 hover:bg-sky-100/80 border-sky-300 hover:border-sky-500'
              }`}
            >
              <span className="absolute top-3 right-3 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                Batch Mode
              </span>

              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500 shrink-0 mt-0.5">
                <Layers className="w-5 h-5" />
              </div>
              <div className="pr-16">
                <div
                  className={`font-semibold text-xs transition-colors flex items-center gap-1.5 ${
                    isDark ? 'text-sky-300 group-hover:text-white' : 'text-sky-900 group-hover:text-black'
                  }`}
                >
                  <span>Batch Render (e.g. 4 Pages per Batch)</span>
                </div>
                <div
                  className={`text-[11px] mt-1 leading-relaxed ${
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  }`}
                >
                  Compiles all {frames.length} storyboard frames into <strong>4 panels per page/batch</strong> presentation sheets with Acme peg holes, headers, and dialogue. Download all as a single <strong>.ZIP</strong> or preview each page.
                </div>
              </div>
            </button>

            {/* Option 2: Export Current Frame */}
            <button
              onClick={() => {
                handleExportCurrent();
                onClose();
              }}
              className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-colors group shadow-2xs ${
                isDark
                  ? 'bg-zinc-900/80 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-700'
                  : 'bg-zinc-100/60 hover:bg-zinc-100 border-zinc-300 hover:border-zinc-400'
              }`}
            >
              <div className="p-2 rounded-lg bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 shrink-0 mt-0.5">
                <FileImage className="w-5 h-5" />
              </div>
              <div>
                <div
                  className={`font-semibold text-xs transition-colors ${
                    isDark
                      ? 'text-zinc-200 group-hover:text-white'
                      : 'text-zinc-900 group-hover:text-black'
                  }`}
                >
                  Export Current Drawing (PNG)
                </div>
                <div className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Download the active Panel {frames[currentFrameIndex].panelNumber} artwork as a high-resolution standalone PNG.
                </div>
              </div>
            </button>

            {/* Option 3: Full Storyboard Contact Sheet (Single PNG) */}
            <button
              disabled={isExporting}
              onClick={handleExportContactSheet}
              className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-colors group shadow-2xs disabled:opacity-50 ${
                isDark
                  ? 'bg-zinc-900/80 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-700'
                  : 'bg-zinc-100/60 hover:bg-zinc-100 border-zinc-300 hover:border-zinc-400'
              }`}
            >
              <div className="p-2 rounded-lg bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 shrink-0 mt-0.5">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <div>
                <div
                  className={`font-semibold text-xs transition-colors ${
                    isDark
                      ? 'text-zinc-200 group-hover:text-white'
                      : 'text-zinc-900 group-hover:text-black'
                  }`}
                >
                  {isExporting ? 'Generating Contact Sheet...' : 'Export Contact Sheet (Single PNG)'}
                </div>
                <div className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Compile all {frames.length} panels onto a single panoramic studio wall sheet.
                </div>
              </div>
            </button>

            {/* Option 4: Export .trad project file */}
            {onExportTrad && (
              <button
                onClick={() => {
                  onExportTrad();
                  onClose();
                }}
                className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-colors group shadow-2xs ${
                  isDark
                    ? 'bg-zinc-900/80 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-700'
                    : 'bg-zinc-100/60 hover:bg-zinc-100 border-zinc-300 hover:border-zinc-400'
                }`}
              >
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0 mt-0.5">
                  <FileCode2 className="w-5 h-5" />
                </div>
                <div>
                  <div
                    className={`font-semibold text-xs transition-colors ${
                      isDark
                        ? 'text-zinc-200 group-hover:text-white'
                        : 'text-zinc-900 group-hover:text-black'
                    }`}
                  >
                    Export .trad Project File
                  </div>
                  <div className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    Download complete raw project backup including all layers, pegs, and audio for re-opening anytime.
                  </div>
                </div>
              </button>
            )}

            {/* Option 5: Timelapse Video */}
            {onOpenTimelapse && (
              <button
                onClick={() => {
                  onClose();
                  onOpenTimelapse();
                }}
                className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-colors group shadow-2xs ${
                  isDark
                    ? 'bg-zinc-900/80 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-700'
                    : 'bg-zinc-100/60 hover:bg-zinc-100 border-zinc-300 hover:border-zinc-400'
                }`}
              >
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500 shrink-0 mt-0.5">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <div
                    className={`font-semibold text-xs transition-colors ${
                      isDark
                        ? 'text-zinc-200 group-hover:text-white'
                        : 'text-zinc-900 group-hover:text-black'
                    }`}
                  >
                    Record Process Timelapse Video
                  </div>
                  <div className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    Capture a high-speed timelapse video of your creative process showing the complete studio UI and drawing strokes.
                  </div>
                </div>
              </button>
            )}
          </div>
        )}

        {/* Tab 2: Batch Render Studio (e.g. 4 Pages per Batch) */}
        {activeTab === 'batch' && (
          <div className="mt-3 flex flex-col gap-3 overflow-y-auto pr-1">
            {/* Controls Row: Density Selector & Pagination */}
            <div
              className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-zinc-100/70 border-zinc-300'
              }`}
            >
              {/* Batch Size Selector (4 panels default) */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Batch Density:
                </span>
                <div className="flex items-center gap-1">
                  {[
                    { count: 4, label: '4 / Batch (2x2)' },
                    { count: 6, label: '6 / Batch (3x2)' },
                    { count: 2, label: '2 / Batch (1x2)' },
                    { count: 1, label: '1 / Batch' },
                  ].map((opt) => (
                    <button
                      key={`density-${opt.count}`}
                      onClick={() => {
                        setPanelsPerPage(opt.count);
                        setCurrentBatchIndex(0);
                      }}
                      className={`px-2 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                        panelsPerPage === opt.count
                          ? isDark
                            ? 'bg-sky-500 text-white font-bold shadow-xs'
                            : 'bg-sky-600 text-white font-bold shadow-xs'
                          : isDark
                          ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                          : 'bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Batch Page Navigator */}
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  disabled={currentBatchIndex === 0}
                  onClick={() => setCurrentBatchIndex((i) => Math.max(0, i - 1))}
                  className={`p-1.5 rounded-md border disabled:opacity-30 disabled:pointer-events-none transition-colors ${
                    isDark
                      ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                      : 'bg-white hover:bg-zinc-50 border-zinc-300 text-zinc-700'
                  }`}
                  title="Previous Batch Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div
                  className={`px-2.5 py-1 rounded-md border font-mono text-xs tabular-nums ${
                    isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-300'
                  }`}
                >
                  <span className="font-bold text-sky-500">
                    Batch {currentBatchIndex + 1}
                  </span>
                  <span className="text-zinc-500"> / {batchPages.length}</span>
                  {currentBatch && (
                    <span className="text-zinc-500 font-sans ml-1 text-[11px]">
                      (Panels {currentBatch.startFrameNumber}–{currentBatch.endFrameNumber})
                    </span>
                  )}
                </div>

                <button
                  disabled={currentBatchIndex >= batchPages.length - 1}
                  onClick={() => setCurrentBatchIndex((i) => Math.min(batchPages.length - 1, i + 1))}
                  className={`p-1.5 rounded-md border disabled:opacity-30 disabled:pointer-events-none transition-colors ${
                    isDark
                      ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                      : 'bg-white hover:bg-zinc-50 border-zinc-300 text-zinc-700'
                  }`}
                  title="Next Batch Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Interactive Batch Page Live Preview Frame */}
            <div
              className={`relative w-full aspect-[24/17] max-h-[46vh] rounded-xl border overflow-hidden flex items-center justify-center shadow-inner ${
                isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-300'
              }`}
            >
              {isPreviewLoading ? (
                <div className="flex flex-col items-center gap-2 text-zinc-500">
                  <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
                  <span className="text-xs font-mono">Rendering high-res batch preview...</span>
                </div>
              ) : previewDataUrl ? (
                <img
                  src={previewDataUrl}
                  alt={`Batch Page ${currentBatchIndex + 1}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xs text-zinc-500">Preview unavailable</span>
              )}

              {/* Watermark Tag */}
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] font-mono text-zinc-300 pointer-events-none">
                Page {currentBatchIndex + 1} of {batchPages.length} • {panelsPerPage} panels/batch
              </div>
            </div>

            {/* Progress Bar (when exporting all batches or packaging ZIP) */}
            {isExporting && (
              <div
                className={`p-3 rounded-xl border flex flex-col gap-1.5 ${
                  isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-sky-50/80 border-sky-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-sky-600 dark:text-sky-400 font-semibold flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{batchStatusText || 'Rendering batch sheets...'}</span>
                  </span>
                  <span className="font-bold">{batchProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-sky-500 transition-all duration-200"
                    style={{ width: `${batchProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Batch Action Buttons Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {/* Primary Action: Download All Batches as ZIP */}
              <button
                disabled={isExporting}
                onClick={handleDownloadAllBatchesZip}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all shadow-sm ${
                  isDark
                    ? 'bg-sky-500 hover:bg-sky-400 text-white active:scale-98'
                    : 'bg-sky-600 hover:bg-sky-700 text-white active:scale-98'
                } disabled:opacity-50`}
                title={`Render and download all ${batchPages.length} batch sheets in a ZIP archive`}
              >
                <Archive className="w-4 h-4" />
                <span>Download All ({batchPages.length} Pages .ZIP)</span>
              </button>

              {/* Action 2: Download Current Batch Page (PNG) */}
              <button
                disabled={isExporting}
                onClick={handleDownloadSingleBatch}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all shadow-2xs ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border-zinc-700'
                    : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300'
                } disabled:opacity-50`}
                title="Download this specific batch page as high-res PNG"
              >
                <Download className="w-4 h-4" />
                <span>Save This Page (PNG)</span>
              </button>

              {/* Action 3: Print / Multi-Page PDF Preview */}
              <button
                disabled={isExporting}
                onClick={handlePrintBatches}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all shadow-2xs ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border-zinc-700'
                    : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300'
                } disabled:opacity-50`}
                title="Print batch sheets or save as multi-page PDF"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div
          className={`mt-4 pt-3 border-t flex items-center justify-between shrink-0 ${
            isDark ? 'border-zinc-800' : 'border-zinc-200'
          }`}
        >
          {activeTab === 'batch' ? (
            <button
              onClick={() => setActiveTab('options')}
              className={`flex items-center gap-1 text-xs font-semibold ${
                isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Export Menu</span>
            </button>
          ) : (
            <div className="text-[11px] font-mono text-zinc-500">
              Total frames: {frames.length}
            </div>
          )}

          <button
            onClick={onClose}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700'
                : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
