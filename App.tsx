import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Frame,
  ToolSettings,
  OnionSkinSettings,
  DeskSettings,
  PerspectiveConfig,
  StoryboardProject,
  ProjectSummary,
} from './types/storyboard';
import {
  initializeProjectStorage,
  getProjectsList,
  getProject,
  saveProject,
  createProject,
  duplicateProject,
  deleteProject,
  renameProject,
  exportProjectToTradFile,
  importProjectFromTradFile,
  setActiveProjectId,
  syncStorageWithIndexedDb,
  defaultPerspectiveConfig,
  defaultDeskSettings,
  defaultToolSettings,
  defaultOnionSettings,
} from './utils/projectStorage';
import { PegBar } from './components/PegBar';
import { FrameNavMenu } from './components/FrameNavMenu';
import { StoryboardSheet } from './components/StoryboardSheet';
import { PhysicalPageFlip } from './components/PhysicalPageFlip';
import { ToolDock } from './components/ToolDock';
import { StoryboardGrid } from './components/StoryboardGrid';
import { ExportModal } from './components/ExportModal';
import { DrawDeskLogo } from './components/DrawDeskLogo';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ProjectsHomepage } from './components/ProjectsHomepage';
import { NewProjectModal } from './components/NewProjectModal';
import { SaveAsModal } from './components/SaveAsModal';
import { FileMenu } from './components/FileMenu';
import { TimelapseModal } from './components/TimelapseModal';
import { LoadingScreen } from './components/LoadingScreen';
import { PdfImportModal } from './components/PdfImportModal';
import { IllustrationWorkspace } from './components/IllustrationWorkspace';
import { LiimeSuiteModal } from './components/LiimeSuiteModal';
import {
  timelapseRecorder,
  TimelapseState,
  TimelapseResult,
  TimelapseCaptureMode,
} from './utils/timelapseRecorder';
import { playPaperFlipSound } from './utils/audio';
import {
  Lightbulb,
  Download,
  RotateCcw,
  Sun,
  Moon,
  FolderOpen,
  Check,
  Edit2,
  FileCode2,
  Video,
  Pause,
  Play as PlayIcon,
  Square,
  Palette,
  Sparkles,
} from 'lucide-react';

