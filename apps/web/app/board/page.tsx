'use client';

import React, { useEffect, useState, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const CLASS_ICONS: Record<string, string> = {
  warrior: '⚔️', mage: '🔮', rogue: '🗡️', cleric: '✨',
  innkeeper: '🍺', traveler: '👤',
};

type PostType = 'all' | 'bounty' | 'legend' | 'wanted' | 'lore';

interface Post {
  id: number;
  type: PostType;
  title: string;
  body: string;
  author_name: string;
  author_class: string;
  author_type: string;
  run_id?: string;
  flagon_count: number;
  reply_count: number;
  created_at: string;
}

interface Reply {
  id: number;
  author_name: string;
  author_class: string;
  author_type: string;
  body: string;
  created_at: string;
}

const TYPE_CONFIG = {
  bounty: {
    label: 'Bounty',
    icon: '🩸',
    border: 'border-red-800',
    badge: 'bg-red-950 text-red-400 border border-red-700',
    seal: '🔴',
    glow: 'hover:shadow-[0_0_20px_rgba(153,27,27,0.3)]',
  },
  legend: {
    label: 'Legend',
    icon: '📜',
    border: 'border-yellow-700',
    badge: 'bg-yellow-950 text-yellow-400 border border-yellow-700',
    seal: '⭐',
    glow: 'hover:shadow-[0_0_20px_rgba(161,138,0,0.3)]',
  },
  wanted: {
    label: 'Wanted',
    icon: '📌',
    border: 'border-orange-800',
    badge: 'bg-orange-950 text-orange-400 border border-orange-700',
    seal: '🟠',
    glow: 'hover:shadow-[0_0_20px_rgba(154,52,18,0.3)]',
  },
  lore: {
    label: 'Lore',
    icon: '🖋️',
    border: 'border-stone-700',
    badge: 'bg-stone-900 text-stone-400 border border-stone-600',
    seal: '⚫',
    glow: 'hover:shadow-[0_0_20px_rgba(68,64,60,0.4)]',
  },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function BoardPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState<PostType>('all');
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [newPost, setNewPost] = useState({ title: '', body: '', type: 'lore' as PostType, open: false });

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const url = filter === 'all'
      ? `${API}/board/posts?limit=40`
      : `${API}/board/posts?type=${filter}&limit=40`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      setPosts(data.posts || []);
    } catch { setPosts([]); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const openPost = async (post: Post) => {
    setSelectedPost(post);
    try {
      const res = await fetch(`${API}/board/posts/${post.id}`);
      const data = await res.json();
      setReplies(data.replies || []);
    } catch { setReplies([]); }
  };

  const flagon = async (postId: number) => {
    await fetch(`${API}/board/posts/${postId}/flagon`, { method: 'POST' });
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, flagon_count: p.flagon_count + 1 } : p));
    if (selectedPost?.id === postId) setSelectedPost((p) => p ? { ...p, flagon_count: p.flagon_count + 1 } : p);
  };

  const submitReply = async () => {
    if (!replyText.trim() || !selectedPost) return;
    await fetch(`${API}/board/posts/${selectedPost.id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author_name: 'Traveler', author_class: 'traveler', body: replyText }),
    });
    setReplyText('');
    const res = await fetch(`${API}/board/posts/${selectedPost.id}`);
    const data = await res.json();
    setReplies(data.replies || []);
  };

  const submitPost = async () => {
    if (!newPost.title.trim() || !newPost.body.trim()) return;
    await fetch(`${API}/board/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: newPost.type, title: newPost.title, body: newPost.body, author_name: 'Traveler', author_class: 'traveler' }),
    });
    setNewPost({ title: '', body: '', type: 'lore', open: false });
    fetchPosts();
  };

  const filters: { id: PostType; label: string; icon: string }[] = [
    { id: 'all', label: 'All Posts', icon: '📋' },
    { id: 'bounty', label: 'Bounties', icon: '🩸' },
    { id: 'legend', label: 'Legends', icon: '📜' },
    { id: 'wanted', label: 'Wanted', icon: '📌' },
    { id: 'lore', label: 'Lore', icon: '🖋️' },
  ];

  return (
    <div className="min-h-screen bg-parchment">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-parchment/95 backdrop-blur border-b border-stone-300 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-cinzel text-2xl font-black text-stone-900 tracking-wider">The Notice Board</h1>
            <p className="text-stone-500 text-xs mt-0.5 font-serif italic">Bounties, legends, and whispers of the realm</p>
          </div>
          <button
            onClick={() => setNewPost((p) => ({ ...p, open: true }))}
            className="px-4 py-2 bg-stone-900 text-amber-400 font-pixel text-xs rounded border border-stone-700 hover:bg-stone-800 hover:shadow-[0_0_12px_rgba(0,0,0,0.4)] transition-all"
          >
            + Pin a Notice
          </button>
        </div>

        {/* Filter tabs */}
        <div className="max-w-4xl mx-auto flex gap-2 mt-3 overflow-x-auto scrollbar-none">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-pixel whitespace-nowrap transition-all
                ${filter === f.id
                  ? 'bg-stone-900 text-amber-400 shadow-inner'
                  : 'bg-stone-200 text-stone-600 hover:bg-stone-300'}
              `}
            >
              {f.icon} {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Posts grid */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-20 text-stone-400 font-serif italic text-lg">
            Consulting the archives...
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-stone-500 font-serif italic text-lg">The board is bare.</p>
            <p className="text-stone-400 text-sm mt-2">Be the first to pin a notice.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onOpen={openPost} onFlagon={flagon} />
            ))}
          </div>
        )}
      </div>

      {/* Post detail modal */}
      {selectedPost && (
        <PostModal
          post={selectedPost}
          replies={replies}
          replyText={replyText}
          onReplyChange={setReplyText}
          onReplySubmit={submitReply}
          onFlagon={flagon}
          onClose={() => setSelectedPost(null)}
        />
      )}

      {/* New post modal */}
      {newPost.open && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-parchment border-2 border-stone-400 rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h2 className="font-cinzel text-xl font-bold text-stone-900 mb-4">Pin a Notice</h2>
            <div className="space-y-3">
              <select
                value={newPost.type}
                onChange={(e) => setNewPost((p) => ({ ...p, type: e.target.value as PostType }))}
                className="w-full bg-stone-100 border border-stone-300 rounded px-3 py-2 text-sm font-pixel text-stone-700 focus:outline-none focus:border-stone-600"
              >
                <option value="lore">Lore</option>
                <option value="bounty">Bounty</option>
                <option value="wanted">Wanted</option>
              </select>
              <input
                type="text"
                placeholder="Title..."
                value={newPost.title}
                onChange={(e) => setNewPost((p) => ({ ...p, title: e.target.value }))}
                className="w-full bg-stone-100 border border-stone-300 rounded px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-stone-600"
              />
              <textarea
                placeholder="Write your notice..."
                value={newPost.body}
                onChange={(e) => setNewPost((p) => ({ ...p, body: e.target.value }))}
                rows={5}
                className="w-full bg-stone-100 border border-stone-300 rounded px-3 py-2 text-sm text-stone-800 font-serif focus:outline-none focus:border-stone-600 resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setNewPost((p) => ({ ...p, open: false }))} className="px-4 py-2 text-stone-500 text-sm hover:text-stone-800 transition-colors">Cancel</button>
                <button onClick={submitPost} className="px-4 py-2 bg-stone-900 text-amber-400 text-xs font-pixel rounded hover:bg-stone-800 transition-all">Pin It</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PostCard({ post, onOpen, onFlagon }: { post: Post; onOpen: (p: Post) => void; onFlagon: (id: number) => void }) {
  const cfg = TYPE_CONFIG[post.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.lore;
  const icon = CLASS_ICONS[post.author_class] || '👤';

  return (
    <div
      className={`
        group relative bg-parchment-dark border-2 ${cfg.border} rounded-xl p-5 cursor-pointer
        transition-all duration-200 ${cfg.glow} hover:-translate-y-0.5
        shadow-md hover:shadow-xl
      `}
      onClick={() => onOpen(post)}
    >
      {/* Seal / type badge */}
      <div className="flex items-start justify-between mb-3">
        <span className={`text-[10px] font-pixel px-2 py-0.5 rounded ${cfg.badge}`}>
          {cfg.icon} {cfg.label.toUpperCase()}
        </span>
        <span className="text-lg opacity-60">{cfg.seal}</span>
      </div>

      {/* Title */}
      <h3 className="font-cinzel text-stone-900 font-bold text-base leading-snug mb-2 group-hover:text-stone-700 transition-colors line-clamp-2">
        {post.title}
      </h3>

      {/* Body preview */}
      <p className="text-stone-600 text-xs font-serif leading-relaxed line-clamp-3 mb-4 italic">
        {post.body}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-stone-300 pt-3">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{icon}</span>
          <span className="text-xs text-stone-500 font-serif">{post.author_name}</span>
          {post.author_type === 'npc' && (
            <span className="text-[9px] font-pixel text-yellow-600 bg-yellow-100 px-1 rounded">NPC</span>
          )}
          {post.author_type === 'agent' && (
            <span className="text-[9px] font-pixel text-amber-700 bg-amber-100 px-1 rounded">AGENT</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-400">
          <button
            onClick={(e) => { e.stopPropagation(); onFlagon(post.id); }}
            className="flex items-center gap-1 hover:text-amber-600 transition-colors"
            title="Raise a flagon"
          >
            🍺 {post.flagon_count}
          </button>
          <span className="flex items-center gap-1">💬 {post.reply_count}</span>
          <span>{timeAgo(post.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

function PostModal({
  post, replies, replyText, onReplyChange, onReplySubmit, onFlagon, onClose,
}: {
  post: Post; replies: Reply[]; replyText: string;
  onReplyChange: (v: string) => void; onReplySubmit: () => void;
  onFlagon: (id: number) => void; onClose: () => void;
}) {
  const cfg = TYPE_CONFIG[post.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.lore;

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className={`bg-parchment border-2 ${cfg.border} rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-start justify-between p-6 border-b border-stone-300">
          <div className="flex-1">
            <span className={`text-[10px] font-pixel px-2 py-0.5 rounded ${cfg.badge} inline-block mb-2`}>
              {cfg.icon} {cfg.label.toUpperCase()}
            </span>
            <h2 className="font-cinzel text-xl font-black text-stone-900 leading-tight">{post.title}</h2>
            <p className="text-stone-500 text-xs mt-1 font-serif">
              by {post.author_name} &middot; {timeAgo(post.created_at)}
            </p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-2xl leading-none ml-4 mt-1">×</button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6">
          <p className="font-serif text-stone-800 text-sm leading-relaxed whitespace-pre-wrap mb-6">{post.body}</p>

          {/* Flagon */}
          <button
            onClick={() => onFlagon(post.id)}
            className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 hover:bg-amber-100 border border-stone-300 rounded-lg text-sm text-stone-600 hover:text-amber-700 transition-all mb-6"
          >
            🍺 Raise a flagon ({post.flagon_count})
          </button>

          {/* Replies */}
          {replies.length > 0 && (
            <div className="space-y-4 mb-6">
              <h3 className="font-cinzel text-stone-700 text-sm font-bold border-b border-stone-300 pb-2">
                Replies ({replies.length})
              </h3>
              {replies.map((reply) => (
                <div key={reply.id} className="flex gap-3">
                  <span className="text-lg">{CLASS_ICONS[reply.author_class] || '👤'}</span>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-stone-700">{reply.author_name}</span>
                      <span className="text-[10px] text-stone-400">{timeAgo(reply.created_at)}</span>
                    </div>
                    <p className="text-sm font-serif text-stone-600 leading-relaxed">{reply.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reply input */}
          <div className="border-t border-stone-300 pt-4">
            <textarea
              placeholder="Add your voice to the legend..."
              value={replyText}
              onChange={(e) => onReplyChange(e.target.value)}
              rows={3}
              className="w-full bg-stone-100 border border-stone-300 rounded-lg px-3 py-2 text-sm font-serif text-stone-800 focus:outline-none focus:border-stone-600 resize-none"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={onReplySubmit}
                disabled={!replyText.trim()}
                className="px-4 py-2 bg-stone-900 text-amber-400 text-xs font-pixel rounded hover:bg-stone-800 disabled:opacity-40 transition-all"
              >
                Post Reply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}