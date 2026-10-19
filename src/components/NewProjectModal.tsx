import React, { useState } from 'react';
import { X, Plus, Sparkles, FileText } from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, template: 'demo' | 'blank') => void;
  theme?: 'light' | 'dark';
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  theme = 'light',
}) => {
  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState<'demo' | 'blank'>('demo');
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(title.trim() || 'Untitled Storyboard', template);
    setTitle('');
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
            <Plus className={`w-4 h-4 ${isDark ? 'text-sky-400' : 'text-zinc-700'}`} />
            <h2 className="text-sm font-bold tracking-tight font-sans">New Storyboard Project</h2>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label
              htmlFor="project-title-input"
              className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                isDark ? 'text-zinc-300' : 'text-zinc-700'
              }`}
            >
              Project Title
            </label>
            <input
              id="project-title-input"
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Scene 02 - Rooftop Chase"
              className={`w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors ${
                isDark
                  ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
                  : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800'
              }`}
            />
          </div>

          <div>
            <label
              className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
                isDark ? 'text-zinc-300' : 'text-zinc-700'
              }`}
            >
              Starting Template
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setTemplate('demo')}
                className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                  template === 'demo'
                    ? isDark
                      ? 'bg-sky-950/40 border-sky-600 ring-1 ring-sky-500'
                      : 'bg-zinc-100 border-zinc-800 ring-1 ring-zinc-800'
                    : isDark
                    ? 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                    : 'bg-white border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles
                    className={`w-3.5 h-3.5 ${
                      template === 'demo'
                        ? isDark
                          ? 'text-sky-400'
                          : 'text-zinc-900'
                        : isDark
                        ? 'text-zinc-400'
                        : 'text-zinc-500'
                    }`}
                  />
                  <span className="text-xs font-semibold">Classic Demo</span>
                </div>
                <p
                  className={`text-[11px] leading-snug ${
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  }`}
                >
                  4 pre-animated keyframes of character jump anticipation.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTemplate('blank')}
                className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                  template === 'blank'
                    ? isDark
                      ? 'bg-sky-950/40 border-sky-600 ring-1 ring-sky-500'
                      : 'bg-zinc-100 border-zinc-800 ring-1 ring-zinc-800'
                    : isDark
                    ? 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                    : 'bg-white border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <FileText
                    className={`w-3.5 h-3.5 ${
                      template === 'blank'
                        ? isDark
                          ? 'text-sky-400'
                          : 'text-zinc-900'
                        : isDark
                        ? 'text-zinc-400'
                        : 'text-zinc-500'
                    }`}
                  />
                  <span className="text-xs font-semibold">Blank Sheet</span>
                </div>
                <p
                  className={`text-[11px] leading-snug ${
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  }`}
                >
                  Start fresh with single empty Frame 01 ready to sketch.
                </p>
              </button>
            </div>
          </div>

          {/* Footer Actions */}
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
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition-colors ${
                isDark
                  ? 'bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-white'
              }`}
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
