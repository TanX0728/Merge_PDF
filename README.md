# PDF 合并器

一个高性能的 PDF 文件合并桌面应用，支持大文件处理和可视化预览。

## 功能特性

- 📄 拖拽添加 PDF 文件
- 🔄 拖拽重排序文件
- 👁️ PDF 文件预览
- 📊 合并进度显示
- 🎨 现代化的用户界面

## 技术栈

### 前端
- **Electron** - 桌面应用框架
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **TailwindCSS** - 样式框架
- **Phosphor Icons** - 图标库

### 后端
- **Python** - 核心处理逻辑
- **PyMuPDF (fitz)** - PDF 处理库

## 项目结构

```
mergepdf/
├── main.js              # Electron 主进程
├── preload.js           # 预加载脚本
├── core/
│   └── merger.py        # PDF 处理核心逻辑
├── gui/                 # 前端应用
│   ├── src/
│   │   ├── App.tsx      # 主应用组件
│   │   └── components/  # UI 组件
│   └── package.json
└── package.json         # 根配置文件
```

## 快速开始

### 环境要求

- Node.js >= 16
- Python 3.x
- PyMuPDF 库

### 安装依赖

```bash
# 安装根目录依赖
npm install

# 安装前端依赖
cd gui
npm install
cd ..
```

### 安装 Python 依赖

```bash
pip install PyMuPDF
```

### 启动项目

```bash
# 同时启动前端开发服务器和 Electron 应用
npm run start
```

或分别启动：

```bash
# 终端1: 启动前端开发服务器
npm run gui:dev

# 终端2: 启动 Electron 应用
npm run dev
```

## 使用说明

1. **添加文件**: 拖拽 PDF 文件到应用窗口，或点击添加按钮
2. **调整顺序**: 拖拽文件卡片可以重新排序
3. **开始合并**: 点击"开始合并 PDF"按钮，选择保存位置
4. **查看进度**: 合并过程中会显示实时进度
5. **完成**: 合并完成后可以跳转到保存文件夹

## 开发命令

- `npm run start` - 启动完整应用（前端 + Electron）
- `npm run gui:dev` - 仅启动前端开发服务器
- `npm run dev` - 仅启动 Electron 应用

## 注意事项

- 单个文件最大支持 10GB
- 所有处理在本地完成，不上传服务器
- 开发模式下需要同时运行前端服务器和 Electron

