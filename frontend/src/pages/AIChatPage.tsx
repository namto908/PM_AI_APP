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
      <div className="max-w-[85%] rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-primary font-medium hover:bg-primary/10 transition-colors"
        >
          <Brain size={13} />
          <span>Đang lập kế hoạch &amp; reasoning...</span>
          <ChevronDown
            size={13}
            className={`ml-auto transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
        {expanded && (
          <div className="px-4 pb-3 pt-2 text-xs text-primary/80 whitespace-pre-wrap border-t border-primary/20 leading-relaxed">
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
        <div className="flex-shrink-0 w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center mr-3 mt-0.5">
          <Sparkles size={13} className="text-primary" />
        </div>
      )}
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-primary text-on-primary-fixed font-medium rounded-br-sm'
            : 'bg-surface border border-outline-variant text-on-surface rounded-bl-sm'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none
            prose-p:text-on-surface prose-p:my-1
            prose-headings:text-on-surface prose-headings:font-bold
            prose-strong:text-primary
            prose-code:text-secondary prose-code:bg-surface-container-highest prose-code:px-1 prose-code:rounded
            prose-pre:bg-surface-container-highest prose-pre:border prose-pre:border-outline-variant
            prose-li:text-on-surface prose-li:my-0.5
            prose-a:text-primary">
            <ReactMarkdown>{message.content || '...'}</ReactMarkdown>
          </div>
        )}
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-xl bg-primary/20 flex items-center justify-center ml-3 mt-0.5">
          <span className="text-xs font-bold text-primary">U</span>
        </div>
      )}
    </div>
  );
}

// ── ToolCallBubble ─────────────────────────────────────────────────────────
function ToolCallBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="flex justify-start mb-3">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/5 border border-secondary/20 rounded-xl text-xs text-secondary">
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
        <div className="bg-surface rounded-2xl p-5 border border-outline-variant shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface">TaskOps AI</p>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">Assistant</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between py-1.5 border-b border-outline-variant">
              <span className="text-[10px] text-on-surface-variant">Status</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-bold text-primary">Online</span>
              </div>
            </div>
            <div className="flex justify-between py-1.5 border-b border-outline-variant">
              <span className="text-[10px] text-on-surface-variant">Messages</span>
              <span className="text-[10px] font-bold text-on-surface">{messages.filter(m => m.role !== 'thinking').length}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[10px] text-on-surface-variant">Mode</span>
              <span className="text-[10px] font-bold text-secondary">Streaming</span>
            </div>
          </div>
        </div>

        {/* Suggestion chips */}
        <div className="bg-surface rounded-2xl p-4 flex-1 border border-outline-variant shadow-sm">
          <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">Gợi ý</h3>
          <div className="space-y-2">
            {SUGGESTIONS.map(({ icon: Icon, text }) => (
              <button
                key={text}
                onClick={() => setInput(text)}
                disabled={isStreaming}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-surface-container hover:bg-surface hover:shadow-md disabled:opacity-40 rounded-xl text-left text-xs text-on-surface-variant hover:text-on-surface border border-outline-variant/30 transition-all group"
              >
                <Icon size={13} className="text-primary flex-shrink-0" />
                <span className="leading-snug">{text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Clear button */}
        {messages.length > 0 && (
          <button
            onClick={clear}
            className="flex items-center justify-center gap-2 py-2 rounded-xl border border-outline-variant text-xs text-on-surface-variant hover:text-error hover:border-error/30 transition-colors bg-surface/50"
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
            <h1 className="text-2xl font-bold text-on-surface tracking-tight">AI Chat</h1>
            <p className="text-xs text-on-surface-variant mt-0.5">Hỏi bất cứ điều gì về tasks và hệ thống của bạn</p>
          </div>
          {isStreaming && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 border border-primary/20 rounded-xl">
              <Loader2 size={13} className="animate-spin text-primary" />
              <span className="text-xs text-primary font-medium">Đang trả lời...</span>
            </div>
          )}
        </div>

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto bg-surface-container-low rounded-2xl border border-outline-variant p-6 mb-4 shadow-inner
          [&::-webkit-scrollbar]:w-[3px]
          [&::-webkit-scrollbar-thumb]:bg-surface-container-highest
          [&::-webkit-scrollbar-thumb:hover]:bg-primary
          [&::-webkit-scrollbar-track]:bg-transparent">

          {isEmpty && (
            <div className="h-full flex flex-col items-center justify-center gap-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Sparkles size={28} className="text-primary" />
              </div>
              <div>
                <p className="text-on-surface font-semibold mb-1">Xin chào! Tôi là TaskOps AI</p>
                <p className="text-sm text-on-surface-variant max-w-xs">
                  Hỏi tôi về tasks, servers, alerts hoặc bất kỳ thứ gì trong workspace của bạn.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                {SUGGESTIONS.map(({ icon: Icon, text }) => (
                  <button
                    key={text}
                    onClick={() => setInput(text)}
                    className="flex items-center gap-1.5 text-xs bg-surface hover:bg-surface-container border border-outline-variant text-on-surface-variant hover:text-on-surface px-3 py-1.5 rounded-xl transition-all shadow-sm"
                  >
                    <Icon size={11} className="text-primary" />
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
              <div className="flex-shrink-0 w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center mr-3 mt-0.5">
                <Sparkles size={13} className="text-primary" />
              </div>
              <div className="bg-surface border border-outline-variant rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 bg-surface rounded-2xl p-3 flex items-end gap-3 border border-outline-variant shadow-lg">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            rows={2}
            placeholder="Nhập câu hỏi... (Enter để gửi, Shift+Enter xuống dòng)"
            className="flex-1 resize-none bg-transparent border-none text-sm text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:ring-0 disabled:opacity-50 py-1 leading-relaxed"
          />
          <button
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-primary hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-on-primary-fixed rounded-xl transition-all shadow-md shadow-primary/10"
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
