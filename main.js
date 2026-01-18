const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const { spawn } = require("child_process");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true, // 确保窗口自动显示
    webPreferences: {
      preload: path.join(__dirname, "preload.js"), // 确保 preload 路径正确
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 重要：在开发环境下，强制加载 Vite 启动的 5173 端口
  // 使用递归重试，直到服务器就绪
  const loadURLWithRetry = (url, retries = 10, delay = 1000) => {
    win.loadURL(url)
      .then(() => {
        console.log("成功加载 URL:", url);
      })
      .catch((err) => {
        if (retries > 0) {
          console.log(`加载 URL 失败，${delay}ms 后重试... (剩余 ${retries} 次)`);
          setTimeout(() => {
            loadURLWithRetry(url, retries - 1, delay);
          }, delay);
        } else {
          console.error("加载 URL 最终失败:", err);
        }
      });
  };

  loadURLWithRetry("http://localhost:5173");

  // 确保窗口在前台显示
  win.once("ready-to-show", () => {
    win.show();
  });
}

// 打开文件夹
ipcMain.on("open-folder", (event, filePath) => {
  console.log("收到打开文件夹请求:", filePath);
  // shell.showItemInFolder 会打开文件夹并高亮选中该文件
  // 如果 filePath 只是目录，它会直接打开该目录
  if (filePath) {
    try {
      const normalizedPath = path.normalize(filePath);
      console.log("标准化后的路径:", normalizedPath);
      shell.showItemInFolder(normalizedPath);
      console.log("文件夹已打开");
    } catch (error) {
      console.error("打开文件夹时出错:", error);
    }
  } else {
    console.error("filePath 为空，无法打开文件夹");
  }
});

// 文件保存对话框
ipcMain.handle("dialog:saveFile", async () => {
  const { filePath } = await dialog.showSaveDialog({
    title: "选择合并后的保存位置",
    defaultPath: "merged_document.pdf",
    filters: [{ name: "PDFs", extensions: ["pdf"] }],
  });
  return filePath;
});

// 处理预览请求
ipcMain.handle("pdf:getPreview", async (event, filePath) => {
  return new Promise((resolve) => {
    // 注意：这里传给 Python 的参数是 'info' 还是 'preview'？
    // 根据你之前的 merger.py，它识别的是 'info'
    const py = spawn("python", [
      path.join(__dirname, "core/merger.py"),
      "info",
      filePath,
    ]);
    let result = "";
    py.stdout.on("data", (data) => (result += data.toString()));
    py.on("close", () => {
      try {
        resolve(JSON.parse(result)); // 必须转成对象返回给前端
      } catch (e) {
        resolve({ error: "解析失败" });
      }
    });
  });
});

// 处理合并请求 (关键：流式处理)
ipcMain.handle("pdf:merge", async (event, paths, outPath) => {
  const py = spawn("python", [
    path.join(__dirname, "core/merger.py"),
    "merge",
    JSON.stringify(paths),
    outPath,
  ]);

  py.stdout.on("data", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === "progress") {
        event.sender.send("merge-progress", msg.value);
      }
    } catch (e) {
      /* 忽略非JSON输出 */
    }
  });

  return new Promise((resolve) =>
    py.on("close", (code) => resolve(code === 0))
  );
});

// 文件打开对话框
ipcMain.handle("dialog:openFile", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openFile", "multiSelections"],
    filters: [{ name: "PDFs", extensions: ["pdf"] }],
  });
  return canceled ? [] : filePaths;
});

app.whenReady().then(() => {
  console.log("Electron app is ready, creating window...");
  createWindow();
});

// macOS 支持：当点击 dock 图标时重新创建窗口
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Windows/Linux 支持：所有窗口关闭时退出应用
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
