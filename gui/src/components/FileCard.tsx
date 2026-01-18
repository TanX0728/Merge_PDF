import { Trash2, ZoomIn } from 'lucide-react';

interface FileCardProps {
  file: { name: string; preview: string; pages: number; size: string; index: number };
  onDelete: () => void;
}

export const FileCard = ({ file, onDelete }: FileCardProps) => {
  return (
    <div className="group relative w-48 bg-white rounded-xl p-3 shadow-sm border border-transparent hover:border-blue-500 transition-all">
      {/* 序号标牌 */}
      <div className="absolute top-2 left-2 z-10 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
        {file.index + 1}
      </div>

      {/* 封面预览区域 */}
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-slate-100">
        <img 
          src={`data:image/png;base64,${file.preview}`} 
          className="w-full h-full object-cover" 
          alt="preview" 
        />
        {/* Hover 遮罩层 (图六效果) */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button className="p-2 bg-white rounded-full hover:bg-slate-100 text-slate-600 shadow-lg">
            <ZoomIn size={18} />
          </button>
          <button 
            onClick={onDelete}
            className="p-2 bg-white rounded-full hover:bg-red-50 text-red-500 shadow-lg"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* 文件信息 */}
      <div className="mt-3 text-center">
        <p className="text-sm font-medium truncate text-slate-700">{file.name}</p>
        <p className="text-xs text-slate-400 mt-1">共 {file.pages} 页</p>
        <p className="text-xs text-slate-400">{file.size}</p>
      </div>
    </div>
  );
};