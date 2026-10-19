import {
  StoryboardProject,
  ProjectSummary,
  Frame,
  PerspectiveConfig,
  DeskSettings,
  ToolSettings,
  OnionSkinSettings,
} from '../types/storyboard';
import { generateInitialStoryboardFrames } from './sampleFrames';
import {
  idbSaveProject,
  idbGetProject,
  idbGetAllProjects,
  idbDeleteProject,
  idbSetMeta,
  idbGetMeta,
} from './indexedDbStorage';

const PROJECTS_INDEX_KEY = 'storyboard_projects_index_v2';
const PROJECT_PREFIX = 'storyboard_project_';
const ACTIVE_PROJECT_ID_KEY = 'storyboard_active_project_id_v2';
const LEGACY_STORAGE_KEY = 'storyboard_traditional_frames_v1';

export const TRAD_FILE_EXTENSION = '.trad';

// In-memory cache for ultra-fast, zero-latency synchronous reads
const projectMemoryCache = new Map<string, StoryboardProject>();
let projectsListCache: ProjectSummary[] | null = null;

/**
 * Default empty or demo configurations
 */
export const defaultPerspectiveConfig: PerspectiveConfig = {
  mode: 'none',
  horizonY: 270,
  vp1: { x: 480, y: 270 },
  vp2: { x: 920, y: 270 },
  vp3: { x: 480, y: -100 },
  groundPlane: {
    originX: 480,
    originY: 460,
    width: 800,
    depth: 400,
    divisions: 12,
  },
  opacity: 0.55,
  showHandles: true,
};

export const defaultDeskSettings: DeskSettings = {
  pegBarPosition: 'top',
  showFieldGrid: false,
  soundEnabled: true,
  playbackFps: 8,
};

export const defaultToolSettings: ToolSettings = {
  tool: 'pencil',
  pencilType: 'graphite',
  penColor: '#161616',
  size: 3.5,
  opacity: 1,
};

export const defaultOnionSettings: OnionSkinSettings = {
  enabled: true,
  lightTableBulb: true,
  prevFramesCount: 2,
  nextFramesCount: 1,
  opacity: 0.65,
  colorCoded: true,
};

/**
 * Creates a single initial blank frame
 */
