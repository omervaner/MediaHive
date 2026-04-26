let deps = null;

function ensureInit() {
  if (!deps) {
    throw new Error("main/menu.js used before init()");
  }
  return deps;
}

async function promptForProfileName(defaultValue, { title, message }) {
  const { dialog, ipcMain, getMainWindow } = ensureInit();
  if (typeof dialog.showInputBox === "function") {
    const result = await dialog.showInputBox({
      title,
      message,
      buttonLabel: "Save",
      value: defaultValue ?? "",
      inputLabel: message,
      cancelId: 1,
    });
    if (result?.canceled || result?.response === 1) {
      return null;
    }
    const value = result?.value ?? result?.textValue ?? result?.inputValue ?? "";
    const trimmed = typeof value === "string" ? value.trim() : "";
    return trimmed.length ? trimmed : null;
  }

  const mainWindow = getMainWindow();
  if (mainWindow?.webContents) {
    const requestId = `profile-prompt-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`;
    return await new Promise((resolve) => {
      let settled = false;
      const channel = "profiles:prompt-response";
      const cleanup = () => {
        if (settled) return;
        settled = true;
        ipcMain.removeListener(channel, handler);
        clearTimeout(timeoutId);
      };
      const handler = (_event, payload) => {
        if (!payload || payload.requestId !== requestId) {
          return;
        }
        cleanup();
        const value =
          typeof payload.value === "string" ? payload.value.trim() : "";
        resolve(value.length ? value : null);
      };
      const timeoutId = setTimeout(() => {
        cleanup();
        resolve(null);
      }, 45000);

      ipcMain.on(channel, handler);
      try {
        mainWindow.webContents.send("profiles:prompt-input", {
          requestId,
          defaultValue,
          title,
          message,
        });
      } catch (error) {
        cleanup();
        console.warn("[profiles] Failed to request renderer prompt", error);
        resolve(null);
      }
    });
  }

  const { response } = await dialog.showMessageBox(mainWindow || null, {
    type: "question",
    buttons: ["Use Suggested", "Cancel"],
    defaultId: 0,
    cancelId: 1,
    title,
    message,
    detail:
      "Your Electron version does not provide text input dialogs. Choose 'Use Suggested' to accept the suggested name.",
  });
  if (response === 0) {
    const trimmed = typeof defaultValue === "string" ? defaultValue.trim() : "";
    return trimmed.length ? trimmed : null;
  }
  return null;
}

async function handleCreateProfileFromMenu() {
  const { dialog, getMainWindow, profileManager, reconfigureForProfile } = ensureInit();
  const profiles = profileManager.listProfiles();
  const suggested = `Profile ${profiles.length + 1}`;
  const name = await promptForProfileName(suggested, {
    title: "Create Profile",
    message: "Enter a name for the new profile:",
  });
  if (!name) return;
  try {
    const profile = profileManager.createProfile(name);
    await reconfigureForProfile(profile.id);
  } catch (error) {
    console.error("Failed to create profile", error);
    await dialog.showMessageBox(getMainWindow() || null, {
      type: "error",
      title: "Create Profile Failed",
      message: "Could not create the profile.",
      detail: error?.message || String(error),
    });
  }
}

async function handleRenameActiveProfileFromMenu() {
  const {
    dialog,
    getMainWindow,
    profileManager,
    getActiveProfileId,
    getProfileDisplayName,
    broadcastProfileChange,
  } = ensureInit();
  const activeId = getActiveProfileId();
  const currentName = getProfileDisplayName(activeId);
  const name = await promptForProfileName(currentName, {
    title: "Rename Profile",
    message: "Enter a new name for the active profile:",
  });
  if (!name || name === currentName) {
    return;
  }
  try {
    profileManager.renameProfile(activeId, name);
    rebuild();
    broadcastProfileChange();
  } catch (error) {
    console.error("Failed to rename profile", error);
    await dialog.showMessageBox(getMainWindow() || null, {
      type: "error",
      title: "Rename Profile Failed",
      message: "Could not rename the profile.",
      detail: error?.message || String(error),
    });
  }
}

