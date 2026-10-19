import React, { useState, useRef, useEffect } from 'react';
import {
  FileCode2,
  FolderOpen,
  Plus,
  Save,
  Copy,
  Download,
  FileImage,
  ChevronDown,
  Video,
  FileText,
  Sparkles,
  Film,
} from 'lucide-react';

interface FileMenuProps {
  onNew: () => void;
  onOpenProjects: () => void;
  onOpenTradFile: () => void;
  onOpenPdfImport?: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExportTrad: () => void;
  onExportImages: () => void;
  onOpenTimelapse?: () => void;
  onOpenAnimatic?: () => void;
  onOpenLiimeSuite?: () => void;
  isSaved?: boolean;
  theme?: 'light' | 'dark';
}

export const FileMenu: React.FC<FileMenuProps> = ({
  onNew,
  onOpenProjects,
  onOpenTradFile,
  onOpenPdfImport,
  onSave,
  onSaveAs,
  onExportTrad,
  onExportImages,
  onOpenTimelapse,
  onOpenAnimatic,
  onOpenLiimeSuite,
  theme = 'light',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
          isOpen
            ? isDark
              ? 'bg-zinc-800 text-white border-zinc-600'
              : 'bg-zinc-200 text-zinc-950 border-zinc-400'
            : isDark
            ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-800'
            : 'bg-[#FDFBF7] hover:bg-zinc-100 text-zinc-800 border-zinc-300'
        }`}
      >
        <span>File</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 mt-1.5 w-56 rounded-xl border shadow-xl py-1.5 z-50 animate-in fade-in-50 zoom-in-95 duration-100 ${
            isDark
              ? 'bg-[#18181b] border-zinc-700 text-zinc-100 divide-zinc-800'
              : 'bg-[#FDFBF7] border-zinc-300 text-zinc-900 divide-zinc-200'
          }`}
        >
          {/* New & Open Group */}
          <div className="px-1 py-1">
            <button
              onClick={() => handleAction(onNew)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                isDark ? 'hover:bg-zinc-800 text-zinc-100' : 'hover:bg-zinc-100 text-zinc-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 text-sky-500" />
                <span className="font-medium">New Project</span>
              </div>
              <span className={`text-[10px] font-mono ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Ctrl+N
              </span>
            </button>

            <button
              onClick={() => handleAction(onOpenProjects)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                isDark ? 'hover:bg-zinc-800 text-zinc-100' : 'hover:bg-zinc-100 text-zinc-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-medium">Projects Library</span>
              </div>
            </button>

            <button
              onClick={() => handleAction(onOpenTradFile)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                isDark ? 'hover:bg-zinc-800 text-zinc-100' : 'hover:bg-zinc-100 text-zinc-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileCode2 className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-medium">Open .trad File...</span>
              </div>
              <span className={`text-[10px] font-mono ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Ctrl+O
              </span>
            </button>

            {onOpenPdfImport && (
              <button
                onClick={() => handleAction(onOpenPdfImport)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                  isDark ? 'hover:bg-zinc-800 text-zinc-100' : 'hover:bg-zinc-100 text-zinc-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-medium">Import PDF Storyboard...</span>
                </div>
              </button>
            )}
          </div>

          <div className={`h-px my-1 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />

          {/* Save Group */}
          <div className="px-1 py-1">
            <button
              onClick={() => handleAction(onSave)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                isDark ? 'hover:bg-zinc-800 text-zinc-100' : 'hover:bg-zinc-100 text-zinc-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Save className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-medium">Save Project</span>
              </div>
              <span className={`text-[10px] font-mono ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Ctrl+S
              </span>
            </button>

            <button
              onClick={() => handleAction(onSaveAs)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                isDark ? 'hover:bg-zinc-800 text-zinc-100' : 'hover:bg-zinc-100 text-zinc-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Copy className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-medium">Save As...</span>
              </div>
            </button>

            <button
              onClick={() => handleAction(onExportTrad)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                isDark ? 'hover:bg-zinc-800 text-zinc-100' : 'hover:bg-zinc-100 text-zinc-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-medium">Download .trad File</span>
              </div>
            </button>
          </div>

          <div className={`h-px my-1 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />

          {/* Export Sheet / Images / Timelapse */}
          <div className="px-1 py-1">
            <button
              onClick={() => handleAction(onExportImages)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                isDark ? 'hover:bg-zinc-800 text-zinc-100' : 'hover:bg-zinc-100 text-zinc-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileImage className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-medium">Export & Batch Render...</span>
              </div>
            </button>

            {onOpenAnimatic && (
              <button
                onClick={() => handleAction(onOpenAnimatic)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                  isDark ? 'hover:bg-zinc-800 text-zinc-100' : 'hover:bg-zinc-100 text-zinc-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Film className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-medium">Animatic Mode (Timing & Video)...</span>
                </div>
              </button>
            )}

            {onOpenTimelapse && (
              <button
                onClick={() => handleAction(onOpenTimelapse)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                  isDark ? 'hover:bg-zinc-800 text-zinc-100' : 'hover:bg-zinc-100 text-zinc-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Video className="w-3.5 h-3.5 text-rose-500" />
                  <span className="font-medium">Timelapse (Record UI)...</span>
                </div>
              </button>
            )}

            {onOpenLiimeSuite && (
              <button
                onClick={() => handleAction(onOpenLiimeSuite)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors mt-0.5 border-t border-zinc-200/60 dark:border-zinc-800 pt-1.5 ${
                  isDark ? 'hover:bg-zinc-800 text-emerald-300' : 'hover:bg-zinc-100 text-emerald-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="font-bold">LIIME Suite Portal...</span>
                </div>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
