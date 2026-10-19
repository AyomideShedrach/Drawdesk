import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Upload,
  Check,
  X,
  Trash2,
  Layers,
  ArrowRight,
  Settings2,
  RefreshCw,
  Eye,
  Grid,
  Sparkles,
} from 'lucide-react';
import {
  extractDrawingsFromPdf,
  ExtractedDrawing,
  PdfLayoutMode,
} from '../utils/pdfExtractor';
import { Frame } from '../types/storyboard';

interface PdfImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportFrames: (
    frames: Frame[],
    options: { target: 'new' | 'append'; projectTitle: string }
  ) => void;
  currentProjectTitle?: string;
  initialFile?: File | null;
  theme?: 'light' | 'dark';
}

export const PdfImportModal: React.FC<PdfImportModalProps> = ({
  isOpen,
  onClose,
  onImportFrames,
  currentProjectTitle = 'Current Project',
  initialFile = null,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(initialFile);
  const [layoutMode, setLayoutMode] = useState<PdfLayoutMode>('smart-extract');
  const [trimBorders, setTrimBorders] = useState(true);
  const [minImageSize, setMinImageSize] = useState<number>(80);
  const [scenePrefix, setScenePrefix] = useState('1');
  const [startShotNum, setStartShotNum] = useState(1);
  const [targetDestination, setTargetDestination] = useState<'new' | 'append'>('new');
  const [projectTitle, setProjectTitle] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [extractedDrawings, setExtractedDrawings] = useState<ExtractedDrawing[]>([]);
  const [selectedFrameIds, setSelectedFrameIds] = useState<Set<string>>(new Set());

  // Drag over states
  const [isDragging, setIsDragging] = useState(false);

  // Sync initialFile
  useEffect(() => {
    if (initialFile) {
      handleFileSelected(initialFile);
    }
  }, [initialFile]);

  // Clean title when file selected
  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    setProjectTitle(cleanName);
    // Auto-trigger extraction
    triggerExtraction(file, layoutMode, trimBorders, minImageSize);
  };

  const triggerExtraction = async (
    file: File,
    mode: PdfLayoutMode,
    trim: boolean,
    minSize = minImageSize
  ) => {
    setIsProcessing(true);
    setProgressPercent(5);
    setProgressStatus('Initializing PDF stream parser...');

    try {
      const drawings = await extractDrawingsFromPdf(file, {
        layoutMode: mode,
        trimBorders: trim,
        minImageSize: minSize,
        onProgress: (cur, tot, status) => {
          setProgressPercent(Math.round((cur / tot) * 100));
          setProgressStatus(status);
        },
      });

      setExtractedDrawings(drawings);
      setSelectedFrameIds(new Set(drawings.map((d) => d.id)));
    } catch (err: any) {
      console.error('Failed to extract PDF drawings:', err);
      alert('Unable to extract drawings from this PDF. Please verify it is a valid PDF document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReExtract = () => {
    if (selectedFile) {
      triggerExtraction(selectedFile, layoutMode, trimBorders, minImageSize);
    }
  };

  const handleToggleSelectFrame = (id: string) => {
    setSelectedFrameIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRemoveDrawing = (id: string) => {
    setExtractedDrawings((prev) => prev.filter((d) => d.id !== id));
    setSelectedFrameIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedFrameIds(new Set(extractedDrawings.map((d) => d.id)));
  };

  const handleDeselectAll = () => {
    setSelectedFrameIds(new Set());
  };

  const handleFinalImport = () => {
    const drawingsToImport = extractedDrawings.filter((d) => selectedFrameIds.has(d.id));
    if (drawingsToImport.length === 0) return;

    const baseTimestamp = Date.now();
    const frames: Frame[] = drawingsToImport.map((item, idx) => ({
      id: `frame-${baseTimestamp}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      sceneNumber: scenePrefix.trim() || '1',
      panelNumber: `${idx + 1}`,
      shotNumber: `${startShotNum + idx}`,
      actionNotes: item.actionNotes || item.detectedText || '',
      dialogueNotes: item.dialogueNotes || '',
      durationSec: 2,
      canvasData: item.dataUrl,
      timestamp: baseTimestamp + idx * 100,
    }));

    onImportFrames(frames, {
      target: targetDestination,
      projectTitle: projectTitle.trim() || 'Imported PDF Storyboard',
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
    >
      <div
        className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-colors ${
          isDark
            ? 'bg-[#18181b] border-zinc-800 text-zinc-100'
            : 'bg-[#FDFBF7] border-stone-300 text-stone-900'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-stone-200 bg-stone-100/60'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500 border border-sky-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-sans">Import PDF Storyboard</h2>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-stone-600'}`}>
                Extract drawings from PDF pages and arrange them into registered storyboard frames
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition-colors ${
              isDark
                ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-400'
                : 'border-stone-200 hover:bg-stone-200 text-stone-600'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* File Upload Zone */}
          {!selectedFile ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.[0]) {
                  handleFileSelected(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-sky-500 bg-sky-500/10'
                  : isDark
                  ? 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/30'
                  : 'border-stone-300 hover:border-stone-400 bg-white/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileSelected(e.target.files[0]);
                  }
                }}
              />
              <div className="p-4 rounded-full bg-sky-500/10 text-sky-500 mb-3">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold mb-1">Click to select or drop a PDF storyboard</h3>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-stone-500'}`}>
                Supports multi-page storyboards, pitched presentation decks, and grid contact sheets
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* File Info & Configuration Bar */}
              <div
                className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isDark
                    ? 'bg-zinc-900/60 border-zinc-800'
                    : 'bg-white border-stone-200 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-sky-500/15 text-sky-500">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate max-w-xs sm:max-w-md">
                        {selectedFile.name}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400">
                        {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setExtractedDrawings([]);
                      }}
                      className="text-xs text-sky-500 hover:underline mt-0.5"
                    >
                      Choose a different PDF
                    </button>
                  </div>
                </div>

                {/* Layout and Trim Controls */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-mono">
                    <span className={isDark ? 'text-zinc-400' : 'text-stone-600'}>Extraction:</span>
                    <select
                      value={layoutMode}
                      disabled={isProcessing}
                      onChange={(e) => {
                        const newMode = e.target.value as PdfLayoutMode;
                        setLayoutMode(newMode);
                        triggerExtraction(selectedFile, newMode, trimBorders, minImageSize);
                      }}
                      className={`px-2.5 py-1.5 rounded-md border text-xs font-sans ${
                        isDark
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                          : 'bg-stone-100 border-stone-300 text-stone-800'
                      }`}
                    >
                      <option value="smart-extract">⚡ Smart Auto-Extract Drawings (Collects pure image data)</option>
                      <option value="embedded-images-only">🎨 Pure Embedded Images Only (Extract raw drawings)</option>
                      <option value="detect-panel-boxes">📐 Detect Panel Boxes (Storyboard Template)</option>
                      <option value="1-per-page">📄 1 Frame / Page (Full Sheet)</option>
                      <option value="auto-detect">📊 Auto-Detect Pitch Grid</option>
                      <option value="2x1">2 Panels / Page (Horizontal)</option>
                      <option value="1x2">2 Panels / Page (Vertical)</option>
                      <option value="2x2">4 Panels / Page (2x2 Grid)</option>
                      <option value="3x2">6 Panels / Page (3x2 Classic Pitch)</option>
                      <option value="3x3">9 Panels / Page (3x3 Grid)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-mono">
                    <span className={isDark ? 'text-zinc-400' : 'text-stone-600'}>Filter:</span>
                    <select
                      value={minImageSize}
                      disabled={isProcessing}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 80;
                        setMinImageSize(val);
                        triggerExtraction(selectedFile, layoutMode, trimBorders, val);
                      }}
                      className={`px-2 py-1.5 rounded-md border text-xs font-sans ${
                        isDark
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                          : 'bg-stone-100 border-stone-300 text-stone-800'
                      }`}
                      title="Filter out tiny decorative icons, page stamps, or small logos"
                    >
                      <option value={60}>Min 60px (All drawings)</option>
                      <option value={80}>Min 80px (Standard)</option>
                      <option value={140}>Min 140px (Skip logos/icons)</option>
                      <option value={220}>Min 220px (Large panels only)</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={trimBorders}
                      disabled={isProcessing}
                      onChange={(e) => {
                        const newTrim = e.target.checked;
                        setTrimBorders(newTrim);
                        triggerExtraction(selectedFile, layoutMode, newTrim, minImageSize);
                      }}
                      className="rounded border-zinc-400 text-sky-500 focus:ring-sky-400"
                    />
                    <span className={isDark ? 'text-zinc-300' : 'text-stone-700'}>
                      Auto-trim margins
                    </span>
                  </label>

                  <button
                    onClick={handleReExtract}
                    disabled={isProcessing}
                    title="Re-extract drawings"
                    className={`p-1.5 rounded-md border transition-colors ${
                      isDark
                        ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300'
                        : 'border-stone-300 hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Progress Indicator */}
              {isProcessing && (
                <div
                  className={`p-4 rounded-xl border flex flex-col gap-2 ${
                    isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-stone-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-sky-500 font-semibold">{progressStatus}</span>
                    <span className="font-mono">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-sky-500 transition-all duration-200"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Destination & Metadata options */}
              {!isProcessing && extractedDrawings.length > 0 && (
                <div
                  className={`p-4 rounded-xl border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 ${
                    isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-stone-50 border-stone-200'
                  }`}
                >
                  {/* Destination */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono text-zinc-400">Import To</label>
                    <select
                      value={targetDestination}
                      onChange={(e) => setTargetDestination(e.target.value as 'new' | 'append')}
                      className={`px-2.5 py-1.5 rounded-md border text-xs ${
                        isDark
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                          : 'bg-white border-stone-300 text-stone-800'
                      }`}
                    >
                      <option value="new">Create New Project</option>
                      <option value="append">Append to {currentProjectTitle}</option>
                    </select>
                  </div>

                  {/* Project Title (if new) */}
                  {targetDestination === 'new' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-mono text-zinc-400">Project Title</label>
                      <input
                        type="text"
                        value={projectTitle}
                        onChange={(e) => setProjectTitle(e.target.value)}
                        placeholder="Project title..."
                        className={`px-2.5 py-1.5 rounded-md border text-xs ${
                          isDark
                            ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                            : 'bg-white border-stone-300 text-stone-800'
                        }`}
                      />
                    </div>
                  )}

                  {/* Scene Number */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono text-zinc-400">Scene Number</label>
                    <input
                      type="text"
                      value={scenePrefix}
                      onChange={(e) => setScenePrefix(e.target.value)}
                      placeholder="e.g. 1, 01, SC-A"
                      className={`px-2.5 py-1.5 rounded-md border text-xs ${
                        isDark
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                          : 'bg-white border-stone-300 text-stone-800'
                      }`}
                    />
                  </div>

                  {/* Starting Shot Number */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono text-zinc-400">Starting Shot #</label>
                    <input
                      type="number"
                      min={1}
                      value={startShotNum}
                      onChange={(e) => setStartShotNum(parseInt(e.target.value) || 1)}
                      className={`px-2.5 py-1.5 rounded-md border text-xs ${
                        isDark
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                          : 'bg-white border-stone-300 text-stone-800'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Extracted Frame Gallery */}
              {!isProcessing && extractedDrawings.length > 0 && (
                <div className="space-y-3">
                  {/* Extraction Type Badge Banner */}
                  {extractedDrawings.some((d) => d.sourceType === 'embedded-image') ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400">
                      <Sparkles className="w-4 h-4 shrink-0 text-emerald-500" />
                      <span>
                        Extracted <strong>{extractedDrawings.filter((d) => d.sourceType === 'embedded-image').length}</strong> pure image drawings directly from the PDF data stream — clean artwork isolated from page headers, stamps, and margins.
                      </span>
                    </div>
                  ) : extractedDrawings.some((d) => d.sourceType === 'detected-panel') ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-xs text-sky-700 dark:text-sky-400">
                      <Sparkles className="w-4 h-4 shrink-0 text-sky-500" />
                      <span>
                        Detected <strong>{extractedDrawings.filter((d) => d.sourceType === 'detected-panel').length}</strong> storyboard panel boxes from sheet templates.
                      </span>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        Extracted Drawings ({selectedFrameIds.size} of {extractedDrawings.length}{' '}
                        selected)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSelectAll}
                        className="text-sky-500 hover:underline text-xs"
                      >
                        Select All
                      </button>
                      <span className="opacity-40">·</span>
                      <button
                        onClick={handleDeselectAll}
                        className="text-zinc-400 hover:underline text-xs"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  {/* Grid of frames */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto p-1">
                    {extractedDrawings.map((drawing, index) => {
                      const isSelected = selectedFrameIds.has(drawing.id);
                      return (
                        <div
                          key={drawing.id}
                          onClick={() => handleToggleSelectFrame(drawing.id)}
                          className={`group relative rounded-xl border p-2 flex flex-col gap-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-sky-500 ring-2 ring-sky-500/20 bg-sky-500/5'
                              : isDark
                              ? 'border-zinc-800 bg-zinc-900/30 opacity-60 hover:opacity-90'
                              : 'border-stone-200 bg-white opacity-60 hover:opacity-90'
                          }`}
                        >
                          {/* Thumbnail aspect container (16:9 standard field) */}
                          <div className="relative aspect-video rounded-lg overflow-hidden bg-white border border-stone-200 shadow-2xs">
                            <img
                              src={drawing.thumbnailUrl}
                              alt={`Frame ${index + 1}`}
                              className="w-full h-full object-contain"
                            />
                            {/* Selection check badge */}
                            <div
                              className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'bg-sky-500 text-white shadow-xs'
                                  : 'bg-black/40 text-transparent border border-white/50'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>

                            {/* Remove button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveDrawing(drawing.id);
                              }}
                              title="Discard this frame"
                              className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-rose-600 transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>

                            {/* Type badge overlay on image */}
                            <div className="absolute bottom-1 right-1 flex items-center gap-1">
                              {drawing.sourceType === 'embedded-image' && (
                                <span className="px-1 py-0.2 rounded text-[8px] font-mono bg-emerald-950/80 text-emerald-300 font-bold border border-emerald-500/40">
                                  Raw Drawing
                                </span>
                              )}
                              {drawing.sourceType === 'detected-panel' && (
                                <span className="px-1 py-0.2 rounded text-[8px] font-mono bg-sky-950/80 text-sky-300 font-bold border border-sky-500/40">
                                  Panel Frame
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Metadata caption */}
                          <div className="flex flex-col gap-0.5 text-[11px] font-mono">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sky-500">
                                Frame {index + 1}
                              </span>
                              <span className={isDark ? 'text-zinc-400' : 'text-stone-500'}>
                                p.{drawing.pageNumber}
                                {drawing.totalPanelsOnPage > 1 ? `#${drawing.panelIndex}` : ''}
                              </span>
                            </div>

                            {/* Native resolution if available */}
                            {drawing.nativeWidth && drawing.nativeHeight && (
                              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                                <span>{drawing.nativeWidth}×{drawing.nativeHeight}px</span>
                              </div>
                            )}

                            {/* Notes excerpt if detected */}
                            {(drawing.dialogueNotes || drawing.actionNotes) && (
                              <p
                                className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate italic mt-0.5"
                                title={drawing.dialogueNotes || drawing.actionNotes}
                              >
                                &ldquo;{drawing.dialogueNotes || drawing.actionNotes}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-t ${
            isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-stone-200 bg-stone-100/60'
          }`}
        >
          <button
            onClick={onClose}
            className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors ${
              isDark
                ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-300'
                : 'border-stone-300 hover:bg-stone-200 text-stone-700'
            }`}
          >
            Cancel
          </button>

          {selectedFile && extractedDrawings.length > 0 && (
            <button
              onClick={handleFinalImport}
              disabled={isProcessing || selectedFrameIds.size === 0}
              className={`flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg shadow-sm transition-all ${
                selectedFrameIds.size > 0 && !isProcessing
                  ? 'bg-sky-500 hover:bg-sky-400 text-zinc-950 active:scale-95'
                  : 'bg-zinc-700 text-zinc-400 cursor-not-allowed opacity-50'
              }`}
            >
              <span>Import {selectedFrameIds.size} Frames into Storyboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
