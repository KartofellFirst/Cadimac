const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sketchforgeDesktop", {
  getVersion: () => ipcRenderer.invoke("sketchforge:get-version")
});
