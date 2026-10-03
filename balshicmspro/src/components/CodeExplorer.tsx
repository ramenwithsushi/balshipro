import React, { useState } from 'react';
import { FileCode2, Copy, Check, Download, FileText, ExternalLink } from 'lucide-react';
import { CODE_FILES, CodeFile } from '../data/codeFiles';

export const CodeExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<CodeFile>(CODE_FILES[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (file: CodeFile) => {
    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    CODE_FILES.forEach((f, idx) => {
      setTimeout(() => handleDownload(f), idx * 250);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div>
          <h3 className="text-base font-semibold text-slate-100">Production Codebase & Architecture</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Four standalone, clean Python modules adhering strictly to the user prompt constraints.
          </p>
        </div>
        <button
          onClick={handleDownloadAll}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg text-xs flex items-center gap-2 transition"
        >
          <Download className="w-4 h-4" />
          <span>Download All Files (.py, .md, .txt)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* File List */}
        <div className="lg:col-span-4 space-y-2">
          {CODE_FILES.map((file) => {
            const isSelected = selectedFile.filename === file.filename;
            return (
              <button
                key={file.filename}
                onClick={() => setSelectedFile(file)}
                className={`w-full text-left p-3 rounded-xl border transition flex items-start gap-3 ${
                  isSelected
                    ? 'bg-slate-850 border-amber-500/50 ring-1 ring-amber-500/30'
                    : 'bg-slate-900 border-slate-850 hover:border-slate-700'
                }`}
              >
                {file.filename.endsWith('.py') ? (
                  <FileCode2 className={`w-5 h-5 mt-0.5 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                ) : (
                  <FileText className={`w-5 h-5 mt-0.5 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-mono font-medium ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                      {file.filename}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">
                      {file.language}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {file.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Code Content Viewer */}
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-amber-400">
                {selectedFile.filename}
              </span>
              <span className="text-xs text-slate-500">({selectedFile.description})</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition border border-slate-700"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>

              <button
                onClick={() => handleDownload(selectedFile)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition border border-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>

          <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto overflow-y-auto max-h-[600px] leading-relaxed bg-slate-950">
            <code>{selectedFile.content}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
