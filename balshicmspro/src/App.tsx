import React, { useState, useEffect } from 'react';
import templateOverlayUrl from './balshitemplate.png';
import {
  Layers,
  Database,
  Terminal,
  FileCode2,
  Key,
  Instagram,
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Download,
  AlertCircle
} from 'lucide-react';
import { GraphicStudio } from './components/GraphicStudio';
import { CmsQueue } from './components/CmsQueue';
import { PublisherRunner } from './components/PublisherRunner';
import { CodeExplorer } from './components/CodeExplorer';
import { SetupGuide } from './components/SetupGuide';
import { PostItem } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'studio' | 'queue' | 'publisher' | 'code' | 'setup'>('studio');
  const [templateLoaded, setTemplateLoaded] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  // Preload master template overlay (balshitemplate.png)
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setTemplateLoaded(true);
      setTemplateError(null);
    };
    img.onerror = () => {
      setTemplateLoaded(false);
      setTemplateError("Error: Failed to load balshitemplate.png");
    };
    img.src = templateOverlayUrl || '/balshitemplate.png';
  }, []);

  // Initial Sample Posts in SQLite WAL state
  const [posts, setPosts] = useState<PostItem[]>([
    {
      id: 1,
      title: 'Audience Architecture & Longevity',
      image_path: 'ready/balshi_1774029300_1.jpg',
      caption: 'The best creators do not compete on volume. They build unforgettable perspectives and articulate what others merely feel.\n\n#balshi #craftsmanship #creatorgrowth',
      post_timestamp: Math.floor(Date.now() / 1000) + 1800, // Due in 30 mins
      status: 'Scheduled',
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      title: 'Masterclass: Zero-Cost Automation Frameworks',
      image_path: 'published/balshi_1773992400_2.jpg',
      caption: 'Why pay monthly SaaS subscriptions when Python, SQLite WAL, and Graph API can give you complete sovereign distribution?\n\n#balshi #automation #indiecreator',
      post_timestamp: Math.floor(Date.now() / 1000) - 3600 * 24, // Yesterday
      status: 'Posted',
      created_at: new Date(Date.now() - 3600 * 24 * 1000).toISOString(),
    }
  ]);

  const handleSchedulePost = (newPostData: Omit<PostItem, 'id' | 'status'>) => {
    const newId = posts.length > 0 ? Math.max(...posts.map((p) => p.id)) + 1 : 1;
    const newPost: PostItem = {
      ...newPostData,
      id: newId,
      status: 'Scheduled',
    };
    setPosts((prev) => [newPost, ...prev]);
  };

  const handleCompletePost = (postId: number) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, status: 'Posted', image_path: `published/${p.image_path.split('/').pop()}` }
          : p
      )
    );
  };

  const handleDeletePost = (postId: number) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const scheduledCount = posts.filter((p) => p.status === 'Scheduled').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Top Application Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
              B
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white">BALSHI</h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                  Creator CMS
                </span>
              </div>
              <p className="text-[11px] text-slate-400">100% Local • SQLite WAL • Instagram Graph API v21.0</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 rounded-lg border border-slate-700 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Canvas: 1170 × 1463 px</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 rounded-lg border border-slate-700 text-slate-300">
              <Database className="w-3.5 h-3.5 text-sky-400" />
              <span>SQLite WAL</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 rounded-lg border border-slate-700 text-slate-300">
              <Instagram className="w-3.5 h-3.5 text-pink-400" />
              <span>@balshi</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto no-scrollbar space-x-1 border-t border-slate-800/60 pt-1 pb-1">
          <button
            onClick={() => setActiveTab('studio')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-lg transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'studio'
                ? 'bg-slate-800 text-amber-300 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span>WYSIWYG Studio (1170x1463)</span>
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-lg transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'queue'
                ? 'bg-slate-800 text-amber-300 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Database className="w-4 h-4 text-sky-400" />
            <span>SQLite Queue & Archive</span>
            {scheduledCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded text-[10px] font-mono">
                {scheduledCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('publisher')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-lg transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'publisher'
                ? 'bg-slate-800 text-amber-300 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Graph API Publisher Daemon</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-lg transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'code'
                ? 'bg-slate-800 text-amber-300 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <FileCode2 className="w-4 h-4 text-purple-400" />
            <span>Python Codebase (4 Files)</span>
          </button>

          <button
            onClick={() => setActiveTab('setup')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-lg transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'setup'
                ? 'bg-slate-800 text-amber-300 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Key className="w-4 h-4 text-amber-400" />
            <span>Credentials & .env Setup</span>
          </button>
        </div>
      </header>

      {/* Main Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {templateError && (
          <div id="template-error-banner" className="mb-6 p-4 rounded-xl bg-red-950/90 border-2 border-red-500 text-red-200 flex items-center gap-3 text-sm font-bold shadow-lg">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{templateError}</span>
          </div>
        )}

        {activeTab === 'studio' && (
          <GraphicStudio
            onSchedulePost={handleSchedulePost}
            templateOverlayUrl={templateOverlayUrl}
            templateError={templateError}
          />
        )}

        {activeTab === 'queue' && (
          <CmsQueue
            posts={posts}
            onTriggerPublish={(post) => {
              setActiveTab('publisher');
            }}
            onDeletePost={handleDeletePost}
          />
        )}

        {activeTab === 'publisher' && (
          <PublisherRunner
            scheduledPosts={posts.filter((p) => p.status === 'Scheduled')}
            onCompletePost={handleCompletePost}
          />
        )}

        {activeTab === 'code' && <CodeExplorer />}

        {activeTab === 'setup' && <SetupGuide />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Balshi Instagram CMS</span>
            <span>—</span>
            <span>Zero-cost, local-first publishing pipeline</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>app.py</span>
            <span>•</span>
            <span>graphics.py</span>
            <span>•</span>
            <span>database.py</span>
            <span>•</span>
            <span>publisher.py</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
