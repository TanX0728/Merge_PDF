const { contextBridge, ipcRenderer } = require("electron");

// preload.js 核心部分
contextBridge.exposeInMainWorld("electronAPI", {
  openFile: () => ipcRenderer.invoke("dialog:openFile"),
  saveFile: () => ipcRenderer.invoke("dialog:saveFile"), // 确保加上这个
  // 必须叫这个名字，且对应 main.js 里的监听名
  getPreview: (path) => ipcRenderer.invoke("pdf:getPreview", path),
  startMerge: (paths, outPath) =>
    ipcRenderer.invoke("pdf:merge", paths, outPath),
  onProgress: (callback) => {
    const subscription = (event, value) => callback(value);
    ipcRenderer.on("merge-progress", subscription);
    return () => ipcRenderer.removeListener("merge-progress", subscription);
  },
  openFolder: (path) => ipcRenderer.send("open-folder", path),
});
