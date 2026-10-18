import React, { useState } from 'react';
import { X, Copy, Download, FileCode2 } from 'lucide-react';

interface SaveAsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTitle: string;
  onSaveAsCopy: (newTitle: string) => void;
  onExportTrad: (filename: string) => void;
  theme?: 'light' | 'dark';
}

export const SaveAsModal: React.FC<SaveAsModalProps> = ({
  isOpen,
  onClose,
  currentTitle,
  onSaveAsCopy,
  onExportTrad,
  theme = 'light',
}) => {
  const [copyTitle, setCopyTitle] = useState(`${currentTitle} (Copy)`);
  const [tradFilename, setTradFilename] = useState(
    `${currentTitle.toLowerCase().replace(/[^a-z0-9_-]+/gi, '_') || 'storyboard'}.trad`
  );
  const [activeTab, setActiveTab] = useState<'copy' | 'trad'>('trad');
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  const handleCopySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveAsCopy(copyTitle.trim() || `${currentTitle} (Copy)`);
    onClose();
  };

  const handleTradSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let name = tradFilename.trim();
    if (!name.toLowerCase().endsWith('.trad')) {
      name = `${name}.trad`;
    }
    onExportTrad(name);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`w-full max-w-md rounded-xl shadow-2xl border overflow-hidden transition-colors ${
          isDark
            ? 'bg-[#18181b] border-zinc-700 text-zinc-100'
            : 'bg-[#FDFBF7] border-zinc-300 text-zinc-900'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b ${
            isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50/70'
          }`}
        >
          <div className="flex items-center gap-2">
            <Copy className={`w-4 h-4 ${isDark ? 'text-sky-400' : 'text-zinc-700'}`} />
            <h2 className="text-sm font-bold tracking-tight font-sans">Save As...</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-md transition-colors ${
              isDark
                ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div
          className={`flex border-b px-5 pt-3 gap-4 text-xs font-semibold ${
            isDark ? 'border-zinc-800' : 'border-zinc-200'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab('trad')}
            className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'trad'
                ? isDark
                  ? 'border-sky-400 text-sky-400 font-bold'
                  : 'border-zinc-900 text-zinc-950 font-bold'
                : isDark
                ? 'border-transparent text-zinc-400 hover:text-zinc-200'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>Save as .trad File</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('copy')}
            className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'copy'
                ? isDark
                  ? 'border-sky-400 text-sky-400 font-bold'
                  : 'border-zinc-900 text-zinc-950 font-bold'
                : isDark
                ? 'border-transparent text-zinc-400 hover:text-zinc-200'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Save Copy in Library</span>
          </button>
        </div>

        {/* Content */}
        {activeTab === 'trad' ? (
          <form onSubmit={handleTradSubmit} className="p-5 space-y-4">
            <div>
              <p
                className={`text-xs mb-3 leading-relaxed ${
                  isDark ? 'text-zinc-400' : 'text-zinc-600'
                }`}
              >
                Downloads the complete storyboard project with drawings, pegs, metadata, and perspective grids as a native <code className="font-mono font-bold text-sky-500">.trad</code> file.
              </p>
              <label
                htmlFor="trad-filename-input"
                className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}
              >
                File Name (.trad)
              </label>
              <input
                id="trad-filename-input"
                type="text"
                autoFocus
                value={tradFilename}
                onChange={(e) => setTradFilename(e.target.value)}
                placeholder="project.trad"
                className={`w-full px-3 py-2 text-sm font-mono rounded-lg border outline-none transition-colors ${
                  isDark
                    ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500 focus:border-sky-500'
                    : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-zinc-800'
                }`}
              />
            </div>

            <div
              className={`pt-3 flex items-center justify-end gap-2.5 border-t ${
                isDark ? 'border-zinc-800' : 'border-zinc-200'
              }`}
            >
              <button
                type="button"
                onClick={onClose}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  isDark
                    ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300'
                    : 'border-zinc-300 hover:bg-zinc-100 text-zinc-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition-colors ${
                  isDark
                    ? 'bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .trad File</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCopySubmit} className="p-5 space-y-4">
            <div>
              <p
                className={`text-xs mb-3 leading-relaxed ${
                  isDark ? 'text-zinc-400' : 'text-zinc-600'
                }`}
              >
                Duplicates the entire storyboard into a separate independent project in your local Projects Library.
              </p>
              <label
                htmlFor="copy-title-input"
                className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}
              >
                New Project Title
              </label>
              <input
                id="copy-title-input"
                type="text"
                autoFocus
                value={copyTitle}
                onChange={(e) => setCopyTitle(e.target.value)}
                placeholder="e.g. Scene 01 - The Jump (Revision B)"
                className={`w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors ${
                  isDark
                    ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500 focus:border-sky-500'
                    : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-zinc-800'
                }`}
              />
            </div>

            <div
              className={`pt-3 flex items-center justify-end gap-2.5 border-t ${
                isDark ? 'border-zinc-800' : 'border-zinc-200'
              }`}
            >
              <button
                type="button"
                onClick={onClose}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  isDark
                    ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300'
                    : 'border-zinc-300 hover:bg-zinc-100 text-zinc-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition-colors ${
                  isDark
                    ? 'bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                }`}
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Save Copy in Library</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
