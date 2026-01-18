import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  FilePdf,
  Trash,
  MagnifyingGlassPlus,
  Plus,
  ArrowsDownUp,
  Broom,
  Stack,
  CheckCircle,
  FolderOpen,
  StopCircle,
  ArrowClockwise,
  Copy,
  Check,
} from "@phosphor-icons/react";

export default function App() {
  const [files, setFiles] = useState<any[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sortBy, setSortBy] = useState("default");
  const [showSuccess, setShowSuccess] = useState(false);
  const [finalPath, setFinalPath] = useState("");
  const [isHoverPath, setIsHoverPath] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // 拖放状态
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  
  // 预览状态
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [previewPages, setPreviewPages] = useState<any[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);

  const displayProgressRef = useRef(0);
  const finishTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- 1. 进度与全局拖放拦截 ---
  useEffect(() => {
    // 进度监听
    // @ts-ignore
    const unsubscribe = window.electronAPI?.onProgress((value: number) => {
      const mappedValue = Math.floor(value * 0.8);
      if (mappedValue > displayProgressRef.current) {
        displayProgressRef.current = mappedValue;
        setProgress(mappedValue);
      }
    });

    // 核心：防止 Electron 默认拦截导致显示"禁用符号"
    // 在全局设置默认拖放效果为 copy，允许文件拖放
    const handleGlobalDragOver = (e: DragEvent) => {
      // 只设置 dropEffect，不阻止事件传播
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }
    };

    // 不在全局阻止 drop 事件，让具体的拖放区域自己处理
    document.addEventListener("dragover", handleGlobalDragOver, true);

    return () => {
      unsubscribe && unsubscribe();
      document.removeEventListener("dragover", handleGlobalDragOver, true);
    };
  }, []);

  // --- 2. 排序与文件处理逻辑 ---
  const sortedFiles = useMemo(() => {
    const list = [...files];
    if (sortBy === "name")
      return list.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "size") {
      return list.sort((a, b) => {
        const parseSize = (s: string) =>
          parseFloat(s.replace(/[^\d.]/g, "")) || 0;
        return parseSize(b.size) - parseSize(a.size);
      });
    }
    return list;
  }, [files, sortBy]);

  const processNewFiles = async (paths: string[], insertIdx: number = -1) => {
    if (isMerging || !paths || paths.length === 0) return;

    const newItems = paths.map((p: string) => ({
      id: Math.random().toString(36).substr(2, 9),
      path: p,
      name: p.split(/[\\/]/).pop(),
      pages: "...",
      size: "...",
      preview: "",
    }));

    setFiles((prev) => {
      const updated = [...prev];
      if (insertIdx === -1 || insertIdx >= prev.length)
        return [...updated, ...newItems];
      updated.splice(insertIdx, 0, ...newItems);
      return updated;
    });

    for (const item of newItems) {
      try {
        // @ts-ignore
        const info = await window.electronAPI.getPreview(item.path);
        if (info && !info.error) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === item.id
                ? {
                    ...f,
                    pages: info.pages,
                    size: info.size,
                    preview: `data:image/png;base64,${info.preview}`,
                  }
                : f
            )
          );
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // --- 3. 拖放响应函数 ---
  const onZoneDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 如果正在拖拽内部文件，使用 move 效果；外部文件使用 copy
    if (draggedItemIndex !== null) {
      e.dataTransfer.dropEffect = "move";
    } else {
      e.dataTransfer.dropEffect = "copy";
    }
    
    if (isMerging) return;
    
    // 如果拖拽的是内部文件，且目标位置与源位置不同，显示插入指示
    if (draggedItemIndex !== null && draggedItemIndex !== index) {
      setDragIndex(index);
    } else if (draggedItemIndex === null) {
      // 外部文件拖放
      setDragIndex(index);
    }
  };

  const onZoneDrop = async (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isMerging) return;

    // 检查是否是内部文件拖拽重排序
    const draggedItemData = e.dataTransfer.getData("text/plain");
    
    if (draggedItemData && draggedItemData.startsWith("file-item-")) {
      // 内部文件重排序
      // 从 sortedFiles 索引映射回原始 files 索引
      const sourceSortedIndex = parseInt(draggedItemData.replace("file-item-", ""));
      const draggedFile = sortedFiles[sourceSortedIndex];
      
      if (draggedFile && sourceSortedIndex !== index) {
        // 找到文件在原始 files 数组中的索引
        const sourceFileIndex = files.findIndex((f) => f.id === draggedFile.id);
        
        if (sourceFileIndex !== -1) {
          setFiles((prev) => {
            const newFiles = [...prev];
            const [removed] = newFiles.splice(sourceFileIndex, 1);
            
            // 计算在原始 files 数组中的目标位置
            let targetFileIndex: number;
            if (index < sortedFiles.length) {
              // 目标位置在列表中间，找到目标文件在原始数组中的位置
              const targetFile = sortedFiles[index];
              targetFileIndex = prev.findIndex((f) => f.id === targetFile.id);
              
              // 如果源位置已被删除，需要调整索引
              if (sourceFileIndex < targetFileIndex) {
                targetFileIndex--; // 删除源元素后，后面的元素索引都减1
              }
            } else {
              // 目标位置在末尾
              targetFileIndex = prev.length;
            }
            
            // 插入到目标位置
            newFiles.splice(Math.max(0, targetFileIndex), 0, removed);
            
            return newFiles;
          });
        }
      }
    } else {
      // 外部文件拖放
      const files = Array.from(e.dataTransfer.files);
      const paths = files
        .map((f: any) => f.path || f.name)
        .filter((p) => p && p.toLowerCase().endsWith(".pdf"));

      if (paths.length > 0) {
        processNewFiles(paths, index);
      }
    }

    // 重置拖拽状态
    setDragIndex(null);
    setDraggedItemIndex(null);
  };

  // 文件卡片拖拽开始
  const onFileDragStart = (e: React.DragEvent, index: number) => {
    if (isMerging) {
      e.preventDefault();
      return;
    }
    
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // 传递文件索引作为数据
    e.dataTransfer.setData("text/plain", `file-item-${index}`);
    
    // 设置拖拽预览效果（可选：使用半透明效果）
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  // 文件卡片拖拽结束
  const onFileDragEnd = (e: React.DragEvent) => {
    setDraggedItemIndex(null);
    setDragIndex(null);
    
    // 恢复透明度
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  };

  // 处理预览按钮点击
  const handlePreview = async (file: any) => {
    // 如果点击的是当前预览的文件，则关闭预览
    if (previewFileId === file.id) {
      setPreviewFileId(null);
      setPreviewPages([]);
      return;
    }

    setPreviewFileId(file.id);
    setLoadingPages(true);
    setPreviewPages([]);

    try {
      // @ts-ignore
      const result = await window.electronAPI.getAllPages(file.path);
      if (result && result.pages && !result.error) {
        setPreviewPages(result.pages);
      } else {
        console.error("获取页面预览失败:", result.error);
        setPreviewPages([]);
      }
    } catch (err) {
      console.error("预览错误:", err);
      setPreviewPages([]);
    } finally {
      setLoadingPages(false);
    }
  };

  const handleAddFiles = async (idx = -1) => {
    if (isMerging) return;
    // @ts-ignore
    const paths = await window.electronAPI.openFile();
    if (paths) processNewFiles(paths, idx);
  };

  const handleMerge = async () => {
    if (files.length < 2) return alert("请至少添加两个文件");
    try {
      // @ts-ignore
      const outPath = await window.electronAPI.saveFile();
      if (!outPath) return;
      setIsMerging(true);
      setIsFinishing(false);
      setProgress(0);
      displayProgressRef.current = 0;
      const paths = sortedFiles.map((f) => f.path);
      // @ts-ignore
      const result = await window.electronAPI.startMerge(paths, outPath);
      if (result) {
        setIsFinishing(true);
        let currentTick = 0;
        const totalTicks = 80;
        const startValue = displayProgressRef.current;
        const range = 100 - startValue;
        finishTimerRef.current = setInterval(() => {
          currentTick++;
          const smoothProgress =
            startValue + range * (currentTick / totalTicks);
          setProgress(Math.min(99.9, smoothProgress));
          if (currentTick >= totalTicks) {
            if (finishTimerRef.current) clearInterval(finishTimerRef.current);
            setFinalPath(outPath);
            setShowSuccess(true);
            setIsMerging(false);
            setIsFinishing(false);
          }
        }, 80);
      } else {
        setIsMerging(false);
      }
    } catch (err) {
      setIsMerging(false);
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa] font-sans text-slate-700 select-none overflow-x-hidden">
      <header className="bg-gradient-to-r from-[#2c3e50] to-[#4a6491] text-white px-8 py-6 shadow-lg flex justify-between items-center relative z-[100]">
        <div className="flex items-center gap-3">
          <FilePdf size={36} weight="fill" className="text-[#ff6b6b]" />
          <h1 className="text-2xl font-bold tracking-tight">我的超级合并器</h1>
        </div>
      </header>

      <main
        className="max-w-7xl mx-auto p-6 relative"
        onDragLeave={() => setDragIndex(null)}
      >
        {/* 工具栏 */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6 flex justify-between items-center border border-slate-100">
          <div className="flex items-center gap-3">
            <ArrowsDownUp size={20} className="text-blue-500" />
            <span className="font-bold text-sm">排序方式：</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none cursor-pointer"
            >
              <option value="default">默认排序</option>
              <option value="name">文件名</option>
              <option value="size">文件大小</option>
            </select>
          </div>
          <button
            onClick={() => setFiles([])}
            className="flex items-center gap-2 px-5 py-2.5 text-slate-500 hover:bg-red-50 hover:text-red-500 rounded-lg font-bold transition-all"
          >
            <Broom size={20} /> 清空列表
          </button>
        </div>

        {/* 开始按钮 */}
        <div className="mb-10">
          <button
            onClick={handleMerge}
            className="w-full flex items-center justify-center gap-3 py-4 bg-[#5c6bc0] text-white rounded-xl shadow-lg hover:bg-[#3f51b5] transition-all font-bold text-lg active:scale-[0.99]"
          >
            <Stack size={24} /> 开始合并 PDF
          </button>
        </div>

        {/* 文件展示区域 */}
        <div className="w-full">
          <div className="flex flex-wrap gap-y-10 items-start justify-start min-h-[300px] pb-24">
            {/* 为空时的引导 */}
            {files.length === 0 && (
              <div
                className="relative"
                onDragOver={(e) => onZoneDragOver(e, 0)}
                onDrop={(e) => onZoneDrop(e, 0)}
              >
                {dragIndex === 0 && (
                  <div className="absolute -left-4 top-0 bottom-0 w-1.5 bg-blue-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.6)] z-50 animate-pulse" />
                )}
                <div
                  onClick={() => handleAddFiles()}
                  className={`w-52 aspect-[3/4.6] bg-white border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer group ${
                    dragIndex === 0
                      ? "border-blue-500 bg-blue-50/50 scale-[1.02]"
                      : "border-slate-200 hover:border-blue-400 hover:bg-blue-50/20"
                  }`}
                >
                  <Plus
                    size={24}
                    className="text-blue-500 mb-4 group-hover:scale-110 transition-transform"
                    weight="bold"
                  />
                  <p className="text-slate-400 font-bold text-[14px] leading-relaxed px-2 ">
                    点击添加 PDF文件 
                  </p>
                </div>
              </div>
            )}

            {sortedFiles.map((file, idx) => (
              <React.Fragment key={file.id}>
                <div
                  className="relative flex items-center"
                  onDragOver={(e) => onZoneDragOver(e, idx)}
                  onDrop={(e) => onZoneDrop(e, idx)}
                >
                  {/* 蓝色插入指示线 */}
                  {dragIndex === idx && draggedItemIndex !== idx && (
                    <div className="absolute -left-[12px] top-4 bottom-4 w-1.5 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)] z-50 animate-pulse" />
                  )}

                  <div 
                    className={`group relative w-52 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-xl transition-all ${
                      draggedItemIndex === idx ? "opacity-50 cursor-move" : "cursor-grab active:cursor-grabbing"
                    }`}
                    draggable={!isMerging}
                    onDragStart={(e) => onFileDragStart(e, idx)}
                    onDragEnd={onFileDragEnd}
                  >
                    <div className="absolute -top-3 -left-3 z-10 w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-black border-2 border-white">
                      {idx + 1}
                    </div>
                    <div className="absolute top-3 right-3 z-10 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 bg-white rounded-full shadow-md text-emerald-500 hover:bg-emerald-50">
                        <MagnifyingGlassPlus size={18} weight="bold" />
                      </button>
                      <button
                        onClick={() =>
                          setFiles(files.filter((f) => f.id !== file.id))
                        }
                        className="p-1.5 bg-white rounded-full shadow-md text-red-500 hover:bg-red-50"
                      >
                        <Trash size={18} weight="bold" />
                      </button>
                    </div>
                    <div className="aspect-[3/4] bg-slate-50 rounded-xl overflow-hidden mb-4 flex items-center justify-center border border-slate-50">
                      {file.preview ? (
                        <img
                          src={file.preview}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FilePdf size={48} className="opacity-10" />
                      )}
                    </div>
                    <div className="text-center px-1">
                      <h4 className="text-xs font-bold text-slate-700 truncate">
                        {file.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                        {file.pages} 页 · {file.size}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 卡片间的加号与线 */}
                {idx < sortedFiles.length - 1 ? (
                  <div className="w-10 self-stretch flex items-center justify-center group/insert relative">
                    <div className="absolute inset-y-0 w-[1px] bg-slate-200 group-hover/insert:bg-blue-300 transition-colors" />
                    <button
                      onClick={() => handleAddFiles(idx + 1)}
                      className="z-10 w-7 h-7 bg-[#f5f7fa] border border-slate-200 text-slate-400 rounded-full flex items-center justify-center hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm group-hover/insert:scale-110"
                    >
                      <Plus size={14} weight="bold" />
                    </button>
                  </div>
                ) : (
                  <div className="w-10" />
                )}
              </React.Fragment>
            ))}

            {/* 末尾感应区 */}
            {sortedFiles.length > 0 && (
              <div
                className="relative"
                onDragOver={(e) => onZoneDragOver(e, sortedFiles.length)}
                onDrop={(e) => onZoneDrop(e, sortedFiles.length)}
              >
                {dragIndex === sortedFiles.length && (
                  <div className="absolute -left-[12px] top-4 bottom-4 w-1.5 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)] z-50 animate-pulse" />
                )}
                <div
                  onClick={() => handleAddFiles()}
                  className={`w-52 aspect-[3/4.6] bg-white border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:border-blue-400 hover:bg-blue-50/20 transition-all cursor-pointer group ${
                    dragIndex === sortedFiles.length
                      ? "border-blue-500 bg-blue-50/50"
                      : ""
                  }`}
                >
                  <Plus
                    size={24}
                    className="text-blue-500 mb-4 group-hover:scale-110 transition-transform"
                    weight="bold"
                  />
                  <p className="text-slate-400 font-bold text-[11px] leading-relaxed px-2">
                    拖拽文件添加至末尾
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 进度弹窗与成功反馈 (逻辑同前，保持稳定) */}
      {isMerging && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-white/40 backdrop-blur-md" />
          <div className="relative bg-white/90 rounded-[2.5rem] p-12 w-full max-w-xl shadow-2xl border border-white text-center animate-in zoom-in-95">
            <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-spin-slow">
              <ArrowClockwise size={40} weight="bold" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">
              {isFinishing ? "正在收尾..." : "合并中..."}
            </h3>
            <div className="space-y-4 mt-8">
              <div className="flex justify-between text-sm font-black text-blue-600">
                <span>进度</span>
                <span>{Math.floor(progress)}%</span>
              </div>
              <div className="w-full bg-slate-200/50 h-4 rounded-full overflow-hidden p-1">
                <div
                  className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <button
              disabled={isFinishing}
              onClick={() => {
                if (finishTimerRef.current)
                  clearInterval(finishTimerRef.current);
                setIsMerging(false);
              }}
              className="mt-10 text-red-500 font-bold"
            >
              取消合并
            </button>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowSuccess(false)}
          />
          <div className="relative bg-white rounded-3xl p-10 w-full max-w-lg shadow-2xl text-center animate-in zoom-in-95">
            <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={56} weight="fill" />
            </div>
            <h3 className="text-2xl font-black mb-2">合并成功！</h3>
            <div
              className="bg-slate-50 rounded-2xl border p-6 mb-8 min-h-[110px] flex items-center justify-center relative group"
              onMouseEnter={() => setIsHoverPath(true)}
              onMouseLeave={() => setIsHoverPath(false)}
            >
              <div
                className={`text-blue-600 font-bold break-all text-xs transition-all ${
                  isHoverPath ? "opacity-0 scale-90" : "opacity-100"
                }`}
              >
                {finalPath}
              </div>
              <div
                className={`absolute flex gap-3 transition-all ${
                  isHoverPath
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4 pointer-events-none"
                }`}
              >
                <button
                  onClick={() =>
                    (window as any).electronAPI.openFolder(finalPath)
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold"
                >
                  跳转文件夹
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(finalPath);
                    setCopySuccess(true);
                    setTimeout(() => setCopySuccess(false), 2000);
                  }}
                  className="px-4 py-2 bg-white border rounded-lg text-sm font-bold"
                >
                  {copySuccess ? "已复制" : "复制路径"}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowSuccess(false);
                  setFiles([]);
                }}
                className="w-full py-4 bg-slate-800 text-white rounded-xl font-bold"
              >
                完成并清空
              </button>
              <button
                onClick={() => setShowSuccess(false)}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold"
              >
                继续编辑
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .animate-spin-slow { animation: spin 3s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
