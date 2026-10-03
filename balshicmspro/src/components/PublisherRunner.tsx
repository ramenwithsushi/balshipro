import React, { useState } from 'react';
import { Play, CheckCircle2, Loader2, AlertTriangle, ShieldCheck, Terminal, ArrowRight, RotateCcw } from 'lucide-react';
import { PostItem, PublisherStep } from '../types';

interface PublisherRunnerProps {
  scheduledPosts: PostItem[];
  onCompletePost: (postId: number) => void;
}

const INITIAL_STEPS: PublisherStep[] = [
  {
    id: 1,
    name: 'Threaded Local HTTP Server',
    detail: 'Spawn daemon thread serving /ready/ directory on 127.0.0.1:8088',
    status: 'pending',
  },
  {
    id: 2,
    name: 'Ngrok Tunnel with Static Domain',
    detail: 'Expose local port using pyngrok (Static Domain bypasses Meta crawler interstitial warning)',
    status: 'pending',
  },
  {
    id: 3,
    name: 'Media Container Creation',
    detail: 'POST https://graph.facebook.com/v21.0/{ig_user_id}/media with image_url & caption',
    endpoint: 'POST /v21.0/{ig_user_id}/media',
    status: 'pending',
  },
  {
    id: 4,
    name: 'Container Status Polling',
    detail: 'GET https://graph.facebook.com/v21.0/{container_id}?fields=status_code until FINISHED',
    endpoint: 'GET /v21.0/{container_id}?fields=status_code',
    status: 'pending',
  },
  {
    id: 5,
    name: 'Instagram Media Publish',
    detail: 'POST https://graph.facebook.com/v21.0/{ig_user_id}/media_publish with creation_id',
    endpoint: 'POST /v21.0/{ig_user_id}/media_publish',
    status: 'pending',
  },
  {
    id: 6,
    name: 'Teardown & SQLite Status Update',
    detail: 'Close tunnel, shutdown HTTP daemon, move JPEG to /published/, update status to Posted',
    status: 'pending',
  },
];