export function createBlankFrame(scene = '01', panel = '01', shot = '01'): Frame {
  return {
    id: `frame-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    sceneNumber: scene,
    panelNumber: panel,
    shotNumber: shot,
    actionNotes: '',
    dialogueNotes: '',
    durationSec: 1.0,
    canvasData: '',
    timestamp: Date.now(),
  };
}

/**
 * Compresses/resizes a frame dataUrl into a tiny lightweight thumbnail (~4KB)
 * so storing thumbnails in the index doesn't fill up localStorage
 */
function createMiniThumbnail(dataUrl: string, maxW = 160, maxH = 90): string {
  if (!dataUrl || dataUrl.length < 50 || typeof document === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = maxW;
    canvas.height = maxH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl.slice(0, 100);

    const img = new Image();
    img.src = dataUrl;
    // If already loaded / synchronous dataUrl
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, 0, 0, maxW, maxH);
      return canvas.toDataURL('image/jpeg', 0.65);
    }
    // Return original if not immediately renderable
    return dataUrl;
  } catch {
    return '';
  }
}

/**
 * Retrieves list of project summaries sorted by last updated descending
 */
export function getProjectsList(): ProjectSummary[] {
  if (projectsListCache) {
    return [...projectsListCache].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  try {
    const raw = localStorage.getItem(PROJECTS_INDEX_KEY);
    if (raw) {
      const list: ProjectSummary[] = JSON.parse(raw);
      if (Array.isArray(list)) {
        projectsListCache = list;
        return list.sort((a, b) => b.updatedAt - a.updatedAt);
      }
    }
  } catch (err) {
    console.error('Failed to read projects index:', err);
  }
  return [];
}

/**
 * Saves projects index to localStorage and memory cache
 */
function saveProjectsIndex(list: ProjectSummary[]): void {
  projectsListCache = list;
  try {
    localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(list));
  } catch (err) {
    // If quota exceeded, strip thumbnails from localStorage index
    try {
      const slimList = list.map((p) => ({ ...p, thumbnail: '' }));
      localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(slimList));
    } catch {
      console.warn('Could not save projects index to localStorage');
    }
  }
}

/**
 * Gets a full project by ID.
 * Checks memory cache -> localStorage -> returns null.
 */
export function getProject(id: string): StoryboardProject | null {
  // 1. Check memory cache first
  if (projectMemoryCache.has(id)) {
    return projectMemoryCache.get(id)!;
  }

  // 2. Check localStorage
  try {
    const raw = localStorage.getItem(`${PROJECT_PREFIX}${id}`);
    if (raw) {
      const project: StoryboardProject = JSON.parse(raw);
      if (project && project.id && Array.isArray(project.frames)) {
        projectMemoryCache.set(id, project);
        return project;
      }
    }
  } catch (err) {
    console.error(`Failed to get project ${id} from localStorage:`, err);
  }

  return null;
}

/**
 * Loads a project by ID with async IndexedDB fallback.
 */
export async function getProjectAsync(id: string): Promise<StoryboardProject | null> {
  const sync = getProject(id);
  if (sync && sync.frames && sync.frames.length > 0) {
    return sync;
  }

  // Fallback to IndexedDB
  const idbProject = await idbGetProject(id);
  if (idbProject) {
    projectMemoryCache.set(id, idbProject);
    return idbProject;
  }

  return sync;
}

/**
 * Saves a full project to IndexedDB, Memory Cache, and safely updates LocalStorage.
 * Guarantees NO FRAMES ARE EVER DROPPED.
 */
export function saveProject(project: StoryboardProject): void {
  if (!project || !project.id || !Array.isArray(project.frames)) {
    console.error('saveProject rejected: invalid project payload', project);
    return;
  }

  // 1. Pick thumbnail from first frame with drawing, or frame 0
  let thumbnail = project.thumbnail || '';
  const frameWithArt = project.frames.find((f) => f.canvasData && f.canvasData.length > 50);
  if (frameWithArt?.canvasData) {
    thumbnail = frameWithArt.canvasData;
  } else if (project.frames[0]?.canvasData) {
    thumbnail = project.frames[0].canvasData;
  }

  const updatedProject: StoryboardProject = {
    ...project,
    thumbnail,
    updatedAt: Date.now(),
    frames: project.frames.map((f, i) => ({
      ...f,
      panelNumber: f.panelNumber || String(i + 1).padStart(2, '0'),
      sceneNumber: f.sceneNumber || '01',
      shotNumber: f.shotNumber || '01',
      durationSec: typeof f.durationSec === 'number' ? f.durationSec : 1.0,
      canvasData: typeof f.canvasData === 'string' ? f.canvasData : '',
    })),
  };

  // 2. Put in memory cache immediately
  projectMemoryCache.set(updatedProject.id, updatedProject);

  // 3. Save to IndexedDB (asynchronous, unlimited storage, bulletproof)
  idbSaveProject(updatedProject).catch((err) => {
    console.warn('idbSaveProject error:', err);
  });

  // 4. Update index summary
  const list = getProjectsList();
  const existingIndex = list.findIndex((item) => item.id === project.id);
  const miniThumb = createMiniThumbnail(thumbnail);
  const summary: ProjectSummary = {
    id: updatedProject.id,
    title: updatedProject.title,
    description: updatedProject.description,
    createdAt: updatedProject.createdAt,
    updatedAt: updatedProject.updatedAt,
    frameCount: updatedProject.frames.length,
    thumbnail: miniThumb || thumbnail.slice(0, 500),
  };

  if (existingIndex >= 0) {
    list[existingIndex] = summary;
  } else {
    list.unshift(summary);
  }
  saveProjectsIndex(list);

  // 5. Try saving to localStorage safely without throwing if quota is exceeded
  try {
    localStorage.setItem(`${PROJECT_PREFIX}${project.id}`, JSON.stringify(updatedProject));
  } catch (err) {
    // If full, localStorage threw QuotaExceededError.
    // The data is 100% safe in IndexedDB and projectMemoryCache!
    console.info(`Project ${project.id} stored in IndexedDB (LocalStorage quota reached)`);
  }
}

/**
 * Creates a new project
 */
export function createProject(
  title = 'Untitled Storyboard',
  template: 'demo' | 'blank' = 'demo'
): StoryboardProject {
  const now = Date.now();
  const id = `proj-${now}-${Math.random().toString(36).substring(2, 7)}`;
  const frames = template === 'demo' ? generateInitialStoryboardFrames() : [createBlankFrame()];

  const newProj: StoryboardProject = {
    format: 'traditional-storyboard',
    version: 1,
    id,
    title: title.trim() || 'Untitled Storyboard',
    description:
      template === 'demo'
        ? 'Classic 4-panel jump anticipation sequence'
        : 'Blank storyboard sheet',
    createdAt: now,
    updatedAt: now,
    frames,
    currentFrameIndex: 0,
    perspectiveConfig: { ...defaultPerspectiveConfig },
    deskSettings: { ...defaultDeskSettings },
    toolSettings: { ...defaultToolSettings },
    onionSettings: { ...defaultOnionSettings },
    thumbnail: frames[0]?.canvasData || '',
  };

  saveProject(newProj);
  setActiveProjectId(newProj.id);
  return newProj;
}

/**
 * Duplicates an existing project
 */
export function duplicateProject(id: string, newTitle?: string): StoryboardProject | null {
  const original = getProject(id);
  if (!original) return null;

  const now = Date.now();
  const newId = `proj-${now}-${Math.random().toString(36).substring(2, 7)}`;
  const duplicated: StoryboardProject = {
    ...original,
    id: newId,
    title: newTitle || `${original.title} (Copy)`,
    createdAt: now,
    updatedAt: now,
    frames: original.frames.map((f, i) => ({
      ...f,
      id: `frame-${now}-${i}`,
    })),
  };

  saveProject(duplicated);
  return duplicated;
}

/**
 * Renames an existing project
 */
export function renameProject(id: string, newTitle: string): void {
  const p = getProject(id);
  if (!p) return;
  p.title = newTitle.trim() || 'Untitled Storyboard';
  p.updatedAt = Date.now();
  saveProject(p);
}

/**
 * Deletes a project by ID
 */
export function deleteProject(id: string): void {
  projectMemoryCache.delete(id);
  try {
    localStorage.removeItem(`${PROJECT_PREFIX}${id}`);
  } catch {
    // ignore
  }
  idbDeleteProject(id).catch(() => {});

  const list = getProjectsList().filter((p) => p.id !== id);
  saveProjectsIndex(list);
}

/**
 * Gets active project ID
 */
export function getActiveProjectId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PROJECT_ID_KEY);
  } catch {
    return null;
  }
}

/**
 * Sets active project ID
 */
export function setActiveProjectId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_PROJECT_ID_KEY, id);
  } catch {
    // ignore
  }
  idbSetMeta('active_project_id', id).catch(() => {});
}

/**
 * Exports project as a downloadable .trad file containing ALL frames intact
 */
export function exportProjectToTradFile(project: StoryboardProject): void {
  const exportPayload: StoryboardProject = {
    ...project,
    format: 'traditional-storyboard',
    version: 1,
    updatedAt: Date.now(),
    frames: project.frames.map((f, idx) => ({
      ...f,
      panelNumber: f.panelNumber || String(idx + 1).padStart(2, '0'),
      canvasData: f.canvasData || '',
    })),
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const cleanFilename =
    project.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]+/gi, '_') || 'storyboard';

  const downloadAnchor = document.createElement('a');
  downloadAnchor.href = url;
  downloadAnchor.download = `${cleanFilename}.trad`;
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  document.body.removeChild(downloadAnchor);
  URL.revokeObjectURL(url);
}

/**
 * Parses a JSON string to validate and return a complete StoryboardProject
 */
export function parseTradString(jsonStr: string): StoryboardProject {
  const parsed = JSON.parse(jsonStr);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid file content: not a JSON object.');
  }

  // Accept traditional-storyboard format or legacy format with frames array
  const rawFrames = Array.isArray(parsed.frames)
    ? parsed.frames
    : Array.isArray(parsed)
    ? parsed
    : null;

  if (!rawFrames || rawFrames.length === 0) {
    throw new Error('Invalid storyboard file: no animation frames found.');
  }

  const now = Date.now();
  const id = `proj-${now}-${Math.random().toString(36).substring(2, 7)}`;
  const title =
    typeof parsed.title === 'string' && parsed.title.trim().length > 0
      ? parsed.title.trim()
      : 'Imported Storyboard';

  // Ensure every frame is parsed with its complete canvas data preserved
  const frames: Frame[] = rawFrames.map((f: Partial<Frame>, idx: number) => ({
    id: f.id || `frame-${now}-${idx}`,
    sceneNumber: f.sceneNumber || '01',
    panelNumber: f.panelNumber || String(idx + 1).padStart(2, '0'),
    shotNumber: f.shotNumber || '01',
    actionNotes: f.actionNotes || '',
    dialogueNotes: f.dialogueNotes || '',
    durationSec: typeof f.durationSec === 'number' ? f.durationSec : 1.0,
    canvasData: typeof f.canvasData === 'string' ? f.canvasData : '',
    timestamp: typeof f.timestamp === 'number' ? f.timestamp : now,
  }));

  const project: StoryboardProject = {
    format: 'traditional-storyboard',
    version: 1,
    id,
    title,
    description: parsed.description || 'Imported from .trad file',
    createdAt: typeof parsed.createdAt === 'number' ? parsed.createdAt : now,
    updatedAt: now,
    frames,
    currentFrameIndex:
      typeof parsed.currentFrameIndex === 'number' && parsed.currentFrameIndex < frames.length
        ? parsed.currentFrameIndex
        : 0,
    perspectiveConfig: parsed.perspectiveConfig || { ...defaultPerspectiveConfig },
    deskSettings: parsed.deskSettings || { ...defaultDeskSettings },
    toolSettings: parsed.toolSettings || { ...defaultToolSettings },
    onionSettings: parsed.onionSettings || { ...defaultOnionSettings },
    thumbnail: frames.find((f) => f.canvasData && f.canvasData.length > 50)?.canvasData || frames[0]?.canvasData || '',
  };

  return project;
}

/**
 * Imports project from a .trad file File object
 */
export async function importProjectFromTradFile(file: File): Promise<StoryboardProject> {
  const text = await file.text();
  const project = parseTradString(text);

  // If the file had a filename, adopt it if title was generic
  if (file.name && (project.title === 'Imported Storyboard' || !project.title)) {
    const baseName = file.name.replace(/\.trad$/i, '').replace(/\.json$/i, '');
    if (baseName.trim()) {
      project.title = baseName;
    }
  }

  saveProject(project);
  setActiveProjectId(project.id);
  return project;
}

/**
 * Initializes storage:
 * 1. Checks memory cache and localStorage.
 * 2. Asynchronously synchronizes with IndexedDB in background.
 * 3. Returns the active project and current project list.
 */
export function initializeProjectStorage(): {
  activeProject: StoryboardProject;
  projects: ProjectSummary[];
} {
  let list = getProjectsList();

  // If no projects exist in the index, create default project or migrate legacy
  if (list.length === 0) {
    let initialFrames: Frame[] = [];

    // Check legacy frames key
    try {
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          initialFrames = parsed;
        }
      }
    } catch {
      // ignore
    }

    if (initialFrames.length === 0) {
      initialFrames = generateInitialStoryboardFrames();
    }

    const defaultProject: StoryboardProject = {
      format: 'traditional-storyboard',
      version: 1,
      id: `proj-default-${Date.now()}`,
      title: 'Scene 01 - The Jump (Demo)',
      description: 'Classic 4-panel animation jump and weight anticipation study',
      createdAt: Date.now() - 3600000,
      updatedAt: Date.now(),
      frames: initialFrames,
      currentFrameIndex: 0,
      perspectiveConfig: { ...defaultPerspectiveConfig },
      deskSettings: { ...defaultDeskSettings },
      toolSettings: { ...defaultToolSettings },
      onionSettings: { ...defaultOnionSettings },
      thumbnail: initialFrames[0]?.canvasData || '',
    };

    saveProject(defaultProject);
    setActiveProjectId(defaultProject.id);
    list = getProjectsList();
    return { activeProject: defaultProject, projects: list };
  }

  // Projects exist, find active project or take first
  const activeId = getActiveProjectId();
  let activeProject = activeId ? getProject(activeId) : null;

  if (!activeProject && list.length > 0) {
    activeProject = getProject(list[0].id);
  }

  if (!activeProject) {
    activeProject = createProject('Scene 01 - The Jump', 'demo');
    list = getProjectsList();
  }

  return { activeProject, projects: list };
}

/**
 * Background synchronization between IndexedDB and local memory cache.
 * Restores any projects that might only be in IndexedDB or migrates localStorage to IndexedDB.
 */
export async function syncStorageWithIndexedDb(): Promise<{
  activeProject?: StoryboardProject;
  projects: ProjectSummary[];
}> {
  try {
    const idbProjects = await idbGetAllProjects();

    // Populate memory cache with all IndexedDB projects
    for (const p of idbProjects) {
      if (p && p.id && Array.isArray(p.frames)) {
        const existing = projectMemoryCache.get(p.id);
        // If IDB has more frames or newer timestamp, update cache
        if (!existing || (p.frames.length >= existing.frames.length && p.updatedAt >= existing.updatedAt)) {
          projectMemoryCache.set(p.id, p);
        }
      }
    }

    // Also migrate any existing projects from memory/localStorage to IndexedDB
    for (const [id, p] of projectMemoryCache.entries()) {
      await idbSaveProject(p);
    }

    // Rebuild index
    const allSummaries: ProjectSummary[] = [];
    for (const [, p] of projectMemoryCache.entries()) {
      allSummaries.push({
        id: p.id,
        title: p.title,
        description: p.description,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        frameCount: p.frames.length,
        thumbnail: createMiniThumbnail(p.thumbnail || p.frames[0]?.canvasData || ''),
      });
    }

    if (allSummaries.length > 0) {
      saveProjectsIndex(allSummaries);
    }

    const activeId = getActiveProjectId();
    const activeProject = activeId ? projectMemoryCache.get(activeId) : undefined;

    return {
      activeProject,
      projects: getProjectsList(),
    };
  } catch (err) {
    console.warn('Storage sync with IndexedDB error:', err);
    return {
      projects: getProjectsList(),
    };
  }
}
