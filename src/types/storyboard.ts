export type DrawingTool = 'pencil' | 'pen' | 'eraser' | 'lasso';

export type PencilType = 'graphite' | 'col-erase-blue' | 'carmine-red';

export type PerspectiveMode = 'none' | '1-point' | '2-point' | '3-point' | 'ground-grid' | 'isometric';

export interface PerspectiveConfig {
  mode: PerspectiveMode;
  horizonY: number; // 0 to 540
  vp1: { x: number; y: number }; // 1-pt center, or 2-pt left, or 3-pt left
  vp2: { x: number; y: number }; // 2-pt right, 3-pt right
  vp3: { x: number; y: number }; // 3-pt top/bottom vertical convergence
  groundPlane: {
    originX: number;
    originY: number;
    width: number;
    depth: number;
    divisions: number;
  };
  density?: number; // line count
  opacity: number; // 0.1 to 0.8
  showHandles: boolean; // toggle interactive draggable handle points
}

export interface Frame {
  id: string;
  sceneNumber: string;
  panelNumber: string;
  shotNumber: string;
  actionNotes: string;
  dialogueNotes: string;
  durationSec: number;
  canvasData: string; // Base64 dataURL of drawing
  timestamp: number;
}

export interface ToolSettings {
  tool: DrawingTool;
  pencilType: PencilType;
  penColor: string;
  size: number;
  opacity: number;
}

export interface OnionSkinSettings {
  enabled: boolean;
  lightTableBulb: boolean;
  prevFramesCount: number; // 1 or 2
  nextFramesCount: number; // 0 or 1
  opacity: number; // 0.1 to 0.7
  colorCoded: boolean; // blue for prev, red for next
}

export interface DeskSettings {
  pegBarPosition: 'top' | 'bottom';
  showFieldGrid: boolean; // 12-field animation grid
  soundEnabled: boolean;
  playbackFps: number; // 6, 8, 12, 24
  theme?: 'light' | 'dark';
}

export interface StoryboardProject {
  format: 'traditional-storyboard';
  version: 1;
  id: string;
  title: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  frames: Frame[];
  currentFrameIndex?: number;
  perspectiveConfig?: PerspectiveConfig;
  deskSettings?: DeskSettings;
  toolSettings?: ToolSettings;
  onionSettings?: OnionSkinSettings;
  theme?: 'light' | 'dark';
  thumbnail?: string; // Data URL for project preview
}

export interface ProjectSummary {
  id: string;
  title: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  frameCount: number;
  thumbnail?: string;
}