export const PublisherRunner: React.FC<PublisherRunnerProps> = ({
  scheduledPosts,
  onCompletePost,
}) => {
  const [steps, setSteps] = useState<PublisherStep[]>(INITIAL_STEPS);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    '[INIT] Publisher daemon initialized. Schedule frequency: 60s.',
    '[DB] Connected to balshi_posts.db in WAL journal mode.',
  ]);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(
    scheduledPosts[0]?.id || null
  );

  const activePost = scheduledPosts.find((p) => p.id === selectedPostId) || scheduledPosts[0];

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${msg}`]);
  };

  const runSimulation = async () => {
    if (!activePost) {
      alert('No scheduled post selected to publish.');
      return;
    }
    setIsRunning(true);
    setSteps(INITIAL_STEPS);

    const updateStep = (id: number, status: PublisherStep['status'], logMsg?: string) => {
      setSteps((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status, log: logMsg } : s))
      );
      if (logMsg) addLog(logMsg);
    };

    try {
      // Step 1: Threaded Server
      updateStep(1, 'active', `Spawning non-blocking SimpleHTTPRequestHandler on port 8088 serving ${activePost.image_path}...`);
      await new Promise((r) => setTimeout(r, 1200));
      updateStep(1, 'completed', 'Threaded server running in background daemon thread (server_thread.start())');

      // Step 2: Ngrok Tunnel
      updateStep(2, 'active', 'Connecting pyngrok with Static Domain configuration (balshi-creator.ngrok-free.app)...');
      await new Promise((r) => setTimeout(r, 1400));
      const exposedUrl = `https://balshi-creator.ngrok-free.app/${activePost.image_path.split('/').pop()}`;
      updateStep(2, 'completed', `Public image exposed to Meta crawler: ${exposedUrl}`);

      // Step 3: Container Creation
      updateStep(3, 'active', `Calling Graph API v21.0: POST https://graph.facebook.com/v21.0/178414001928374/media`);
      await new Promise((r) => setTimeout(r, 1600));
      const mockContainerId = '18029384918239012';
      updateStep(3, 'completed', `Media container created successfully. container_id: ${mockContainerId}`);

      // Step 4: Polling
      updateStep(4, 'active', `Polling status for container ${mockContainerId} every 5 seconds...`);
      await new Promise((r) => setTimeout(r, 1500));
      addLog(`[Poll #1] Container ${mockContainerId} status: IN_PROGRESS`);
      await new Promise((r) => setTimeout(r, 1200));
      updateStep(4, 'completed', `[Poll #2] Container ${mockContainerId} status: FINISHED (Processing completed by Meta)`);

      // Step 5: Publish
      updateStep(5, 'active', `Publishing container to @balshi feed: POST /v21.0/178414001928374/media_publish`);
      await new Promise((r) => setTimeout(r, 1500));
      const mockIgPostId = '18392019482910394';
      updateStep(5, 'completed', `🎉 Successfully posted to Instagram! Instagram Media ID: ${mockIgPostId}`);

      // Step 6: Cleanup
      updateStep(6, 'active', 'Executing teardown: ngrok.disconnect(), httpd.shutdown(), shutil.move(), SQLite status update...');
      await new Promise((r) => setTimeout(r, 1000));
      const destPath = `published/${activePost.image_path.split('/').pop()}`;
      updateStep(6, 'completed', `Moved to ${destPath} and updated balshi_posts.db status='Posted'`);

      onCompletePost(activePost.id);
    } catch (e: any) {
      addLog(`[ERROR] Publisher failed: ${e?.message || e}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setSteps(INITIAL_STEPS);
    setLogs([
      '[INIT] Publisher daemon reset. Ready for next cycle.',
      '[DB] Connected to balshi_posts.db in WAL journal mode.',
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold text-slate-100">
                Meta Instagram Graph API v21.0 Publisher Daemon
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Simulates the 6-step lifecycle executed by <code className="text-amber-300 font-mono">publisher.py</code> when <code className="text-amber-300 font-mono">post_timestamp &lt;= current_epoch</code>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {scheduledPosts.length > 0 && (
              <select
                value={selectedPostId || ''}
                onChange={(e) => setSelectedPostId(Number(e.target.value))}
                disabled={isRunning}
                className="px-3 py-2 bg-slate-950 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-amber-400"
              >
                {scheduledPosts.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.id} - {p.title.slice(0, 32)}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={runSimulation}
              disabled={isRunning || scheduledPosts.length === 0}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                isRunning || scheduledPosts.length === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
              }`}
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publishing in Progress...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Execute Publish Cycle</span>
                </>
              )}
            </button>

            <button
              onClick={handleReset}
              disabled={isRunning}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700 transition"
              title="Reset Steps & Logs"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {scheduledPosts.length === 0 && (
          <div className="mt-4 p-3 bg-amber-950/40 border border-amber-500/20 rounded-lg text-xs text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>No scheduled posts in the SQLite queue. Create a post in the Graphic Studio tab first to test the publisher.</span>
          </div>
        )}
      </div>

      {/* 6-Step Visualizer Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {steps.map((step) => {
          const isDone = step.status === 'completed';
          const isActive = step.status === 'active';
          const isPending = step.status === 'pending';

          return (
            <div
              key={step.id}
              className={`rounded-xl border p-4 transition ${
                isDone
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : isActive
                  ? 'bg-amber-950/30 border-amber-500/50 ring-1 ring-amber-500/30'
                  : 'bg-slate-900 border-slate-800 opacity-80'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  Step 0{step.id}
                </span>
                {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {isActive && <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />}
                {isPending && <span className="w-2 h-2 rounded-full bg-slate-700" />}
              </div>

              <h4 className="text-sm font-semibold text-slate-100">{step.name}</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{step.detail}</p>

              {step.endpoint && (
                <div className="mt-2 text-[10px] font-mono px-2 py-1 bg-slate-950 rounded text-slate-400 border border-slate-800 truncate">
                  {step.endpoint}
                </div>
              )}

              {step.log && (
                <div className="mt-2 text-[11px] font-mono text-amber-300/90 pt-2 border-t border-slate-800 truncate">
                  {step.log}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Live Publisher Terminal Logs */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="ml-2 font-medium text-slate-300">publisher_daemon.log</span>
          </div>
          <span className="text-[11px] text-slate-500">schedule.every(60).seconds</span>
        </div>

        <div className="mt-3 space-y-1.5 max-h-56 overflow-y-auto pr-2">
          {logs.map((log, i) => (
            <div
              key={i}
              className={`leading-relaxed ${
                log.includes('ERROR')
                  ? 'text-rose-400'
                  : log.includes('Successfully') || log.includes('FINISHED')
                  ? 'text-emerald-300'
                  : log.includes('Threaded') || log.includes('Ngrok')
                  ? 'text-sky-300'
                  : 'text-slate-400'
              }`}
            >
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
