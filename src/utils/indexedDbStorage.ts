import { StoryboardProject, ProjectSummary } from '../types/storyboard';

const DB_NAME = 'storyboard_desk_db';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_META = 'metadata';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Persist a complete StoryboardProject with all frames and canvas data to IndexedDB
 */
export async function idbSaveProject(project: StoryboardProject): Promise<void> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_PROJECTS], 'readwrite');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.put(project);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('idbSaveProject warning:', err);
  }
}

/**
 * Load a single project by ID from IndexedDB
 */
export async function idbGetProject(id: string): Promise<StoryboardProject | null> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_PROJECTS], 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.get(id);

      req.onsuccess = () => {
        resolve(req.result || null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`idbGetProject error for ${id}:`, err);
    return null;
  }
}

/**
 * Load all projects from IndexedDB
 */
export async function idbGetAllProjects(): Promise<StoryboardProject[]> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_PROJECTS], 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.getAll();

      req.onsuccess = () => {
        resolve(req.result || []);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('idbGetAllProjects error:', err);
    return [];
  }
}

/**
 * Delete a project by ID from IndexedDB
 */
export async function idbDeleteProject(id: string): Promise<void> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_PROJECTS], 'readwrite');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`idbDeleteProject error for ${id}:`, err);
  }
}

/**
 * Save arbitrary metadata (e.g. active project id)
 */
export async function idbSetMeta<T>(key: string, value: T): Promise<void> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_META], 'readwrite');
      const store = tx.objectStore(STORE_META);
      const req = store.put({ key, value });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`idbSetMeta error for ${key}:`, err);
  }
}

/**
 * Get metadata by key
 */
export async function idbGetMeta<T>(key: string): Promise<T | null> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_META], 'readonly');
      const store = tx.objectStore(STORE_META);
      const req = store.get(key);

      req.onsuccess = () => {
        resolve(req.result ? req.result.value : null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`idbGetMeta error for ${key}:`, err);
    return null;
  }
}
