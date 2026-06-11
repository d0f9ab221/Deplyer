export interface FileItem {
  path: string;
  content: string;
  isBinary: boolean;
  mimeType?: string;
  size?: number;
}

export interface DeployState {
  status: 'idle' | 'preparing' | 'creating_repo' | 'pushing' | 'enabling_pages' | 'success' | 'error';
  message: string;
  repoUrl?: string;
  pagesUrl?: string;
  error?: string;
}

export interface FileTreeItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children?: FileTreeItem[];
}
