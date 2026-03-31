import { useState, useRef, useEffect } from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useChatStream, type ChatMessage } from '@/hooks/useChatStream';
import { Send, Trash2, Loader2, Brain, ChevronDown, Sparkles, Zap, BarChart2, Server, AlertCircle, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const SUGGESTIONS = [
  { icon: BarChart2,    text: 'Tóm tắt trạng thái tasks hiện tại' },
  { icon: AlertCircle, text: 'Có task nào urgent không?' },
  { icon: MessageSquare, text: 'Liệt kê các task đang in progress' },
  { icon: Server,      text: 'Servers đang hoạt động như thế nào?' },
  { icon: Zap,         text: 'Có alert nào đang mở không?' },
];

// ── ThinkingBubble ─────────────────────────────────────────────────────────
function ThinkingBubble({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[85%] rounded-2xl border border-[#6bd8cb]/20 bg-[#6bd8cb]/5 overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-[#6bd8cb] font-medium hover:bg-[#6bd8cb]/10 transition-colors"
        >
          <Brain size={13} />
          <span>Đang lập kế hoạch &amp; reasoning...</span>
          <ChevronDown
            size={13}
            className={`ml-auto transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
        {expanded && (
          <div className="px-4 pb-3 pt-2 text-xs text-[#6bd8cb]/80 whitespace-pre-wrap border-t border-[#6bd8cb]/20 leading-relaxed">
            {content}
          </div>
        )}
      </div>
    </div>
  );
}

// ── MessageBubble ──────────────────────────────────────────────────────────
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-xl bg-[#6bd8cb]/10 flex items-center justify-center mr-3 mt-0.5">
          <Sparkles size={13} className="text-[#6bd8cb]" />
        </div>
      )}
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-[#6bd8cb] text-[#003732] font-medium rounded-br-sm'
            : 'bg-[#131b2e] border border-slate-800/60 text-[#dae2fd] rounded-bl-sm'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none
            prose-p:text-[#dae2fd] prose-p:my-1
            prose-headings:text-[#dae2fd] prose-headings:font-bold
            prose-strong:text-[#6bd8cb]
            prose-code:text-[#b4c5ff] prose-code:bg-[#222a3d] prose-code:px-1 prose-code:rounded
            prose-pre:bg-[#222a3d] prose-pre:border prose-pre:border-slate-700/50
            prose-li:text-[#dae2fd] prose-li:my-0.5
            prose-a:text-[#6bd8cb]">
            <ReactMarkdown>{message.content || '...'}</ReactMarkdown>
          </div>
        )}
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-xl bg-[#6bd8cb]/20 flex items-center justify-center ml-3 mt-0.5">
          <span className="text-xs font-bold text-[#6bd8cb]">U</span>
        </div>
      )}
    </div>
  );
}

// ── ToolCallBubble ─────────────────────────────────────────────────────────
function ToolCallBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="flex justify-start mb-3">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#b4c5ff]/5 border border-[#b4c5ff]/20 rounded-xl text-xs text-[#b4c5ff]">
        <Zap size={11} />
        <span className="font-medium">Tool:</span>
        <span className="font-mono">{message.toolName ?? message.content}</span>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function AIChatPage() {
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { messages, isStreaming, send, clear } = useChatStream(workspaceId);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    await send(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex-1 flex overflow-hidden p-6 gap-6">

      {/* ── Left panel ──────────────────────────────────────────────── */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-4">
        {/* AI identity card */}
        <div className="bg-[#131b2e] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#6bd8cb]/10 flex items-center justify-center">
              <Sparkles size={18} className="text-[#6bd8cb]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#dae2fd]">TaskOps AI</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Assistant</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between py-1.5 border-b border-slate-800/30">
              <span className="text-[10px] text-slate-500">Status</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6bd8cb] animate-pulse" />
                <span className="text-[10px] font-bold text-[#6bd8cb]">Online</span>
              </div>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/30">
              <span className="text-[10px] text-slate-500">Messages</span>
              <span className="text-[10px] font-bold text-[#dae2fd]">{messages.filter(m => m.role !== 'thinking').length}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[10px] text-slate-500">Mode</span>
              <span className="text-[10px] font-bold text-[#b4c5ff]">Streaming</span>
            </div>
          </div>
        </div>

        {/* Suggestion chips */}
        <div className="bg-[#131b2e] rounded-2xl p-4 flex-1">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Gợi ý</h3>
          <div className="space-y-2">
            {SUGGESTIONS.map(({ icon: Icon, text }) => (
              <button
                key={text}
                onClick={() => setInput(text)}
                disabled={isStreaming}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-[#171f33] hover:bg-[#222a3d] disabled:opacity-40 rounded-xl text-left text-xs text-slate-300 hover:text-[#dae2fd] transition-colors group"
              >
                <Icon size={13} className="text-[#6bd8cb] flex-shrink-0" />
                <span className="leading-snug">{text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Clear button */}
        {messages.length > 0 && (
          <button
            onClick={clear}
            className="flex items-center justify-center gap-2 py-2 rounded-xl border border-slate-800/50 text-xs text-slate-500 hover:text-[#ffb4ab] hover:border-[#ffb4ab]/30 transition-colors"
          >
            <Trash2 size={13} />
            Xóa lịch sử
          </button>
        )}
      </div>

      {/* ── Chat area ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-[#dae2fd] tracking-tight">AI Chat</h1>
            <p className="text-xs text-slate-500 mt-0.5">Hỏi bất cứ điều gì về tasks và hệ thống của bạn</p>
          </div>
          {isStreaming && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#6bd8cb]/5 border border-[#6bd8cb]/20 rounded-xl">
              <Loader2 size={13} className="animate-spin text-[#6bd8cb]" />
              <span className="text-xs text-[#6bd8cb] font-medium">Đang trả lời...</span>
            </div>
          )}
        </div>

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto bg-[#0b1326] rounded-2xl border border-slate-800/30 p-6 mb-4
          [&::-webkit-scrollbar]:w-[3px]
          [&::-webkit-scrollbar-thumb]:bg-[#2d3449]
          [&::-webkit-scrollbar-thumb:hover]:bg-[#6bd8cb]
          [&::-webkit-scrollbar-track]:bg-transparent">

          {isEmpty && (
            <div className="h-full flex flex-col items-center justify-center gap-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#6bd8cb]/10 flex items-center justify-center">
                <Sparkles size={28} className="text-[#6bd8cb]" />
              </div>
              <div>
                <p className="text-[#dae2fd] font-semibold mb-1">Xin chào! Tôi là TaskOps AI</p>
                <p className="text-sm text-slate-500 max-w-xs">
                  Hỏi tôi về tasks, servers, alerts hoặc bất kỳ thứ gì trong workspace của bạn.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                {SUGGESTIONS.map(({ icon: Icon, text }) => (
                  <button
                    key={text}
                    onClick={() => setInput(text)}
                    className="flex items-center gap-1.5 text-xs bg-[#131b2e] hover:bg-[#171f33] border border-slate-800/50 text-slate-400 hover:text-[#dae2fd] px-3 py-1.5 rounded-xl transition-colors"
                  >
                    <Icon size={11} className="text-[#6bd8cb]" />
                    {text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) =>
            msg.role === 'thinking' ? (
              <ThinkingBubble key={msg.id} content={msg.content} />
            ) : msg.role === 'tool' ? (
              <ToolCallBubble key={msg.id} message={msg} />
            ) : (
              <MessageBubble key={msg.id} message={msg} />
            )
          )}

          {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex justify-start mb-4">
              <div className="flex-shrink-0 w-7 h-7 rounded-xl bg-[#6bd8cb]/10 flex items-center justify-center mr-3 mt-0.5">
                <Sparkles size={13} className="text-[#6bd8cb]" />
              </div>
              <div className="bg-[#131b2e] border border-slate-800/60 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6bd8cb] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#6bd8cb] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#6bd8cb] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 bg-[#131b2e] rounded-2xl p-3 flex items-end gap-3 border border-slate-800/40">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            rows={2}
            placeholder="Nhập câu hỏi... (Enter để gửi, Shift+Enter xuống dòng)"
            className="flex-1 resize-none bg-transparent border-none text-sm text-[#dae2fd] placeholder-slate-500 focus:outline-none focus:ring-0 disabled:opacity-50 py-1 leading-relaxed"
          />
          <button
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-[#6bd8cb] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-[#003732] rounded-xl transition-all"
          >
            {isStreaming
              ? <Loader2 size={16} className="animate-spin" />
              : <Send size={16} />
            }
          </button>
        </div>
      </div>
    </div>
  );
}
