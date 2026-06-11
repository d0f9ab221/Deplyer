import React, { useState } from 'react';
import { Github, Send, ExternalLink, Loader2, CheckCircle2, Key, Shield, ShieldAlert, Sparkles } from 'lucide-react';
import { DeployState, FileItem } from '../types';

interface DeployPanelProps {
  files: FileItem[];
  onDeploy: (config: {
    token: string;
    repoName: string;
    description: string;
    isPrivate: boolean;
  }) => Promise<void>;
  deployState: DeployState;
  onResetDeploy: () => void;
}

export default function DeployPanel({
  files,
  onDeploy,
  deployState,
  onResetDeploy,
}: DeployPanelProps) {
  const defaultToken = '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';
  
  const [token, setToken] = useState(defaultToken);
  const [repoName, setRepoName] = useState('instant-web-app');
  const [description, setDescription] = useState('A beautiful responsive web app created and pushed via Web Deployer System');
  const [isPrivate, setIsPrivate] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return alert('Please specify a GitHub Access Token first.');
    if (!repoName.trim()) return alert('Please specify a Repository Name.');
    
    const cleanedName = repoName.trim().replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    
    onDeploy({
      token: token.trim(),
      repoName: cleanedName,
      description: description.trim(),
      isPrivate,
    });
  };

  const isDeploying = deployState.status !== 'idle' && deployState.status !== 'success' && deployState.status !== 'error';

  return (
    <div className="bg-[#FDFCFB] border-2 border-[#1A1A1A] rounded-none shadow-sm overflow-hidden" id="workspace-deploy-panel">
      {/* Top Header */}
      <div className="p-4 border-b-2 border-[#1A1A1A] flex items-center justify-between bg-[#F2F1EE]">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#1A1A1A] flex items-center space-x-2">
          <Github className="w-4 h-4 text-[#1A1A1A]" />
          <span>GitHub Publisher</span>
        </h3>
        
        <span className="bg-white border border-[#1A1A1A] text-[#1A1A1A] text-[9px] font-mono px-2 py-0.5 rounded-none font-bold flex items-center space-x-1 uppercase">
          <Shield className="w-3 h-3 text-[#FF4D00]" />
          <span>v2 Core</span>
        </span>
      </div>

      <div className="p-5">
        {deployState.status === 'success' ? (
          /* Deployment Success View */
          <div className="text-center py-6 px-4 space-y-4" id="deploy-success-view">
            <div className="mx-auto w-12 h-12 bg-[#F2F1EE] border-2 border-[#1A1A1A] rounded-none flex items-center justify-center text-[#FF4D00]">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-mono font-bold uppercase tracking-widest text-slate-800">Deployment Succeeded</h4>
              <p className="text-xs font-serif italic text-slate-500 max-w-sm mx-auto leading-relaxed">
                Your static repository files have been packed and fast-forward committed to GitHub successfully.
              </p>
            </div>

            <div className="p-4 bg-white border-2 border-[#1A1A1A] rounded-none space-y-3 font-mono text-[11px] text-[#1A1A1A]">
              <div className="flex items-center justify-between">
                <span className="opacity-60">REPO PATH:</span>
                <a
                  id="success-repo-url"
                  href={deployState.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold underline text-[#FF4D00] flex items-center space-x-1 truncate max-w-[180px]"
                >
                  <span className="truncate">{deployState.repoUrl?.replace('https://', '')}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
              
              {deployState.pagesUrl && (
                <div className="flex items-center justify-between border-t border-[#E0DED7] pt-2.5">
                  <span className="opacity-60">LIVE PAGES:</span>
                  <a
                    id="success-pages-url"
                    href={deployState.pagesUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold underline text-[#FF4D00] flex items-center space-x-1 truncate max-w-[180px]"
                  >
                    <span className="truncate">{deployState.pagesUrl?.replace('https://', '')}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              )}
            </div>

            <div className="text-[10px] text-slate-500 font-mono leading-normal max-w-sm mx-auto p-3 bg-[#F2F1EE] border border-[#E0DED7] rounded-none flex items-start space-x-2 text-left">
              <Sparkles className="w-4 h-4 text-[#FF4D00] shrink-0 mt-0.5" />
              <span>
                GitHub Pages may take 1-2 minutes to spin up for a new repository. Click the URL to monitor deployment or simply refresh.
              </span>
            </div>

            <button
              id="deploy-another-btn"
              onClick={onResetDeploy}
              className="mt-4 px-4 py-2 bg-[#1A1A1A] text-white hover:bg-[#FF4D00] rounded-none font-mono text-[10px] font-bold uppercase transition"
            >
              Deploy Another Update
            </button>
          </div>
        ) : deployState.status === 'error' ? (
          /* Error State View */
          <div className="text-center py-6 px-4 space-y-4" id="deploy-error-view">
            <div className="mx-auto w-12 h-12 bg-rose-50 border-2 border-rose-200 rounded-none flex items-center justify-center text-rose-500 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-mono font-bold uppercase text-slate-800 tracking-wider">Deployment Blocked</h4>
              <p className="text-[11px] text-rose-600 font-mono px-4 py-2 bg-rose-50 border border-rose-100 rounded-none max-w-xs mx-auto overflow-hidden text-ellipsis break-all leading-normal">
                {deployState.error || 'Check authorization scope parameters.'}
              </p>
            </div>

            <div className="flex items-center justify-center space-x-3 mt-4">
              <button
                id="deploy-back-btn"
                onClick={onResetDeploy}
                className="px-4 py-1.5 border-2 border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#F2F1EE] rounded-none font-mono text-[10px] font-bold uppercase transition"
              >
                Go Back
              </button>
            </div>
          </div>
        ) : isDeploying ? (
          /* Ongoing Deployment Progress Loader */
          <div className="py-10 text-center space-y-4" id="deploy-progress-view">
            <div className="flex justify-center">
              <Loader2 className="w-8 h-8 text-[#FF4D00] animate-spin" />
            </div>
            <div className="space-y-1.5">
              <p className="font-mono font-bold text-[#1A1A1A] text-xs uppercase tracking-widest">
                {deployState.status.replace('_', ' ')}
              </p>
              <p className="text-[11px] font-serif italic text-slate-500 max-w-xs mx-auto animate-pulse">
                {deployState.message}
              </p>
            </div>
          </div>
        ) : (
          /* Standard Configuration Form */
          <form onSubmit={handleFormSubmit} className="space-y-4" id="deploy-config-form">
            {/* Access Token input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A]/70 flex items-center space-x-1">
                  <Key className="w-3.5 h-3.5 text-slate-400" />
                  <span>GitHub Access Token</span>
                </label>
                <button
                  id="toggle-token-btn"
                  type="button"
                  onClick={() => setShowTokenInput(!showTokenInput)}
                  className="text-[10px] font-mono font-bold uppercase text-[#FF4D00] hover:underline focus:outline-none"
                >
                  {showTokenInput ? 'Mask' : 'Reveal'}
                </button>
              </div>
              <input
                id="github-token-input"
                type={showTokenInput ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_..."
                className="w-full bg-white border-2 border-[#1A1A1A] rounded-none py-2 px-3 text-xs focus:ring-none focus:border-[#FF4D00] outline-none font-mono text-[#1A1A1A]"
                required
              />
              <p className="text-[10px] text-slate-500 font-serif italic leading-snug">
                Configured with default active token. Ensure scope includes <code className="font-mono bg-[#F2F1EE] p-0.5 border border-[#E0DED7] font-bold text-[#FF4D00]">repo</code> permissions.
              </p>
            </div>

            {/* Repositories Setup Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A]/70 block">Repository Title</label>
                <input
                  id="github-repo-name-input"
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="my-static-web"
                  className="w-full bg-white border-2 border-[#1A1A1A] rounded-none py-2 px-3 text-xs focus:ring-none focus:border-[#FF4D00] outline-none font-mono text-[#1A1A1A]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A]/70 flex justify-between">
                  <span>Privacy</span>
                </label>
                <select
                  id="github-privacy-select"
                  value={isPrivate ? 'private' : 'public'}
                  onChange={(e) => setIsPrivate(e.target.value === 'private')}
                  className="w-full bg-white border-2 border-[#1A1A1A] rounded-none py-2 px-3 text-xs focus:ring-none focus:border-[#FF4D00] outline-none text-[#1A1A1A] font-mono"
                >
                  <option value="public">🌍 Public (Requires Pages)</option>
                  <option value="private">🔒 Private (Raw Repo)</option>
                </select>
              </div>
            </div>

            {/* repo desc */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A]/70 block">Repository Metadata Description</label>
              <textarea
                id="github-description-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a brief description..."
                rows={2}
                className="w-full bg-white border-2 border-[#1A1A1A] rounded-none py-2 px-3 text-xs focus:ring-none focus:border-[#FF4D00] outline-none text-[#1A1A1A] font-serif italic"
              />
            </div>

            {/* Trigger Button */}
            <button
              id="deploy-submit-btn"
              type="submit"
              disabled={files.length === 0}
              className={`w-full py-3 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider border-2 transition duration-200 flex items-center justify-center space-x-2 ${
                files.length === 0
                  ? 'bg-transparent border-[#1A1A1A]/10 text-[#1A1A1A]/20 cursor-not-allowed'
                  : 'bg-[#FF4D00] border-[#FF4D00] text-white hover:bg-[#1A1A1A] hover:border-[#1A1A1A] cursor-pointer'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Compile and Push to GitHub Live</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

