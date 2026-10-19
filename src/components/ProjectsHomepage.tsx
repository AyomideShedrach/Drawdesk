import React, { useState, useRef } from 'react';
import { ProjectSummary } from '../types/storyboard';
import { DrawDeskLogo } from './DrawDeskLogo';
import {
  Plus,
  FolderOpen,
  Download,
  Copy,
  Trash2,
  Edit2,
  Clock,
  Layers,
  Sparkles,
  Search,
  Check,
  X,
  FileCode2,
  FileText,
  Palette,
  Film,
} from 'lucide-react';

interface ProjectsHomepageProps {
  projects: ProjectSummary[];
  activeProjectId: string;
  onOpenProject: (id: string) => void;
  onCreateNewProject: () => void;
  onOpenTradFile: (file: File) => void;
  onOpenPdfFile?: (file: File) => void;
  onSaveAsTrad: (id: string) => void;
  onDuplicateProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string, newTitle: string) => void;
  theme?: 'light' | 'dark';
  onOpenIllustrationMode?: () => void;
  onOpenAnimaticMode?: (projectId?: string) => void;
  onOpenLiimeSuite?: () => void;
}

export const ProjectsHomepage: React.FC<ProjectsHomepageProps> = ({
  projects,
  activeProjectId,
  onOpenProject,
  onCreateNewProject,
  onOpenTradFile,
  onOpenPdfFile,
  onSaveAsTrad,
  onDuplicateProject,
  onDeleteProject,
  onRenameProject,
  theme = 'light',
  onOpenIllustrationMode,
  onOpenAnimaticMode,
  onOpenLiimeSuite,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const isDark = theme === 'dark';

  const filteredProjects = projects.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.pdf')) {
        onOpenPdfFile?.(file);
      } else if (lower.endsWith('.trad') || lower.endsWith('.json')) {
        onOpenTradFile(file);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onOpenTradFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handlePdfInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onOpenPdfFile?.(e.target.files[0]);
      e.target.value = '';
    }
  };

  const startRename = (id: string, currentTitle: string) => {
    setEditingProjectId(id);
    setEditingTitle(currentTitle);
  };

  const submitRename = (id: string) => {
    if (editingTitle.trim()) {
      onRenameProject(id, editingTitle.trim());
    }
    setEditingProjectId(null);
  };

  // Helper for human-readable time format
  const formatTimeAgo = (timestamp: number) => {
    const elapsed = Date.now() - timestamp;
    const minutes = Math.floor(elapsed / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`min-h-full flex-1 flex flex-col p-4 sm:p-8 max-w-7xl mx-auto w-full transition-colors relative ${
        isDark ? 'text-zinc-100' : 'text-zinc-900'
      }`}
    >
      {/* Hidden file input for .trad files */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".trad,application/json"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Hidden file input for .pdf files */}
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handlePdfInputChange}
      />

      {/* Drag Over Fullscreen Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-sky-950/80 backdrop-blur-xs flex flex-col items-center justify-center border-4 border-dashed border-sky-400 rounded-2xl m-4 pointer-events-none animate-in fade-in">
          <FileCode2 className="w-16 h-16 text-sky-300 animate-bounce mb-3" />
          <h3 className="text-xl font-bold text-white">Drop .trad or .pdf to Import</h3>
          <p className="text-sm text-sky-200 mt-1">Extracting traditional animation storyboard drawings and frames</p>
        </div>
      )}

      {/* Hero / Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[11px] font-mono tracking-wider ${isDark ? 'text-zinc-400' : 'text-stone-600'}`}>
              Created by <span className={`font-semibold ${isDark ? 'text-sky-400' : 'text-amber-800'}`}>LIIME</span> <span className="opacity-40">·</span> A LIMELIGHT Company
            </span>
          </div>
          <div className="flex items-center gap-4 mb-2">
            <DrawDeskLogo className="w-16 h-16 shrink-0" size={64} />
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-sans">
                  DrawDesk Projects
                </h1>
                <span
                  className={`px-2.5 py-0.5 text-xs font-mono font-semibold rounded-full border ${
                    isDark
                      ? 'bg-zinc-800 border-zinc-700 text-sky-400'
                      : 'bg-[#EDEAE3] border-zinc-300 text-zinc-800'
                  }`}
                >
                  {projects.length} {projects.length === 1 ? 'Project' : 'Projects'}
                </span>
              </div>
              <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Traditional Acme peg registered animation storyboards. Saved locally and compatible with <code className="font-mono font-bold">.trad</code> files.
              </p>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenAnimaticMode && (
            <button
              onClick={() => onOpenAnimaticMode()}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border shadow-2xs transition-colors ${
                isDark
                  ? 'bg-amber-950/40 hover:bg-amber-900/50 border-amber-800/60 text-amber-300'
                  : 'bg-[#FFFDF7] hover:bg-amber-50 border-amber-300 text-amber-900'
              }`}
              title="Launch Animatic Mode (Leica Reel timing, playback & video export)"
            >
              <Film className="w-4 h-4 text-amber-500" />
              <span>Animatic Mode</span>
            </button>
          )}

          {onOpenIllustrationMode && (
            <button
              onClick={onOpenIllustrationMode}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border shadow-2xs transition-colors ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-sky-300'
                  : 'bg-[#FDFBF7] hover:bg-zinc-100 border-zinc-300 text-sky-850'
              }`}
              title="Launch rough illustration studio (sketch tools & PNG export)"
            >
              <Palette className="w-4 h-4 text-sky-500" />
              <span>Illustration Mode</span>
            </button>
          )}

          {onOpenLiimeSuite && (
            <button
              onClick={onOpenLiimeSuite}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border shadow-2xs transition-colors ${
                isDark
                  ? 'bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-800/60 text-emerald-300'
                  : 'bg-[#F4FDF6] hover:bg-emerald-50 border-emerald-300 text-emerald-850'
              }`}
              title="Visit LIIME Suite Creative Portal (https://liimesuite.pages.dev/)"
            >
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>LIIME Suite</span>
            </button>
          )}

          <button
            onClick={() => pdfInputRef.current?.click()}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border shadow-2xs transition-colors ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-sky-400'
                : 'bg-[#FDFBF7] hover:bg-zinc-100 border-zinc-300 text-amber-900'
            }`}
            title="Extract storyboard drawings from PDF and organize into frames"
          >
            <FileText className="w-4 h-4 text-sky-500" />
            <span>Import PDF</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border shadow-2xs transition-colors ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                : 'bg-[#FDFBF7] hover:bg-zinc-100 border-zinc-300 text-zinc-800'
            }`}
          >
            <FolderOpen className="w-4 h-4 text-amber-500" />
            <span>Open .trad File</span>
          </button>

          <button
            onClick={onCreateNewProject}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg shadow-sm transition-colors ${
              isDark
                ? 'bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold'
                : 'bg-zinc-900 hover:bg-zinc-800 text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Search and Quick Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search
            className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            }`}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search storyboards by title..."
            className={`w-full pl-9 pr-4 py-2 text-xs rounded-lg border outline-none transition-colors ${
              isDark
                ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
                : 'bg-[#FDFBF7] border-zinc-300 text-zinc-900 placeholder-zinc-500 focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Drop notice banner */}
        <div
          className={`hidden lg:flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg border border-dashed ${
            isDark
              ? 'bg-zinc-900/60 border-zinc-700/80 text-zinc-400'
              : 'bg-[#EDEAE3]/80 border-zinc-300 text-zinc-600'
          }`}
        >
          <FileCode2 className="w-3.5 h-3.5 text-sky-500" />
          <span>Drop .trad file here to open</span>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {/* "+ Create New Project" Card */}
        <button
          onClick={onCreateNewProject}
          className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed transition-all group min-h-[260px] text-center ${
            isDark
              ? 'border-zinc-800 hover:border-sky-500/70 bg-zinc-900/30 hover:bg-zinc-900/60'
              : 'border-zinc-300 hover:border-zinc-800 bg-[#EDEAE3]/50 hover:bg-[#EDEAE3]'
          }`}
        >
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110 shadow-2xs ${
              isDark
                ? 'bg-zinc-800 text-sky-400 group-hover:bg-sky-500 group-hover:text-zinc-950'
                : 'bg-white text-zinc-800 group-hover:bg-zinc-900 group-hover:text-white'
            }`}
          >
            <Plus className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold tracking-tight font-sans">Create New Project</h3>
          <p className={`text-xs mt-1 max-w-[180px] ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Start a fresh blank canvas or load classic 4-panel demo
          </p>
        </button>

        {/* Render Projects */}
        {filteredProjects.map((project) => {
          const isActive = project.id === activeProjectId;
          const isEditing = editingProjectId === project.id;
          const isConfirmingDelete = deleteConfirmId === project.id;

          return (
            <div
              key={project.id}
              className={`flex flex-col rounded-xl border overflow-hidden shadow-xs hover:shadow-md transition-all group ${
                isActive
                  ? isDark
                    ? 'border-sky-500 ring-1 ring-sky-500/50 bg-[#18181b]'
                    : 'border-zinc-900 ring-1 ring-zinc-900/50 bg-[#FDFBF7]'
                  : isDark
                  ? 'border-zinc-800 bg-[#18181b] hover:border-zinc-700'
                  : 'border-zinc-300 bg-[#FDFBF7] hover:border-zinc-400'
              }`}
            >
              {/* Project Preview Thumbnail Area with Acme Peg Aesthetic */}
              <div
                onClick={() => onOpenProject(project.id)}
                className={`relative aspect-16/10 cursor-pointer overflow-hidden border-b flex items-center justify-center transition-colors ${
                  isDark
                    ? 'bg-zinc-900/90 border-zinc-800'
                    : 'bg-[#FAF8F5] border-zinc-200'
                }`}
              >
                {/* Simulated top Acme peg holes */}
                <div className="absolute top-1.5 inset-x-0 flex items-center justify-center gap-8 pointer-events-none opacity-50 z-10">
                  <div className="w-3.5 h-1.5 bg-zinc-400 dark:bg-zinc-700 rounded-sm" />
                  <div className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-700 rounded-full" />
                  <div className="w-3.5 h-1.5 bg-zinc-400 dark:bg-zinc-700 rounded-sm" />
                </div>

                {/* Canvas Drawing Thumbnail */}
                {project.thumbnail ? (
                  <img
                    src={project.thumbnail}
                    alt={project.title}
                    className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-zinc-400">
                    <Sparkles className="w-6 h-6 mb-1 opacity-50" />
                    <span className="text-[11px] font-mono">Blank Canvas</span>
                  </div>
                )}

                {/* Active Project Ribbon */}
                {isActive && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-sky-500 text-zinc-950 rounded-sm shadow-xs z-20">
                    Active
                  </span>
                )}

                {/* Panel Count Badge */}
                <div
                  className={`absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium backdrop-blur-xs ${
                    isDark
                      ? 'bg-zinc-950/80 text-zinc-200 border border-zinc-800'
                      : 'bg-white/85 text-zinc-800 border border-zinc-300 shadow-2xs'
                  }`}
                >
                  <Layers className="w-3 h-3 text-sky-500" />
                  <span>
                    {project.frameCount} {project.frameCount === 1 ? 'panel' : 'panels'}
                  </span>
                </div>
              </div>

              {/* Project Card Info & Actions */}
              <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                {/* Title */}
                <div>
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        autoFocus
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitRename(project.id);
                          if (e.key === 'Escape') setEditingProjectId(null);
                        }}
                        className={`w-full px-2 py-1 text-xs font-semibold rounded border outline-none ${
                          isDark
                            ? 'bg-zinc-900 border-sky-500 text-white'
                            : 'bg-white border-zinc-800 text-zinc-900'
                        }`}
                      />
                      <button
                        onClick={() => submitRename(project.id)}
                        className="p-1 text-emerald-500 hover:text-emerald-400"
                        title="Save name"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingProjectId(null)}
                        className="p-1 text-zinc-400 hover:text-zinc-600"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        onClick={() => onOpenProject(project.id)}
                        className="text-sm font-bold tracking-tight font-sans line-clamp-1 cursor-pointer hover:underline decoration-sky-400"
                        title={project.title}
                      >
                        {project.title}
                      </h3>
                      <button
                        onClick={() => startRename(project.id, project.title)}
                        className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                          isDark
                            ? 'hover:bg-zinc-800 text-zinc-400'
                            : 'hover:bg-zinc-200 text-zinc-500'
                        }`}
                        title="Rename Project"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Modified timestamp */}
                  <div
                    className={`flex items-center gap-1 text-[11px] font-mono mt-1 ${
                      isDark ? 'text-zinc-400' : 'text-zinc-500'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    <span>{formatTimeAgo(project.updatedAt)}</span>
                  </div>
                </div>

                {/* Card Action Footer */}
                {isConfirmingDelete ? (
                  <div className="flex items-center justify-between gap-1 p-1.5 rounded-lg bg-red-950/40 border border-red-800 text-xs">
                    <span className="text-[11px] text-red-200 font-medium">Delete storyboard?</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          onDeleteProject(project.id);
                          setDeleteConfirmId(null);
                        }}
                        className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold rounded"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] rounded"
                      >
                        No
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    {/* Primary Open Button */}
                    <button
                      onClick={() => onOpenProject(project.id)}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                        isActive
                          ? isDark
                            ? 'bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                          : isDark
                          ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                          : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'
                      }`}
                    >
                      {isActive ? 'Continue Drawing' : 'Open Desk'}
                    </button>

                    {/* Secondary Actions Toolbar */}
                    <div className="flex items-center gap-1">
                      {/* Play Animatic */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAnimaticMode?.(project.id);
                        }}
                        title="Play Animatic for this storyboard"
                        className={`p-1.5 rounded-md transition-colors ${
                          isDark
                            ? 'text-amber-400 hover:text-amber-300 hover:bg-zinc-800'
                            : 'text-amber-700 hover:text-amber-900 hover:bg-zinc-200'
                        }`}
                      >
                        <Film className="w-3.5 h-3.5" />
                      </button>

                      {/* Save As .trad */}
                      <button
                        onClick={() => onSaveAsTrad(project.id)}
                        title="Download as .trad file"
                        className={`p-1.5 rounded-md transition-colors ${
                          isDark
                            ? 'text-zinc-400 hover:text-sky-400 hover:bg-zinc-800'
                            : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
                        }`}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* Duplicate */}
                      <button
                        onClick={() => onDuplicateProject(project.id)}
                        title="Duplicate project"
                        className={`p-1.5 rounded-md transition-colors ${
                          isDark
                            ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                            : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
                        }`}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      {projects.length > 1 && (
                        <button
                          onClick={() => setDeleteConfirmId(project.id)}
                          title="Delete project"
                          className={`p-1.5 rounded-md transition-colors ${
                            isDark
                              ? 'text-zinc-400 hover:text-red-400 hover:bg-zinc-800'
                              : 'text-zinc-500 hover:text-red-600 hover:bg-zinc-200'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty Search State */}
      {filteredProjects.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <FolderOpen className="w-12 h-12 text-zinc-400 mb-3 opacity-60" />
          <h3 className="text-base font-bold font-sans">No storyboards found</h3>
          <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            No project matches &ldquo;{searchQuery}&rdquo;. Try another search term.
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-4 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-500 text-zinc-950"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Footer / Attribution */}
      <footer className="mt-auto pt-14 pb-8 flex flex-col items-center justify-center text-center border-t border-zinc-200/60 dark:border-zinc-800/80">
        <p className={`text-xs font-medium tracking-wide ${isDark ? 'text-zinc-400' : 'text-stone-600'}`}>
          DrawDesk — Created by <span className={`font-semibold ${isDark ? 'text-zinc-100' : 'text-stone-900'}`}>LIIME</span>
        </p>
        <p className={`text-[11px] uppercase tracking-[0.2em] font-mono mt-1 ${isDark ? 'text-zinc-500' : 'text-stone-500'}`}>
          A LIMELIGHT Company
        </p>
      </footer>
    </div>
  );
};