async function handleDeleteActiveProfileFromMenu() {
  const {
    dialog,
    getMainWindow,
    profileManager,
    getActiveProfileId,
    getProfileDisplayName,
    reconfigureForProfile,
  } = ensureInit();
  const activeId = getActiveProfileId();
  const profiles = profileManager.listProfiles();
  if (profiles.length <= 1) {
    await dialog.showMessageBox(getMainWindow() || null, {
      type: "warning",
      title: "Delete Profile",
      message: "At least one profile must remain.",
    });
    return;
  }

  const activeName = getProfileDisplayName(activeId);
  const { response } = await dialog.showMessageBox(getMainWindow() || null, {
    type: "warning",
    buttons: ["Delete", "Cancel"],
    defaultId: 1,
    cancelId: 1,
    title: "Delete Profile",
    message: `Delete the profile "${activeName}"?`,
    detail:
      "All settings and cached data for this profile will be removed. This cannot be undone.",
  });
  if (response !== 0) {
    return;
  }

  try {
    profileManager.deleteProfile(activeId);
    await reconfigureForProfile(profileManager.getActiveProfile());
  } catch (error) {
    console.error("Failed to delete profile", error);
    await dialog.showMessageBox(getMainWindow() || null, {
      type: "error",
      title: "Delete Profile Failed",
      message: "Could not delete the profile.",
      detail: error?.message || String(error),
    });
  }
}

function buildProfilesMenuTemplate() {
  const { profileManager, getActiveProfileId, getProfileDisplayName, reconfigureForProfile } = ensureInit();
  const profiles = profileManager.listProfiles();
  if (!profiles.length) {
    return [];
  }
  const activeId = getActiveProfileId();
  const activeName = getProfileDisplayName(activeId);

  const submenu = [
    { label: `Active: ${activeName}`, enabled: false },
    { type: "separator" },
    ...profiles.map((profile) => ({
      label: profile.name,
      type: "radio",
      checked: profile.id === activeId,
      click: () => {
        if (profile.id !== getActiveProfileId()) {
          reconfigureForProfile(profile.id).catch((error) => {
            console.error("Failed to switch profile", error);
          });
        }
      },
    })),
    { type: "separator" },
    {
      label: "Create Profile…",
      click: () => {
        handleCreateProfileFromMenu().catch((error) => {
          console.error("Create profile handler failed", error);
        });
      },
    },
    {
      label: "Rename Profile…",
      enabled: profiles.length > 0,
      click: () => {
        handleRenameActiveProfileFromMenu().catch((error) => {
          console.error("Rename profile handler failed", error);
        });
      },
    },
    {
      label: "Delete Profile…",
      enabled: profiles.length > 1,
      click: () => {
        handleDeleteActiveProfileFromMenu().catch((error) => {
          console.error("Delete profile handler failed", error);
        });
      },
    },
  ];

  return submenu;
}

// Create application menu with folder selection
function rebuild() {
  const { app, Menu, dialog, getMainWindow, openDonationPage } = ensureInit();
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Open Folder",
          accelerator: "CmdOrCtrl+O",
          click: async () => {
            const mainWindow = getMainWindow();
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ["openDirectory"],
              title: "Select Media Folder",
            });
            if (!result.canceled && result.filePaths.length > 0) {
              mainWindow.webContents.send(
                "folder-selected",
                result.filePaths[0]
              );
            }
          },
        },
        { type: "separator" },
        {
          label: "Quit",
          accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
          click: () => app.quit(),
        },
      ],
    },
    {
      label: "Profiles",
      submenu: buildProfilesMenuTemplate(),
    },
    {
      label: "Options",
      submenu: [
        {
          label: "Data Location",
          click: () => {
            const mainWindow = getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("ui:open-data-location");
            }
          },
        },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About MediaHive",
          click: () => {
            const mainWindow = getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("ui:open-about");
            }
          },
        },
        {
          label: "Support MediaHive on Ko-fi",
          click: () => {
            openDonationPage().catch((error) => {
              console.warn("Failed to open support link", error);
            });
          },
        },
      ],
    },
  ];

  if (process.platform === "darwin") {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function init(receivedDeps) {
  deps = receivedDeps;
}

module.exports = { init, rebuild };
