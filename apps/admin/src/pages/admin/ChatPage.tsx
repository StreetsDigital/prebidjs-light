import { useEffect, useState, useRef } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { PaperAirplaneIcon, PlusIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

export function ChatPage() {
  const {
    currentSessionId,
    messages,
    sessions,
    isSending,
    error,
    sendMessage,
    loadSession,
    loadSessions,
    createNewSession,
  } = useChatStore();

  const [inputValue, setInputValue] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();

    // Restore last session
    const lastSessionId = localStorage.getItem('lastChatSession');
    if (lastSessionId) {
      loadSession(lastSessionId);
    }
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [inputValue]);

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;

    const message = inputValue.trim();
    setInputValue('');

    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    handleSend();
  };

  const handleNewChat = () => {
    createNewSession();
    setSidebarOpen(false);
  };

  const handleSessionClick = (sessionId: string) => {
    loadSession(sessionId);
    setSidebarOpen(false);
  };

  const groupedSessions = {
    today: sessions.filter((s) => isToday(s.last_message_at)),
    yesterday: sessions.filter((s) => isYesterday(s.last_message_at)),
    older: sessions.filter((s) => !isToday(s.last_message_at) && !isYesterday(s.last_message_at)),
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed lg:relative lg:translate-x-0 z-20 w-64 bg-white border-r border-gray-200 transition-transform duration-300 h-full flex flex-col`}
      >
        {/* New Chat Button */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>New Conversation</span>
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {groupedSessions.today.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Today</h3>
              <div className="space-y-1">
                {groupedSessions.today.map((session) => (
                  <SessionItem
                    key={session.session_id}
                    session={session}
                    isActive={session.session_id === currentSessionId}
                    onClick={() => handleSessionClick(session.session_id)}
                  />
                ))}
              </div>
            </div>
          )}

          {groupedSessions.yesterday.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Yesterday</h3>
              <div className="space-y-1">
                {groupedSessions.yesterday.map((session) => (
                  <SessionItem
                    key={session.session_id}
                    session={session}
                    isActive={session.session_id === currentSessionId}
                    onClick={() => handleSessionClick(session.session_id)}
                  />
                ))}
              </div>
            </div>
          )}

          {groupedSessions.older.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Older</h3>
              <div className="space-y-1">
                {groupedSessions.older.map((session) => (
                  <SessionItem
                    key={session.session_id}
                    session={session}
                    isActive={session.session_id === currentSessionId}
                    onClick={() => handleSessionClick(session.session_id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900">AdOps Assistant</h1>
          </div>
          <div className="text-sm text-gray-600">
            {isSending ? 'Thinking...' : 'Ready'}
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
          {messages.length === 0 ? (
            <WelcomeMessage onSuggestionClick={handleSuggestionClick} />
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}

          {isSending && <TypingIndicator />}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="max-w-4xl mx-auto flex gap-4">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your ad operations..."
              disabled={isSending}
              className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isSending}
              className="flex-shrink-0 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// Session Item Component
function SessionItem({
  session,
  isActive,
  onClick,
}: {
  session: any;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
        isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <div className="font-medium text-sm truncate">{session.title || 'New Conversation'}</div>
      <div className="text-xs text-gray-500 mt-1">
        {session.message_count} {session.message_count === 1 ? 'message' : 'messages'}
      </div>
    </button>
  );
}

// Welcome Message Component
function WelcomeMessage({ onSuggestionClick }: { onSuggestionClick: (suggestion: string) => void }) {
  const suggestions = [
    { icon: '📋', text: 'List my publishers', query: 'List all my publishers' },
    { icon: '💰', text: 'Show revenue this week', query: 'Show me revenue for this week' },
    { icon: '🧪', text: 'Create an AB test', query: 'Help me create an AB test' },
    { icon: '⚙️', text: 'Enable a bidder', query: 'How do I enable a new bidder?' },
  ];

  return (
    <div className="max-w-2xl mx-auto text-center space-y-8">
      <div>
        <ChatBubbleLeftRightIcon className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to AdOps Assistant!</h2>
        <p className="text-gray-600">Ask me anything about your ad operations</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestion.query)}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all text-left"
          >
            <div className="text-2xl mb-2">{suggestion.icon}</div>
            <div className="text-sm font-medium text-gray-900">{suggestion.text}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Message Bubble Component
function MessageBubble({ message }: { message: any }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-900">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-3xl ${isUser ? 'ml-auto' : 'mr-auto'}`}>
        <div
          className={`rounded-lg px-6 py-4 ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-200 text-gray-900'
          }`}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>

          {message.actions && message.actions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-300 space-y-2">
              {message.actions.map((action: any, index: number) => (
                <div key={index} className="text-sm flex items-center gap-2">
                  {action.status === 'success' ? '✓' : '✗'}
                  <span>{action.tool}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`text-xs text-gray-500 mt-2 ${isUser ? 'text-right' : 'text-left'}`}>
          {format(new Date(message.timestamp), 'h:mm a')}
        </div>
      </div>
    </div>
  );
}

// Typing Indicator Component
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="max-w-3xl">
        <div className="bg-white border border-gray-200 rounded-lg px-6 py-4">
          <div className="flex gap-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function isYesterday(dateString: string): boolean {
  const date = new Date(dateString);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
}
