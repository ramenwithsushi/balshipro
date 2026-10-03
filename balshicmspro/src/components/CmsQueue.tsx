import React from 'react';
import { Database, Clock, CheckCircle2, AlertCircle, Trash2, Send, ExternalLink } from 'lucide-react';
import { PostItem } from '../types';

interface CmsQueueProps {
  posts: PostItem[];
  onTriggerPublish: (post: PostItem) => void;
  onDeletePost: (id: number) => void;
}

export const CmsQueue: React.FC<CmsQueueProps> = ({
  posts,
  onTriggerPublish,
  onDeletePost,
}) => {
  const currentEpoch = Math.floor(Date.now() / 1000);
  const scheduledPosts = posts.filter((p) => p.status === 'Scheduled');
  const postedRecords = posts.filter((p) => p.status === 'Posted');
  const failedPosts = posts.filter((p) => p.status === 'Failed');

  const formatTimestamp = (ts: number): string => {
    try {
      const d = new Date(ts * 1000);
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(ts);
    }
  };

  const getRelativeTime = (ts: number): string => {
    const diff = ts - currentEpoch;
    if (diff <= 0) {
      return 'DUE NOW (Ready for daemon pickup)';
    }
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `Due in ${mins}m`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `Due in ${hours}h ${remMins}m`;
  };

  return (
    <div className="space-y-8">
      {/* Top Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">
            Total In SQLite
          </span>
          <span className="text-2xl font-bold text-slate-100 mt-1 block">
            {posts.length}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">balshi_posts.db</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-amber-400 font-medium uppercase tracking-wider block">
            Scheduled Queue
          </span>
          <span className="text-2xl font-bold text-amber-400 mt-1 block">
            {scheduledPosts.length}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Awaiting daemon cycle</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-emerald-400 font-medium uppercase tracking-wider block">
            Historical Posted
          </span>
          <span className="text-2xl font-bold text-emerald-400 mt-1 block">
            {postedRecords.length}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">status == 'Posted'</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">
            Engine Mode
          </span>
          <span className="text-sm font-mono font-bold text-sky-400 mt-2 block">
            PRAGMA WAL;
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">check_same_thread=False</span>
        </div>
      </div>

      {/* SECTION 1: Scheduled Queue */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-slate-100">Scheduled Posts Queue</h3>
          </div>
          <span className="text-xs text-slate-400">
            Publisher polls: <code className="text-amber-300 font-mono">post_timestamp &lt;= {currentEpoch}</code>
          </span>
        </div>

        {scheduledPosts.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No posts currently scheduled. Create a new post in the Graphic Studio to queue one up.
          </div>
        ) : (
          <div className="mt-4 divide-y divide-slate-800/80">
            {scheduledPosts.map((post) => {
              const isDue = post.post_timestamp <= currentEpoch;
              return (
                <div key={post.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {post.imageDataUrl ? (
                      <img
                        src={post.imageDataUrl}
                        alt={post.title}
                        className="w-16 h-20 rounded-md object-cover border border-slate-700 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-20 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 text-xs flex-shrink-0">
                        1170x1463
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                          #{post.id}
                        </span>
                        <h4 className="text-sm font-semibold text-slate-100">{post.title}</h4>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            isDue
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                              : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                          }`}
                        >
                          {getRelativeTime(post.post_timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{post.caption}</p>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-2 font-mono">
                        <span>Target: {formatTimestamp(post.post_timestamp)}</span>
                        <span>•</span>
                        <span>Epoch: {post.post_timestamp}</span>
                        <span>•</span>
                        <span>Staged: {post.image_path}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => onTriggerPublish(post)}
                      className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Test Publish Now</span>
                    </button>
                    <button
                      onClick={() => onDeletePost(post.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                      title="Delete post"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: Historical Archive (status == 'Posted') */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-slate-100">Historical Archive (status == 'Posted')</h3>
          </div>
          <span className="text-xs text-slate-400">
            Moved to <code className="text-emerald-300 font-mono">/published/</code>
          </span>
        </div>

        {postedRecords.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No historical records with status 'Posted' yet. Posts will appear here after the background publisher finishes Graph API container creation and media publish.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {postedRecords.map((post) => (
              <div
                key={post.id}
                className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition flex flex-col"
              >
                {post.imageDataUrl && (
                  <div className="w-full aspect-[4/5] bg-slate-900 overflow-hidden">
                    <img
                      src={post.imageDataUrl}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                        POSTED #{post.id}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {formatTimestamp(post.post_timestamp)}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-100 mt-2">{post.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-3 font-mono leading-relaxed">
                      {post.caption}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
                    <span className="font-mono truncate max-w-[200px]">{post.image_path}</span>
                    <button
                      onClick={() => onDeletePost(post.id)}
                      className="text-slate-500 hover:text-rose-400 transition"
                      title="Remove record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: SQLite WAL Schema Card */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 text-slate-300 text-sm font-semibold mb-2">
          <Database className="w-4 h-4 text-sky-400" />
          <span>SQLite WAL Schema Architecture</span>
        </div>
        <pre className="text-xs text-slate-400 bg-slate-900/90 p-4 rounded-lg overflow-x-auto font-mono border border-slate-800">
{`-- Initialized via database.py with check_same_thread=False
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;

CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    image_path TEXT NOT NULL,
    caption TEXT NOT NULL,
    post_timestamp INTEGER NOT NULL,  -- Epoch seconds to eliminate timezone mismatch
    status TEXT NOT NULL DEFAULT 'Scheduled' -- 'Scheduled' -> 'Posted' | 'Failed'
);

CREATE INDEX idx_posts_status_time ON posts(status, post_timestamp);`}
        </pre>
      </div>
    </div>
  );
};
