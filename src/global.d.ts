export interface IElectronAPI {
  openFile: () => Promise<string[]>;
  saveFile: () => Promise<string>;
  getPreview: (path: string) => Promise<any>;
  startMerge: (paths: string[], outPath: string) => Promise<boolean>;
  onProgress: (callback: (value: number) => void) => void;
  openFolder: (path: string) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}