const path = require("path");
const fs = require("fs");
const fsPromises = fs.promises;

let deps = null;
let currentSettings = null;
let currentSettingsProfileId = null;

// SIMPLIFIED: Removed layoutMode and autoplayEnabled from default settings
// Note: zoomLevel will be set dynamically after app is ready
const defaultSettings = {
  recursiveMode: false,
  renderLimitStep: 10,
  zoomLevel: 1, // Will be updated after app ready if no saved setting
  showFilenames: true,
  sortKey: "name",
  sortDir: "asc",
  groupByFolders: true,
  mediaFilter: "all", // 'images' | 'videos' | 'all'
  randomSeed: null,
  windowBounds: {
    width: 1400,
    height: 900,
    x: undefined,
    y: undefined,
  },
};

function ensureInit() {
  if (!deps) {
    throw new Error("main/ipc-settings.js used before init()");
  }
  return deps;
}

// Enhanced default zoom detection based on screen size
function getDefaultZoomForScreen() {
  try {
    const { screen } = require("electron");
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    console.log(`🖥️ Detected display: ${width}x${height}`);

    // For 4K+ monitors, FORCE minimum 150% (index 2) to prevent crashes
    if (width >= 3840 || height >= 2160) {
      console.log(
        "🖥️ 4K+ display detected, defaulting to 150% zoom for memory safety"
      );
      return 2; // 150%
    }

    // For high-DPI displays, default to 150% for safety
    if (width >= 2560 || height >= 1440) {
      console.log(
        "🖥️ High-DPI display detected, defaulting to 150% zoom for safety"
      );
      return 2; // 150%
    }

    // For standard displays, 100% should be safe
    if (width >= 1920 || height >= 1080) {
      console.log("🖥️ Standard HD display detected, defaulting to 100% zoom");
      return 1; // 100%
    }

    // For smaller displays, 100% is definitely safe
    console.log("🖥️ Small display detected, defaulting to 100% zoom");
    return 1; // 100%
  } catch (error) {
    console.log("🖥️ Screen not available yet, using safe default zoom (150%)");
    return 2; // Default to 150% for safety when screen is not available
  }
}

function computeDefaultZoomLevel() {
  try {
    return getDefaultZoomForScreen();
  } catch {
    return defaultSettings.zoomLevel;
  }
}

function normaliseLoadedSettings(rawSettings) {
  const { layoutMode, autoplayEnabled, ...cleanSettings } = rawSettings || {};
  const merged = { ...defaultSettings, ...cleanSettings };
  const hasZoom = Object.prototype.hasOwnProperty.call(cleanSettings, "zoomLevel")
    && cleanSettings.zoomLevel !== null
    && cleanSettings.zoomLevel !== undefined;
  if (!hasZoom) {
    merged.zoomLevel = computeDefaultZoomLevel();
  }
  return merged;
}

async function tryMigrateLegacySettings(profileId, targetPath) {
  const { profileManager } = ensureInit();
  if (profileId !== profileManager.DEFAULT_PROFILE_ID) {
    return null;
  }
  if (typeof profileManager.getUserDataPath !== "function") {
    return null;
  }

  let userDataPath;
  try {
    userDataPath = profileManager.getUserDataPath();
  } catch (error) {
    console.warn("[settings] Unable to resolve userData path for migration", error);
    return null;
  }

  const legacyPath = path.join(userDataPath, "settings.json");
  if (legacyPath === targetPath) {
    return null;
  }

  try {
    const legacyRaw = await fsPromises.readFile(legacyPath, "utf8");
    const legacySettings = JSON.parse(legacyRaw);
    const migrated = normaliseLoadedSettings(legacySettings);
    const { layoutMode, autoplayEnabled, ...toPersist } = migrated;
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, JSON.stringify(toPersist, null, 2));
    console.log("[settings] Migrated legacy settings.json into profile scope");
    return migrated;
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.warn("[settings] Failed to migrate legacy settings", error);
    }
    return null;
  }
}

async function loadSettings(profileId) {
  const { getActiveProfileId, getSettingsPath } = ensureInit();
  const resolvedId = profileId ?? getActiveProfileId();
  const settingsFile = getSettingsPath(resolvedId);
  try {
    const data = await fsPromises.readFile(settingsFile, "utf8");
    const parsed = JSON.parse(data);
    const settings = normaliseLoadedSettings(parsed);
    currentSettingsProfileId = resolvedId;
    currentSettings = settings;
    return currentSettings;
  } catch (error) {
    const migrated = await tryMigrateLegacySettings(resolvedId, settingsFile);
    if (migrated) {
      currentSettingsProfileId = resolvedId;
      currentSettings = migrated;
      return currentSettings;
    }

    if (error?.code !== "ENOENT") {
      console.warn(
        "[settings] Failed to read settings for profile, using defaults",
        error
      );
    } else {
      console.log(
        "No settings file found for profile",
        resolvedId,
        "— using defaults"
      );
    }

    const defaults = normaliseLoadedSettings(null);
    currentSettingsProfileId = resolvedId;
    currentSettings = defaults;
    return currentSettings;
  }
}

async function saveSettings(settings, profileId) {
  const { getActiveProfileId, getSettingsPath } = ensureInit();
  const resolvedId = profileId ?? getActiveProfileId();
  try {
    const { layoutMode, autoplayEnabled, ...cleanSettings } = settings || {};
    const settingsFile = getSettingsPath(resolvedId);
    await fsPromises.mkdir(path.dirname(settingsFile), { recursive: true });
    await fsPromises.writeFile(settingsFile, JSON.stringify(cleanSettings, null, 2));
    currentSettingsProfileId = resolvedId;
    currentSettings = normaliseLoadedSettings(cleanSettings);
    console.log("Settings saved for profile", resolvedId);
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
}

async function saveSettingsPartial(partialSettings, profileId) {
  const { getActiveProfileId } = ensureInit();
  const resolvedId = profileId ?? getActiveProfileId();
  try {
    const current =
      currentSettings && currentSettingsProfileId === resolvedId
        ? currentSettings
        : await loadSettings(resolvedId);
    const newSettings = { ...current, ...partialSettings };
    await saveSettings(newSettings, resolvedId);
  } catch (error) {
    console.error("Failed to save partial settings:", error);
  }
}

function getCurrentSettings() {
  return currentSettings;
}

function resetCurrentSettings() {
  currentSettings = null;
  currentSettingsProfileId = null;
}

function init(receivedDeps) {
  deps = receivedDeps;
  const { ipcMain, getMainWindow } = deps;

  ipcMain.handle("save-settings", async (_event, settings) => {
    await saveSettings(settings);
    return { success: true };
  });

  ipcMain.handle("load-settings", async () => {
    const settings = await loadSettings();
    return settings;
  });

  // NEW: Synchronous-ish settings getter - returns cached settings immediately
  ipcMain.handle("get-settings", async () => {
    console.log("get-settings called, returning:", currentSettings);
    return currentSettings || defaultSettings;
  });

  // NEW: Request settings (for refresh scenarios)
  ipcMain.handle("request-settings", async () => {
    console.log("request-settings called, sending settings via IPC");
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(
        "settings-loaded",
        currentSettings || defaultSettings
      );
    }
    return { success: true };
  });

  ipcMain.handle("save-settings-partial", async (_event, partialSettings) => {
    await saveSettingsPartial(partialSettings);
    return { success: true };
  });
}

module.exports = {
  init,
  loadSettings,
  saveSettings,
  saveSettingsPartial,
  getCurrentSettings,
  resetCurrentSettings,
  defaultSettings,
};
