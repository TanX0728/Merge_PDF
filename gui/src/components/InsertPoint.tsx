import { PlusCircle } from 'lucide-react';

export const InsertPoint = ({ onInsert }: { onInsert: () => void }) => {
  return (
    <div className="group relative flex items-center justify-center w-8 h-full">
      {/* 垂直分割线 */}
      <div className="w-[1px] h-32 bg-slate-200 group-hover:bg-blue-300 transition-colors" />
      
      {/* 悬浮显示的 + 号按钮 (图五效果) */}
      <button 
        onClick={onInsert}
        className="absolute z-20 p-1 bg-white border border-slate-200 text-slate-400 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110 hover:text-blue-500 hover:border-blue-500 shadow-sm"
      >
        <PlusCircle size={20} fill="currentColor" className="text-white fill-blue-500" />
      </button>
    </div>
  );
};