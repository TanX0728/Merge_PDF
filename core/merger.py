import sys
import json
import fitz  # PyMuPDF
import base64
import os

def get_file_info(file_path):
    """获取PDF详细信息及预览图"""
    try:
        stats = os.stat(file_path)
        size_mb = round(stats.st_size / (1024 * 1024), 1)
        
        doc = fitz.open(file_path)
        page_count = doc.page_count
        
        # 生成预览图
        page = doc.load_page(0)
        pix = page.get_pixmap(matrix=fitz.Matrix(0.15, 0.15)) # 进一步压缩保证前端流畅
        img_data = base64.b64encode(pix.tobytes("png")).decode("utf-8")
        
        doc.close()
        return {
            "preview": img_data,
            "pages": page_count,
            "size": f"{size_mb} MB",
            "path": file_path,
            "name": os.path.basename(file_path)
        }
    except Exception as e:
        return {"error": str(e)}

def merge_pdfs(paths, output_path):
    """流式合并大文件"""
    result = fitz.open()
    for i, path in enumerate(paths):
        with fitz.open(path) as src:
            result.insert_pdf(src)
        # 实时进度
        print(json.dumps({"type": "progress", "value": int(((i+1)/len(paths))*100)}))
        sys.stdout.flush()
    
    result.save(output_path, garbage=3, deflate=True)
    result.close()
    print(json.dumps({"type": "success", "path": output_path}))

if __name__ == "__main__":
    args = sys.argv
    if args[1] == "info":
        print(json.dumps(get_file_info(args[2])))
    elif args[1] == "merge":
        merge_pdfs(json.loads(args[2]), args[3])