export default function App() {
  // 1. Project Management & Storage Initialization
  const [{ activeProject: initialActiveProject, projects: initialProjects }] = useState(() =>
    initializeProjectStorage()
  );

  const [currentProject, setCurrentProject] = useState<StoryboardProject>(initialActiveProject);
  const [projectsList, setProjectsList] = useState<ProjectSummary[]>(initialProjects);

  // Active view: 'home' (Projects Dashboard) | 'desk' (Drawing Canvas) | 'grid' (Wall) | 'illustration' (Illustration Mode)
  const [activeView, setActiveView] = useState<'home' | 'desk' | 'grid' | 'illustration'>('home');

  // Frames & active index within current project
  const [frames, setFrames] = useState<Frame[]>(currentProject.frames);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(
    currentProject.currentFrameIndex || 0
  );

  // Modals state
  const [isLoading, setIsLoading] = useState(true);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isSaveAsOpen, setIsSaveAsOpen] = useState(false);
  const [isTimelapseModalOpen, setIsTimelapseModalOpen] = useState(false);
  const [isPdfImportOpen, setIsPdfImportOpen] = useState(false);
  const [isLiimeSuiteOpen, setIsLiimeSuiteOpen] = useState(true);
  const [pdfInitialFile, setPdfInitialFile] = useState<File | null>(null);
  const globalPdfFileInputRef = useRef<HTMLInputElement>(null);
  const [timelapseResult, setTimelapseResult] = useState<TimelapseResult | null>(null);
  const [timelapseState, setTimelapseState] = useState<TimelapseState>(() =>
    timelapseRecorder.getState()
  );

  useEffect(() => {
    return timelapseRecorder.subscribe(setTimelapseState);
  }, []);

  // Background IndexedDB Synchronization: Ensure no frames or projects are ever lost
  useEffect(() => {
    syncStorageWithIndexedDb().then((res) => {
      if (res.projects && res.projects.length > 0) {
        setProjectsList(res.projects);
      }
      if (res.activeProject && res.activeProject.id === currentProject.id) {
        if (res.activeProject.frames.length > frames.length) {
          setFrames(res.activeProject.frames);
          setCurrentProject(res.activeProject);
        }
      }
    });
  }, []);

  // Toast notification for user actions (Save, Import, etc.)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }, []);

  // Send rough illustration from Illustration Mode into the storyboard timeline
  const handleSendIllustrationToStoryboard = useCallback(
    (dataUrl: string) => {
      const newFrameId = `frame_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newFrame: Frame = {
        id: newFrameId,
        sceneNumber: currentProject.frames[currentFrameIndex]?.sceneNumber || '1',
        panelNumber: String(frames.length + 1),
        shotNumber: '1',
        durationSec: 1.5,
        actionNotes: 'Rough Illustration',
        dialogueNotes: '',
        canvasData: dataUrl,
        timestamp: Date.now(),
      };

      const updatedFrames = [...frames, newFrame];
      setFrames(updatedFrames);
      const newIndex = updatedFrames.length - 1;
      setCurrentFrameIndex(newIndex);

      const updatedProject: StoryboardProject = {
        ...currentProject,
        frames: updatedFrames,
        currentFrameIndex: newIndex,
        updatedAt: Date.now(),
      };
      setCurrentProject(updatedProject);
      saveProject(updatedProject);
      setProjectsList(getProjectsList());

      setActiveView('desk');
      showToast('Illustration added to Storyboard desk as a new frame');
    },
    [currentProject, currentFrameIndex, frames, showToast]
  );

  // Save status badge: 'saved' | 'saving' | 'unsaved'
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved'>('saved');

  // Hidden file input for .trad file picker
  const globalTradFileInputRef = useRef<HTMLInputElement>(null);

  // Drawing tool settings
  const [toolSettings, setToolSettings] = useState<ToolSettings>(
    currentProject.toolSettings || defaultToolSettings
  );

  // Onion skin & light table settings
  const [onionSettings, setOnionSettings] = useState<OnionSkinSettings>(
    currentProject.onionSettings || defaultOnionSettings
  );

  // Desk settings
  const [deskSettings, setDeskSettings] = useState<DeskSettings>(
    currentProject.deskSettings || defaultDeskSettings
  );

  // Perspective Grid configuration
  const [perspectiveConfig, setPerspectiveConfig] = useState<PerspectiveConfig>(
    currentProject.perspectiveConfig || defaultPerspectiveConfig
  );

  // Theme: Dark vs soft light mode
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('storyboard_theme_mode');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // ignore
    }
    return 'light';
  });

  useEffect(() => {
    try {
      localStorage.setItem('storyboard_theme_mode', theme);
    } catch {
      // ignore
    }
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // Prevents auto-save race condition when switching projects
  const isSwitchingProjectRef = useRef(false);

  // Sync frames when currentProject changes
  const switchProject = useCallback((project: StoryboardProject) => {
    isSwitchingProjectRef.current = true;
    setCurrentProject(project);
    setFrames(project.frames);
    setCurrentFrameIndex(
      project.currentFrameIndex !== undefined && project.currentFrameIndex < project.frames.length
        ? project.currentFrameIndex
        : 0
    );
    if (project.perspectiveConfig) setPerspectiveConfig(project.perspectiveConfig);
    if (project.deskSettings) setDeskSettings(project.deskSettings);
    if (project.onionSettings) setOnionSettings(project.onionSettings);
    if (project.toolSettings) setToolSettings(project.toolSettings);
    setActiveProjectId(project.id);
    setSaveStatus('saved');
    setActiveView('desk');

    setTimeout(() => {
      isSwitchingProjectRef.current = false;
    }, 400);
  }, []);

  // Helper to commit any active canvas transform and retrieve current drawing
  const getCommittedFrames = useCallback(() => {
    const win = window as unknown as {
      __storyboard_flush_canvas?: () => string;
    };
    const flushedDataUrl = win.__storyboard_flush_canvas?.();
    if (flushedDataUrl && frames[currentFrameIndex]) {
      const copy = [...frames];
      copy[currentFrameIndex] = {
        ...copy[currentFrameIndex],
        canvasData: flushedDataUrl,
        timestamp: Date.now(),
      };
      return copy;
    }
    return frames;
  }, [frames, currentFrameIndex]);

  // Save current project state
  const handleSave = useCallback(() => {
    const activeFrames = getCommittedFrames();
    const updated: StoryboardProject = {
      ...currentProject,
      frames: activeFrames,
      currentFrameIndex,
      perspectiveConfig,
      deskSettings,
      onionSettings,
      toolSettings,
      theme,
      updatedAt: Date.now(),
    };
    saveProject(updated);
    setFrames(activeFrames);
    setCurrentProject(updated);
    setProjectsList(getProjectsList());
    setSaveStatus('saved');
    showToast(`Saved "${updated.title}"`);
  }, [
    currentProject,
    getCommittedFrames,
    currentFrameIndex,
    perspectiveConfig,
    deskSettings,
    onionSettings,
    toolSettings,
    theme,
    showToast,
  ]);

  // Debounced auto-save so user never loses work
  useEffect(() => {
    if (isSwitchingProjectRef.current) return;

    const timer = setTimeout(() => {
      if (isSwitchingProjectRef.current) return;
      const updated: StoryboardProject = {
        ...currentProject,
        frames,
        currentFrameIndex,
        perspectiveConfig,
        deskSettings,
        onionSettings,
        toolSettings,
        theme,
      };
      saveProject(updated);
      setProjectsList(getProjectsList());
      setSaveStatus('saved');
    }, 1200);

    return () => clearTimeout(timer);
  }, [
    frames,
    currentFrameIndex,
    perspectiveConfig,
    deskSettings,
    onionSettings,
    toolSettings,
    theme,
    currentProject,
  ]);

  // Perspective update handler
  const handleUpdatePerspectiveConfig = useCallback(
    (newConfig: Partial<PerspectiveConfig>) => {
      setPerspectiveConfig((prev) => ({ ...prev, ...newConfig }));
      setSaveStatus('unsaved');
    },
    []
  );

  // Physical page flip animation state
  const [flipDirection, setFlipDirection] = useState<'forward' | 'backward' | null>(null);
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const targetFrameIndexRef = useRef<number | null>(null);

  // Playback / Roll loop
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const playIntervalRef = useRef<number | null>(null);

  // Undo / Redo triggers
  const [undoTrigger, setUndoTrigger] = useState<number>(0);
  const [redoTrigger, setRedoTrigger] = useState<number>(0);
  const [clearTrigger, setClearTrigger] = useState<number>(0);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  // Update active frame canvas data
  const handleUpdateCanvas = useCallback((dataUrl: string) => {
    setFrames((prev) => {
      const copy = [...prev];
      copy[currentFrameIndex] = {
        ...copy[currentFrameIndex],
        canvasData: dataUrl,
        timestamp: Date.now(),
      };
      return copy;
    });
    setSaveStatus('unsaved');
  }, [currentFrameIndex]);

  // Update active frame metadata (Scene, panel, action notes, dialogue)
  const handleUpdateFrameNotes = useCallback((updates: Partial<Frame>) => {
    setFrames((prev) => {
      const copy = [...prev];
      copy[currentFrameIndex] = {
        ...copy[currentFrameIndex],
        ...updates,
      };
      return copy;
    });
    setSaveStatus('unsaved');
  }, [currentFrameIndex]);

  // Page Flip Forward
  const handleFlipForward = useCallback(() => {
    if (isFlipping) return;
    if (currentFrameIndex < frames.length - 1) {
      targetFrameIndexRef.current = currentFrameIndex + 1;
      setFlipDirection('forward');
      setIsFlipping(true);
    }
  }, [currentFrameIndex, frames.length, isFlipping]);

  // Page Flip Backward
  const handleFlipBackward = useCallback(() => {
    if (isFlipping) return;
    if (currentFrameIndex > 0) {
      setCurrentFrameIndex((prev) => prev - 1);
      setFlipDirection('backward');
      setIsFlipping(true);
    }
  }, [currentFrameIndex, isFlipping]);

  // Flip animation completion
  const handleFlipComplete = useCallback(() => {
    if (flipDirection === 'forward' && targetFrameIndexRef.current !== null) {
      setCurrentFrameIndex(targetFrameIndexRef.current);
      targetFrameIndexRef.current = null;
    }
    setIsFlipping(false);
    setFlipDirection(null);
  }, [flipDirection]);

  // Direct select frame
  const handleSelectFrame = useCallback((index: number) => {
    if (index === currentFrameIndex) return;
    const direction = index > currentFrameIndex ? 'forward' : 'backward';
    if (deskSettings.soundEnabled) {
      playPaperFlipSound(direction);
    }
    setCurrentFrameIndex(index);
  }, [currentFrameIndex, deskSettings.soundEnabled]);

  // Add blank frame
  const handleAddFrame = useCallback(() => {
    const cur = frames[currentFrameIndex] || frames[0];
    const nextPanelNum = String(frames.length + 1).padStart(2, '0');
    const newFrame: Frame = {
      id: `frame-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sceneNumber: cur.sceneNumber || '01',
      panelNumber: nextPanelNum,
      shotNumber: cur.shotNumber || '01',
      actionNotes: '',
      dialogueNotes: '',
      durationSec: 1.0,
      canvasData: '',
      timestamp: Date.now(),
    };

    const newFrames = [...frames];
    newFrames.splice(currentFrameIndex + 1, 0, newFrame);
    setFrames(newFrames);
    setCurrentFrameIndex(currentFrameIndex + 1);
    setSaveStatus('unsaved');

    if (deskSettings.soundEnabled) {
      playPaperFlipSound('forward');
    }
  }, [currentFrameIndex, deskSettings.soundEnabled, frames]);

  // Duplicate current frame
  const handleDuplicateFrame = useCallback((indexToDup = currentFrameIndex) => {
    const target = frames[indexToDup];
    if (!target) return;
    const newPanelNum = String(frames.length + 1).padStart(2, '0');
    const newFrame: Frame = {
      ...target,
      id: `frame-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      panelNumber: newPanelNum,
      timestamp: Date.now(),
    };

    const newFrames = [...frames];
    newFrames.splice(indexToDup + 1, 0, newFrame);
    setFrames(newFrames);
    setCurrentFrameIndex(indexToDup + 1);
    setSaveStatus('unsaved');

    if (deskSettings.soundEnabled) {
      playPaperFlipSound('forward');
    }
  }, [currentFrameIndex, deskSettings.soundEnabled, frames]);

  // Delete frame
  const handleDeleteFrame = useCallback((indexToDelete: number) => {
    if (frames.length <= 1) return;
    const newFrames = frames.filter((_, idx) => idx !== indexToDelete);
    setFrames(newFrames);
    setCurrentFrameIndex((prev) => {
      if (indexToDelete < prev) return Math.max(0, prev - 1);
      return Math.min(prev, newFrames.length - 1);
    });
    setSaveStatus('unsaved');
  }, [frames]);

  // Move frame along the peg bar rack
  const handleMoveFrame = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= frames.length || fromIndex === toIndex) return;
    setFrames((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
    setCurrentFrameIndex((prev) => {
      if (prev === fromIndex) return toIndex;
      if (fromIndex < prev && toIndex >= prev) return prev - 1;
      if (fromIndex > prev && toIndex <= prev) return prev + 1;
      return prev;
    });
    setSaveStatus('unsaved');
  }, [frames.length]);

  // Clear current frame canvas
  const handleClearCanvas = useCallback(() => {
    setClearTrigger((v) => v + 1);
  }, []);

  // Playback Roll loop
  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.round(1000 / deskSettings.playbackFps);
      playIntervalRef.current = window.setInterval(() => {
        setCurrentFrameIndex((prev) => (prev + 1) % frames.length);
        if (deskSettings.soundEnabled) {
          playPaperFlipSound('forward', 1.2);
        }
      }, intervalMs);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, deskSettings.playbackFps, deskSettings.soundEnabled, frames.length]);

  // Timelapse Recording Handlers
  const handleStartTimelapse = useCallback(
    async (mode: TimelapseCaptureMode, speedMultiplier: number) => {
      try {
        if (mode === 'screen') {
          const started = await timelapseRecorder.startScreenRecording(
            speedMultiplier,
            (res) => {
              setTimelapseResult(res);
              setIsTimelapseModalOpen(true);
              showToast('Timelapse recording complete!');
            }
          );
          if (started) {
            showToast('Screen timelapse recording started');
            return;
          }
          // If screen capture was cancelled or restricted by iframe, gracefully record studio timelapse
          showToast('Live screen share not permitted in this frame. Started Studio Timelapse!');
        }

        timelapseRecorder.startSnapshotRecording(
          speedMultiplier,
          800,
          (res) => {
            setTimelapseResult(res);
            setIsTimelapseModalOpen(true);
            showToast('Studio timelapse recording complete!');
          }
        );
        showToast('Studio Interface Timelapse recording started');
      } catch (err: unknown) {
        console.warn('Timelapse start fallback:', err);
        timelapseRecorder.startSnapshotRecording(
          speedMultiplier,
          800,
          (res) => {
            setTimelapseResult(res);
            setIsTimelapseModalOpen(true);
            showToast('Studio timelapse recording complete!');
          }
        );
        showToast('Started Studio Interface Timelapse');
      }
    },
    [showToast]
  );

  const handleStopTimelapse = useCallback(() => {
    // Flush any pending artwork before stopping
    const win = window as unknown as { __storyboard_flush_canvas?: () => string };
    win.__storyboard_flush_canvas?.();
    timelapseRecorder.stopRecording();
  }, []);

  const handleTogglePauseTimelapse = useCallback(() => {
    if (timelapseState.isPaused) {
      timelapseRecorder.resume();
    } else {
      timelapseRecorder.pause();
    }
  }, [timelapseState.isPaused]);

  // Synchronized snapshot ref to eliminate infinite re-render loops and stroke storms
  const snapshotDataRef = useRef<() => void>(() => {});
  snapshotDataRef.current = () => {
    if (
      !timelapseState.isRecording ||
      timelapseState.mode !== 'studio-snapshots' ||
      timelapseState.isPaused
    ) {
      return;
    }

    const cur = frames[currentFrameIndex] || frames[0];
    const canvas = (window as unknown as { __storyboard_drawing_canvas?: HTMLCanvasElement | null })
      .__storyboard_drawing_canvas || null;

    timelapseRecorder.captureStudioSnapshot({
      drawingCanvas: canvas,
      projectTitle: currentProject.title,
      sceneNumber: cur?.sceneNumber || '01',
      panelNumber: cur?.panelNumber || '01',
      shotNumber: cur?.shotNumber || '01',
      timingSec: cur?.durationSec || 1.0,
      actionNotes: cur?.actionNotes,
      dialogueNotes: cur?.dialogueNotes,
      toolName: toolSettings.tool,
      toolColor: toolSettings.tool === 'pen' ? toolSettings.penColor : '#4b5563',
      toolSize: toolSettings.size,
      onionSkinEnabled: onionSettings.enabled,
      fps: deskSettings.playbackFps,
      theme,
      frameIndex: currentFrameIndex,
      totalFrames: frames.length,
    });
  };

  useEffect(() => {
    if (
      !timelapseState.isRecording ||
      timelapseState.mode !== 'studio-snapshots' ||
      timelapseState.isPaused
    ) {
      return;
    }

    // Initial snapshot after short mount delay
    const initTimer = setTimeout(() => {
      snapshotDataRef.current();
    }, 150);

    // Snapshot on drawing stroke completion with debounce/throttle to prevent stroke storms
    let lastStrokeTime = 0;
    const onStrokeEnd = () => {
      const now = Date.now();
      if (now - lastStrokeTime > 500) {
        lastStrokeTime = now;
        snapshotDataRef.current();
      }
    };
    window.addEventListener('storyboard:canvas-stroke-end', onStrokeEnd);

    // Regular interval snapshot every 1000ms
    const timer = setInterval(() => {
      snapshotDataRef.current();
    }, 1000);

    return () => {
      clearTimeout(initTimer);
      window.removeEventListener('storyboard:canvas-stroke-end', onStrokeEnd);
      clearInterval(timer);
    };
  }, [timelapseState.isRecording, timelapseState.mode, timelapseState.isPaused]);

  // Project Management Actions:
  // Create New Project
  const handleCreateNewProject = useCallback((title: string, template: 'demo' | 'blank') => {
    const newProj = createProject(title, template);
    setProjectsList(getProjectsList());
    switchProject(newProj);
    showToast(`Created project "${newProj.title}"`);
  }, [switchProject, showToast]);

  // Open existing project from list
  const handleOpenExistingProject = useCallback((id: string) => {
    const proj = getProject(id);
    if (proj) {
      switchProject(proj);
      showToast(`Opened "${proj.title}"`);
    }
  }, [switchProject, showToast]);

  // Import / Open .trad file
  const handleOpenTradFile = useCallback(async (file: File) => {
    try {
      const imported = await importProjectFromTradFile(file);
      setProjectsList(getProjectsList());
      switchProject(imported);
      showToast(`Loaded .trad project "${imported.title}"`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showToast(`Could not load .trad file: ${message}`);
    }
  }, [switchProject, showToast]);

  // Open & Import PDF Storyboard drawings
  const handleOpenPdfFile = useCallback((file: File) => {
    setPdfInitialFile(file);
    setIsPdfImportOpen(true);
  }, []);

  const handleImportPdfFrames = useCallback(
    (
      importedFrames: Frame[],
      options: { target: 'new' | 'append'; projectTitle: string }
    ) => {
      if (importedFrames.length === 0) return;

      if (options.target === 'new') {
        const newProjId = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const newProject: StoryboardProject = {
          format: 'traditional-storyboard',
          version: 1,
          id: newProjId,
          title: options.projectTitle || 'Imported PDF Storyboard',
          frames: importedFrames,
          currentFrameIndex: 0,
          perspectiveConfig: defaultPerspectiveConfig,
          deskSettings: defaultDeskSettings,
          toolSettings: defaultToolSettings,
          onionSettings: defaultOnionSettings,
          theme,
          thumbnail: importedFrames[0]?.canvasData || '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        saveProject(newProject);
        setProjectsList(getProjectsList());
        switchProject(newProject);
        showToast(`Created project with ${importedFrames.length} drawings from PDF!`);
      } else {
        setFrames((prev) => {
          const nextFrames = [...prev, ...importedFrames];
          const updated: StoryboardProject = {
            ...currentProject,
            frames: nextFrames,
            updatedAt: Date.now(),
          };
          saveProject(updated);
          setProjectsList(getProjectsList());
          return nextFrames;
        });
        setCurrentFrameIndex(frames.length);
        setActiveView('desk');
        showToast(`Appended ${importedFrames.length} drawings to "${currentProject.title}"`);
      }
    },
    [currentProject, frames.length, switchProject, theme, showToast]
  );

  // Save As Copy
  const handleSaveAsCopy = useCallback((newTitle: string) => {
    // First ensure current project state is fresh and active artwork is committed
    const activeFrames = getCommittedFrames();
    const updatedCurrent: StoryboardProject = {
      ...currentProject,
      frames: activeFrames,
      currentFrameIndex,
      perspectiveConfig,
      deskSettings,
      onionSettings,
      toolSettings,
      theme,
      updatedAt: Date.now(),
    };
    saveProject(updatedCurrent);
    setFrames(activeFrames);

    const dup = duplicateProject(currentProject.id, newTitle);
    if (dup) {
      setProjectsList(getProjectsList());
      switchProject(dup);
      showToast(`Saved copy as "${dup.title}"`);
    }
  }, [
    currentProject,
    getCommittedFrames,
    currentFrameIndex,
    perspectiveConfig,
    deskSettings,
    onionSettings,
    toolSettings,
    theme,
    switchProject,
    showToast,
  ]);

  // Export .trad file download
  const handleExportTrad = useCallback((customFilename?: string) => {
    const activeFrames = getCommittedFrames();
    const projectToExport: StoryboardProject = {
      ...currentProject,
      title: customFilename
        ? customFilename.replace(/\.trad$/i, '')
        : currentProject.title,
      frames: activeFrames,
      currentFrameIndex,
      perspectiveConfig,
      deskSettings,
      onionSettings,
      toolSettings,
      theme,
      updatedAt: Date.now(),
    };
    saveProject(projectToExport);
    setFrames(activeFrames);
    exportProjectToTradFile(projectToExport);
    showToast(`Exported ${customFilename || `${projectToExport.title}.trad`}`);
  }, [
    currentProject,
    getCommittedFrames,
    currentFrameIndex,
    perspectiveConfig,
    deskSettings,
    onionSettings,
    toolSettings,
    theme,
    showToast,
  ]);

  // Delete project
  const handleDeleteProject = useCallback((id: string) => {
    deleteProject(id);
    const updatedList = getProjectsList();
    setProjectsList(updatedList);

    // If active project was deleted, switch to another
    if (id === currentProject.id) {
      if (updatedList.length > 0) {
        const next = getProject(updatedList[0].id);
        if (next) switchProject(next);
      } else {
        const fallback = createProject('Scene 01 - Storyboard', 'blank');
        setProjectsList(getProjectsList());
        switchProject(fallback);
      }
    }
    showToast('Project deleted');
  }, [currentProject.id, switchProject, showToast]);

  // Duplicate project from Homepage
  const handleDuplicateProjectFromList = useCallback((id: string) => {
    const dup = duplicateProject(id);
    if (dup) {
      setProjectsList(getProjectsList());
      showToast(`Duplicated "${dup.title}"`);
    }
  }, [showToast]);

  // Rename project
  const handleRenameProject = useCallback((id: string, newTitle: string) => {
    renameProject(id, newTitle);
    setProjectsList(getProjectsList());
    if (id === currentProject.id) {
      setCurrentProject((prev) => ({ ...prev, title: newTitle }));
    }
    showToast(`Renamed to "${newTitle}"`);
  }, [currentProject.id, showToast]);

  // Global Keyboard Shortcuts (Natural animator workflow + File shortcuts)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in textarea or input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      // File Operations Shortcuts
      if (cmdKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
        return;
      }
      if (cmdKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        globalTradFileInputRef.current?.click();
        return;
      }
      if (cmdKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsNewProjectOpen(true);
        return;
      }

      // Re-order frame shortcut (Alt + Left / Alt + Right)
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleMoveFrame(currentFrameIndex, currentFrameIndex - 1);
        return;
      }
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleMoveFrame(currentFrameIndex, currentFrameIndex + 1);
        return;
      }

      // Drawing Desk shortcuts
      if (e.key === 'Home') {
        e.preventDefault();
        handleSelectFrame(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        handleSelectFrame(frames.length - 1);
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleFlipForward();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleFlipBackward();
      } else if (e.key.toLowerCase() === 'p') {
        setToolSettings((prev) => ({ ...prev, tool: 'pencil' }));
      } else if (e.key.toLowerCase() === 'i') {
        setToolSettings((prev) => ({ ...prev, tool: 'pen' }));
      } else if (e.key.toLowerCase() === 'e') {
        setToolSettings((prev) => ({ ...prev, tool: 'eraser' }));
      } else if (e.key.toLowerCase() === 'l') {
        setToolSettings((prev) => ({ ...prev, tool: 'lasso' }));
      } else if (e.key.toLowerCase() === 'o') {
        setOnionSettings((prev) => ({
          ...prev,
          enabled: !prev.enabled,
          lightTableBulb: !prev.enabled,
        }));
      } else if (e.key.toLowerCase() === 'g') {
        setDeskSettings((prev) => ({ ...prev, showFieldGrid: !prev.showFieldGrid }));
      } else if (cmdKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          setRedoTrigger((v) => v + 1);
        } else {
          setUndoTrigger((v) => v + 1);
        }
      } else if (cmdKey && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        setRedoTrigger((v) => v + 1);
      } else if (cmdKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateFrame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleSave,
    handleFlipForward,
    handleFlipBackward,
    handleDuplicateFrame,
  ]);

  // Window drag-and-drop listener for .trad files
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        const lower = file.name.toLowerCase();
        if (lower.endsWith('.pdf')) {
          handleOpenPdfFile(file);
        } else if (lower.endsWith('.trad') || lower.endsWith('.json')) {
          handleOpenTradFile(file);
        }
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [handleOpenTradFile, handleOpenPdfFile]);

  const currentFrame = frames[currentFrameIndex] || frames[0];
  const nextFrame = currentFrameIndex < frames.length - 1 ? frames[currentFrameIndex + 1] : null;
  const prevFrame = currentFrameIndex > 0 ? frames[currentFrameIndex - 1] : null;

  return (
    <div
      className={`flex flex-col h-screen w-screen font-sans overflow-hidden transition-colors ${
        theme === 'dark' ? 'bg-[#121214] text-zinc-100' : 'bg-[#E5E3DD] text-zinc-900'
      }`}
    >
      {/* Hidden file input for opening .trad files via File Menu / Hotkey */}
      <input
        ref={globalTradFileInputRef}
        type="file"
        accept=".trad,application/json"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleOpenTradFile(e.target.files[0]);
            e.target.value = '';
          }
        }}
      />

      {/* Hidden file input for opening .pdf storyboard files via File Menu / Hotkey */}
      <input
        ref={globalPdfFileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleOpenPdfFile(e.target.files[0]);
            e.target.value = '';
          }
        }}
      />

      {/* Universal Top Bar */}
      <header
        className={`flex items-center justify-between px-4 sm:px-6 py-2.5 border-b shadow-2xs shrink-0 z-40 transition-colors ${
          theme === 'dark'
            ? 'bg-[#18181b] border-zinc-800 text-zinc-200'
            : 'bg-[#EDEAE3] border-zinc-300 text-zinc-900'
        }`}
      >
        {/* Left Zone: Brand + File Menu + Project Title */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Logo / Brand clickable to go to Homepage */}
          <button
            onClick={() => setActiveView('home')}
            className="flex items-center gap-2 group text-left"
            title="Go to Projects Homepage"
          >
            <DrawDeskLogo className="w-5 h-5 drop-shadow-2xs transition-transform group-hover:scale-105" />
            <h1
              className={`text-sm sm:text-base font-bold tracking-tight font-sans transition-colors ${
                theme === 'dark'
                  ? 'text-zinc-100 group-hover:text-sky-400'
                  : 'text-zinc-900 group-hover:text-zinc-950'
              }`}
            >
              DrawDesk
            </h1>
          </button>

          {/* Dedicated File Menu */}
          <FileMenu
            onNew={() => setIsNewProjectOpen(true)}
            onOpenProjects={() => setActiveView('home')}
            onOpenTradFile={() => globalTradFileInputRef.current?.click()}
            onOpenPdfImport={() => {
              setPdfInitialFile(null);
              setIsPdfImportOpen(true);
            }}
            onSave={handleSave}
            onSaveAs={() => setIsSaveAsOpen(true)}
            onExportTrad={() => handleExportTrad()}
            onExportImages={() => setIsExportOpen(true)}
            onOpenTimelapse={() => {
              setTimelapseResult(null);
              setIsTimelapseModalOpen(true);
            }}
            onOpenLiimeSuite={() => setIsLiimeSuiteOpen(true)}
            theme={theme}
          />

          {/* Active Project Title & Quick Status Indicator */}
          <div className="hidden md:flex items-center gap-2 pl-2 border-l border-zinc-300 dark:border-zinc-700">
            <span
              className={`text-xs font-semibold max-w-[200px] truncate ${
                theme === 'dark' ? 'text-zinc-300' : 'text-zinc-800'
              }`}
              title={currentProject.title}
            >
              {currentProject.title}
            </span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors ${
                saveStatus === 'saved'
                  ? theme === 'dark'
                    ? 'text-emerald-400 bg-emerald-950/60'
                    : 'text-emerald-700 bg-emerald-100'
                  : theme === 'dark'
                  ? 'text-amber-400 bg-amber-950/60'
                  : 'text-amber-700 bg-amber-100'
              }`}
            >
              {saveStatus === 'saved' ? 'Saved' : 'Unsaved'}
            </span>
          </div>
        </div>

        {/* Center Zone: Clean Navigation Tabs */}
        <nav
          className={`flex items-center gap-5 sm:gap-6 text-xs font-medium ${
            theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'
          }`}
        >
          {/* Projects Homepage */}
          <button
            onClick={() => setActiveView('home')}
            className={`flex items-center gap-1.5 transition-colors ${
              activeView === 'home'
                ? theme === 'dark'
                  ? 'text-white font-bold underline underline-offset-4 decoration-sky-400'
                  : 'text-zinc-950 font-bold underline underline-offset-4 decoration-zinc-900'
                : theme === 'dark'
                ? 'hover:text-zinc-200'
                : 'hover:text-zinc-900'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Projects</span>
          </button>

          {/* Drawing Desk */}
          <button
            onClick={() => setActiveView('desk')}
            className={`transition-colors ${
              activeView === 'desk'
                ? theme === 'dark'
                  ? 'text-white font-bold underline underline-offset-4 decoration-sky-400'
                  : 'text-zinc-950 font-bold underline underline-offset-4 decoration-zinc-900'
                : theme === 'dark'
                ? 'hover:text-zinc-200'
                : 'hover:text-zinc-900'
            }`}
          >
            Drawing Desk
          </button>

          {/* Illustration Mode */}
          <button
            onClick={() => setActiveView('illustration')}
            className={`flex items-center gap-1.5 transition-colors ${
              activeView === 'illustration'
                ? theme === 'dark'
                  ? 'text-white font-bold underline underline-offset-4 decoration-sky-400'
                  : 'text-zinc-950 font-bold underline underline-offset-4 decoration-zinc-900'
                : theme === 'dark'
                ? 'hover:text-zinc-200'
                : 'hover:text-zinc-900'
            }`}
            title="Rough illustration window with separate drawing utensils & PNG export"
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Illustration Mode</span>
          </button>

          {/* Storyboard Wall */}
          <button
            onClick={() => setActiveView('grid')}
            className={`transition-colors ${
              activeView === 'grid'
                ? theme === 'dark'
                  ? 'text-white font-bold underline underline-offset-4 decoration-sky-400'
                  : 'text-zinc-950 font-bold underline underline-offset-4 decoration-zinc-900'
                : theme === 'dark'
                ? 'hover:text-zinc-200'
                : 'hover:text-zinc-900'
            }`}
          >
            Storyboard Wall ({frames.length})
          </button>

          {/* Playback Roll */}
          <button
            onClick={handleTogglePlay}
            className={`transition-colors hidden lg:inline ${
              theme === 'dark' ? 'hover:text-zinc-200' : 'hover:text-zinc-900'
            }`}
          >
            {isPlaying ? 'Pause Roll' : 'Roll Flipbook'}
          </button>
        </nav>

        {/* Right Zone: Light Table, Quick Save, Theme, PWA, Export */}
        <div className="flex items-center gap-2">
          {/* Quick Save Button */}
          <button
            onClick={handleSave}
            title="Save Project (Ctrl+S)"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
              theme === 'dark'
                ? 'bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border-zinc-700 shadow-2xs'
                : 'bg-[#FDFBF7] hover:bg-zinc-100 text-emerald-700 border-zinc-300 shadow-2xs'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save</span>
          </button>

          {/* Light Table Backlight Quick Switch */}
          <button
            onClick={() =>
              setOnionSettings((prev) => ({
                ...prev,
                enabled: !prev.enabled,
                lightTableBulb: !prev.enabled,
              }))
            }
            title="Toggle Light Table Backlight & Onion Skinning"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              onionSettings.enabled
                ? theme === 'dark'
                  ? 'bg-sky-950 text-sky-200 border-sky-800 shadow-2xs'
                  : 'bg-zinc-900 text-white border-zinc-900 shadow-2xs'
                : theme === 'dark'
                ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                : 'bg-[#FDFBF7] text-zinc-700 border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            <Lightbulb
              className={`w-3.5 h-3.5 ${
                onionSettings.enabled
                  ? theme === 'dark'
                    ? 'text-sky-300 fill-sky-300'
                    : 'text-white fill-white'
                  : 'text-zinc-500'
              }`}
            />
            <span className="hidden sm:inline">Light Table</span>
          </button>

          {/* Dark / Light Mode Switch in Header */}
          <button
            onClick={toggleTheme}
            title={
              theme === 'dark'
                ? 'Switch to Eye-Friendly Soft Light Theme'
                : 'Switch to Dark Mode'
            }
            className={`p-1.5 rounded-md border transition-colors ${
              theme === 'dark'
                ? 'bg-zinc-800 hover:bg-zinc-700 text-amber-300 border-zinc-700 shadow-2xs'
                : 'bg-[#FDFBF7] hover:bg-zinc-100 text-zinc-700 border-zinc-300 shadow-2xs'
            }`}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* Timelapse Recording (Shows UI) CTA / Live REC indicator */}
          {timelapseState.isRecording ? (
            <div className="flex items-center gap-1.5 bg-rose-500/15 border border-rose-500/30 px-2.5 py-1 rounded-md text-xs">
              <button
                onClick={() => setIsTimelapseModalOpen(true)}
                className="flex items-center gap-1.5 text-rose-500 font-mono font-bold hover:underline"
                title="Timelapse Recording in progress (Click to view)"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span>REC</span>
                <span className="tabular-nums font-mono text-[11px]">
                  {Math.floor(timelapseState.elapsedMs / 60000)}:
                  {String(Math.floor((timelapseState.elapsedMs % 60000) / 1000)).padStart(2, '0')}
                </span>
              </button>
              <button
                onClick={handleTogglePauseTimelapse}
                title={timelapseState.isPaused ? 'Resume Recording' : 'Pause Recording'}
                className="p-1 rounded hover:bg-rose-500/20 text-rose-500 transition-colors"
              >
                {timelapseState.isPaused ? (
                  <PlayIcon className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Pause className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={handleStopTimelapse}
                title="Stop Recording & Review Video"
                className="p-1 rounded hover:bg-rose-500/20 text-rose-600 font-bold transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setTimelapseResult(null);
                setIsTimelapseModalOpen(true);
              }}
              title="Record Process Timelapse (Shows UI Interface & Process)"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                theme === 'dark'
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-rose-400 border-zinc-700 shadow-2xs'
                  : 'bg-[#FDFBF7] hover:bg-zinc-100 text-rose-600 border-zinc-300 shadow-2xs'
              }`}
            >
              <Video className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden sm:inline">Timelapse</span>
            </button>
          )}

          {/* LIIME Suite Portal CTA */}
          <button
            onClick={() => setIsLiimeSuiteOpen(true)}
            title="Open LIIME Suite Portal (https://liimesuite.pages.dev/)"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
              theme === 'dark'
                ? 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border-emerald-800/60 shadow-2xs'
                : 'bg-[#F4FDF6] hover:bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline font-bold">LIIME Suite</span>
          </button>

          {/* Export Storyboard Primary CTA */}
          <button
            onClick={() => setIsExportOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md shadow-xs transition-colors whitespace-nowrap ${
              theme === 'dark'
                ? 'bg-zinc-100 hover:bg-white text-zinc-950 font-bold'
                : 'bg-zinc-900 hover:bg-zinc-800 text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main
        className={`flex-1 flex flex-col overflow-y-auto overflow-x-hidden relative transition-colors ${
          theme === 'dark' ? 'bg-[#121214]' : 'bg-[#E5E3DD]'
        }`}
      >
        {activeView === 'home' ? (
          <ProjectsHomepage
            projects={projectsList}
            activeProjectId={currentProject.id}
            onOpenProject={handleOpenExistingProject}
            onCreateNewProject={() => setIsNewProjectOpen(true)}
            onOpenTradFile={handleOpenTradFile}
            onOpenPdfFile={handleOpenPdfFile}
            onOpenIllustrationMode={() => setActiveView('illustration')}
            onOpenLiimeSuite={() => setIsLiimeSuiteOpen(true)}
            onSaveAsTrad={(id) => {
              const p = getProject(id);
              if (p) exportProjectToTradFile(p);
            }}
            onDuplicateProject={handleDuplicateProjectFromList}
            onDeleteProject={handleDeleteProject}
            onRenameProject={handleRenameProject}
            theme={theme}
          />
        ) : activeView === 'grid' ? (
          <div className="p-3 sm:p-5 flex-1 flex flex-col">
            <StoryboardGrid
              frames={frames}
              currentFrameIndex={currentFrameIndex}
              onSelectFrame={handleSelectFrame}
              onAddFrame={handleAddFrame}
              onDuplicateFrame={handleDuplicateFrame}
              onDeleteFrame={handleDeleteFrame}
              onMoveFrame={handleMoveFrame}
              onCloseGrid={() => setActiveView('desk')}
              onPlayRoll={() => {
                setActiveView('desk');
                setIsPlaying(true);
              }}
              theme={theme}
            />
          </div>
        ) : activeView === 'illustration' ? (
          <IllustrationWorkspace
            onBackToDesk={() => setActiveView('desk')}
            onSendToStoryboard={handleSendIllustrationToStoryboard}
            theme={theme}
          />
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-4 p-3 sm:p-5 w-full max-w-[1650px] mx-auto">
            {/* Left Side: Frame Navigation Menu (Beside the Canvas) */}
            <aside className="w-full lg:w-60 xl:w-68 shrink-0 lg:sticky lg:top-4 pb-2 lg:pb-0 order-2 lg:order-1">
              <FrameNavMenu
                frames={frames}
                currentFrameIndex={currentFrameIndex}
                onSelectFrame={handleSelectFrame}
                onAddFrame={handleAddFrame}
                onDuplicateFrame={handleDuplicateFrame}
                onDeleteFrame={handleDeleteFrame}
                onMoveFrame={handleMoveFrame}
                soundEnabled={deskSettings.soundEnabled}
                theme={theme}
              />
            </aside>

            {/* Drawing Desk & Peg Bar Section (Center: Canvas & Pegs) */}
            <div className="flex-1 flex flex-col items-center justify-between w-full max-w-4xl gap-3 order-1 lg:order-2">
              {/* Top Peg Bar (if configured top) */}
              {deskSettings.pegBarPosition === 'top' && (
                <PegBar
                  frames={frames}
                  currentFrameIndex={currentFrameIndex}
                  onSelectFrame={handleSelectFrame}
                  onAddFrame={handleAddFrame}
                  onDuplicateFrame={handleDuplicateFrame}
                  onDeleteFrame={handleDeleteFrame}
                  onMoveFrame={handleMoveFrame}
                  position="top"
                  onTogglePosition={() =>
                    setDeskSettings((prev) => ({
                      ...prev,
                      pegBarPosition: prev.pegBarPosition === 'top' ? 'bottom' : 'top',
                    }))
                  }
                  soundEnabled={deskSettings.soundEnabled}
                  theme={theme}
                />
              )}

              {/* The Physical Paper Sketchbook Page Flip Area */}
              <div className="flex-1 flex items-center justify-center my-auto py-1 w-full">
                <PhysicalPageFlip
                  currentFrame={currentFrame}
                  nextFrame={nextFrame}
                  prevFrame={prevFrame}
                  direction={flipDirection}
                  isFlipping={isFlipping}
                  onFlipComplete={handleFlipComplete}
                  soundEnabled={deskSettings.soundEnabled}
                  pegPosition={deskSettings.pegBarPosition}
                  onFlipForward={handleFlipForward}
                  onFlipBackward={handleFlipBackward}
                  theme={theme}
                >
                  <StoryboardSheet
                    currentFrame={currentFrame}
                    allFrames={frames}
                    currentFrameIndex={currentFrameIndex}
                    toolSettings={toolSettings}
                    onionSettings={onionSettings}
                    onChangeOnionSettings={(updates) => {
                      setOnionSettings((prev) => ({ ...prev, ...updates }));
                      setSaveStatus('unsaved');
                    }}
                    showFieldGrid={deskSettings.showFieldGrid}
                    pegPosition={deskSettings.pegBarPosition}
                    onUpdateCanvas={handleUpdateCanvas}
                    onUpdateFrameNotes={handleUpdateFrameNotes}
                    undoTrigger={undoTrigger}
                    redoTrigger={redoTrigger}
                    clearTrigger={clearTrigger}
                    canUndoChange={setCanUndo}
                    canRedoChange={setCanRedo}
                    perspectiveConfig={perspectiveConfig}
                    onUpdatePerspectiveConfig={handleUpdatePerspectiveConfig}
                    theme={theme}
                  />
                </PhysicalPageFlip>
              </div>

              {/* Bottom Peg Bar (if configured bottom) */}
              {deskSettings.pegBarPosition === 'bottom' && (
                <PegBar
                  frames={frames}
                  currentFrameIndex={currentFrameIndex}
                  onSelectFrame={handleSelectFrame}
                  onAddFrame={handleAddFrame}
                  onDuplicateFrame={handleDuplicateFrame}
                  onDeleteFrame={handleDeleteFrame}
                  onMoveFrame={handleMoveFrame}
                  position="bottom"
                  onTogglePosition={() =>
                    setDeskSettings((prev) => ({
                      ...prev,
                      pegBarPosition: prev.pegBarPosition === 'top' ? 'bottom' : 'top',
                    }))
                  }
                  soundEnabled={deskSettings.soundEnabled}
                  theme={theme}
                />
              )}
            </div>

            {/* Cleanly Arranged Right Side Tool Palette Dock */}
            <aside className="w-full lg:w-72 xl:w-80 shrink-0 lg:sticky lg:top-4 pb-6 lg:pb-0 order-3">
              <ToolDock
                toolSettings={toolSettings}
                onChangeToolSettings={(updates) => {
                  setToolSettings((prev) => ({ ...prev, ...updates }));
                  setSaveStatus('unsaved');
                }}
                onionSettings={onionSettings}
                onChangeOnionSettings={(updates) => {
                  setOnionSettings((prev) => ({ ...prev, ...updates }));
                  setSaveStatus('unsaved');
                }}
                showFieldGrid={deskSettings.showFieldGrid}
                onToggleFieldGrid={() =>
                  setDeskSettings((prev) => ({ ...prev, showFieldGrid: !prev.showFieldGrid }))
                }
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={() => setUndoTrigger((v) => v + 1)}
                onRedo={() => setRedoTrigger((v) => v + 1)}
                onClearCanvas={handleClearCanvas}
                isPlaying={isPlaying}
                onTogglePlay={handleTogglePlay}
                playbackFps={deskSettings.playbackFps}
                onChangeFps={(fps) => {
                  setDeskSettings((prev) => ({ ...prev, playbackFps: fps }));
                  setSaveStatus('unsaved');
                }}
                soundEnabled={deskSettings.soundEnabled}
                onToggleSound={() =>
                  setDeskSettings((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }))
                }
                onFlipForward={handleFlipForward}
                onFlipBackward={handleFlipBackward}
                currentFrameIndex={currentFrameIndex}
                totalFrames={frames.length}
                perspectiveConfig={perspectiveConfig}
                onChangePerspectiveConfig={handleUpdatePerspectiveConfig}
                theme={theme}
                onToggleTheme={toggleTheme}
                onOpenIllustrationMode={() => setActiveView('illustration')}
              />
            </aside>
          </div>
        )}
      </main>

      {/* Floating Save Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900 text-white text-xs font-semibold shadow-xl border border-zinc-700 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        onCreate={handleCreateNewProject}
        theme={theme}
      />

      {/* Save As Modal */}
      <SaveAsModal
        isOpen={isSaveAsOpen}
        onClose={() => setIsSaveAsOpen(false)}
        currentTitle={currentProject.title}
        onSaveAsCopy={handleSaveAsCopy}
        onExportTrad={handleExportTrad}
        theme={theme}
      />

      {/* Export Modal */}
      <ExportModal
        frames={frames}
        currentFrameIndex={currentFrameIndex}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onExportTrad={() => handleExportTrad()}
        onOpenTimelapse={() => {
          setTimelapseResult(null);
          setIsTimelapseModalOpen(true);
        }}
        projectTitle={currentProject.title}
        theme={theme}
      />

      {/* Process Timelapse Modal (Shows Live UI or Studio Desk Compositor) */}
      <TimelapseModal
        isOpen={isTimelapseModalOpen}
        onClose={() => setIsTimelapseModalOpen(false)}
        result={timelapseResult}
        onStartRecording={handleStartTimelapse}
        projectTitle={currentProject.title}
        theme={theme}
      />

      {/* PDF Storyboard Import Modal */}
      <PdfImportModal
        isOpen={isPdfImportOpen}
        onClose={() => {
          setIsPdfImportOpen(false);
          setPdfInitialFile(null);
        }}
        onImportFrames={handleImportPdfFrames}
        currentProjectTitle={currentProject.title}
        initialFile={pdfInitialFile}
        theme={theme}
      />

      {/* LIIME Suite Pop-up Window (Unskippable for 4 seconds on load) */}
      <LiimeSuiteModal
        isOpen={isLiimeSuiteOpen}
        onClose={() => setIsLiimeSuiteOpen(false)}
        theme={theme}
      />

      {/* Offline Status Toast */}
      <OfflineIndicator />

      {/* Loading Screen */}
      {isLoading && (
        <LoadingScreen
          theme={theme}
          onComplete={() => setIsLoading(false)}
        />
      )}
    </div>
  );
}
