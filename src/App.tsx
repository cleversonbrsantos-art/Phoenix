import React, { useState, useRef, useEffect } from 'react';
import { Send, Orbit, User, Sparkles, Cpu, Activity, BrainCircuit, Database, Settings, MessageSquare, Volume2, ThumbsUp, ThumbsDown, Download } from 'lucide-react';
import { motion } from 'motion/react';

interface Message {
  id: string;
  role: 'user' | 'phoenix' | 'system';
  text: string;
}

interface NeuralStatus {
  status: string;
  emotion: { state: string; energy: number };
  blackboard_keys: string[];
}

interface Memory {
  id: string;
  content: string;
  timestamp: number;
  importance: number;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'system', text: 'SYSTEM ONLINE. PHOENIX V2 COGNITIVE CORE INITIALIZED.' },
    { id: '2', role: 'phoenix', text: 'Hello. The cognitive orchestrator and Blackboard are active. How can I help with the next phase?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [neuralStatus, setNeuralStatus] = useState<NeuralStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'memory' | 'settings'>('chat');
  const [memories, setMemories] = useState<Memory[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, activeTab]);

  useEffect(() => {
    // Poll neural status every 3 seconds
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/status');
        if (res.ok) {
          const data = await res.json();
          setNeuralStatus(data);
        }
      } catch (err) {
        // silently fail status poll
      }
    };
    
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchMemories = async () => {
    try {
      const res = await fetch('/api/memory');
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFeedback = async (reward: number) => {
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reward, userId: 'admin_1' })
      });
    } catch (err) {
      console.error('Failed to send feedback', err);
    }
  };

  useEffect(() => {
    // Pre-loads voices in the browser to ensure the synth finds the desired voice
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.pitch = 1.15; // Slightly higher to emphasize feminine tone
      utterance.rate = 1.05;

      // Heuristic logic to find known feminine voices on different OS
      const voices = window.speechSynthesis.getVoices();
      const ptVoices = voices.filter(v => v.lang.includes('pt-BR') || v.lang.includes('pt_BR') || v.lang === 'pt-PT');
      
      const femaleNames = ['maria', 'luciana', 'francisca', 'heloisa', 'vitoria', 'leticia', 'google português do brasil'];
      let selectedVoice = ptVoices.find(v => femaleNames.some(name => v.name.toLowerCase().includes(name)));
      
      if (!selectedVoice && ptVoices.length > 0) {
        // Fallback to first pt-BR voice (which is usually the browser's default feminine voice)
        selectedVoice = ptVoices[0];
      }

      if (selectedVoice) {
         utterance.voice = selectedVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    if (activeTab === 'memory') fetchMemories();
    if (activeTab === 'settings') fetchProfile();
  }, [activeTab]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const res = await fetch('/api/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_input: userMsg, user_id: 'admin_1' })
      });
      const data = await res.json();

      if (data.response) {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'phoenix', text: data.response }]);
      } else {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'system', text: 'ERROR: Brain response matrix failure.' }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'system', text: 'CRITICAL ERROR: Connection to the server failed.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.15),rgba(255,255,255,0))] text-slate-200 font-sans flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-slate-950/80 border-b border-cyan-500/20 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-cyan-950 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Orbit className="w-5 h-5 text-cyan-400 animate-[spin_10s_linear_infinite]" />
            <div className="absolute inset-2 bg-cyan-500 rounded-full blur-[2px] opacity-40"></div>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-cyan-50 tracking-wide">Phoenix <span className="text-cyan-400">V2</span></h1>
            <p className="text-xs text-cyan-500/70 font-mono tracking-widest uppercase">Multi-Agent Core</p>
          </div>
        </div>

        <nav className="flex bg-slate-900/50 p-1 rounded-full border border-slate-800">
          <button 
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 transition-all ${activeTab === 'chat' ? 'bg-cyan-950 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Terminal</span>
          </button>
          <button 
            onClick={() => setActiveTab('memory')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 transition-all ${activeTab === 'memory' ? 'bg-cyan-950 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Memória Neural</span>
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 transition-all ${activeTab === 'settings' ? 'bg-cyan-950 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sistema</span>
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.location.href = '/phoenix_v2_backup.zip'}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full text-xs font-medium transition-colors border border-slate-700"
            title="Download ZIP Local"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Backup Local</span>
          </button>
          
          <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-xs font-mono tracking-widest text-green-400 uppercase hidden sm:inline">Online</span>
          </div>
        </div>
      </header>

      {/* Psychology Engine Live Status */}
      {neuralStatus && (
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap gap-4 items-center justify-center sm:justify-start text-xs font-mono">
          <div className="flex items-center gap-2 text-cyan-400">
            <BrainCircuit className="w-4 h-4" />
            <span className="uppercase text-slate-400">Mind:</span>
            <span className="text-cyan-300 font-semibold">{neuralStatus.emotion.state}</span>
          </div>
          <div className="h-4 w-[1px] bg-slate-800 hidden sm:block"></div>
          <div className="flex items-center gap-2 min-w-[150px]">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="uppercase text-slate-400">Neural Energy:</span>
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${neuralStatus.emotion.energy > 50 ? 'bg-emerald-400' : 'bg-amber-400'}`} 
                style={{ width: `${neuralStatus.emotion.energy}%` }}
              ></div>
            </div>
            <span className="text-slate-300 w-8">{neuralStatus.emotion.energy}%</span>
          </div>
          <div className="h-4 w-[1px] bg-slate-800 hidden sm:block"></div>
          <div className="flex items-center gap-2">
             <span className="uppercase text-slate-400">Activity:</span>
             <span className={`uppercase font-bold tracking-widest text-xs ${neuralStatus.status === 'Sonhando...' ? 'text-fuchsia-400 animate-pulse' : 'text-slate-300'}`}>
                {neuralStatus.status}
             </span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'chat' && (
        <>
          <main className="flex-1 overflow-y-auto p-4 md:p-8 w-full max-w-4xl mx-auto space-y-6">
            {messages.map((msg) => {
              if (msg.role === 'system') {
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
                    key={msg.id} className="flex justify-center"
                  >
                    <div className="px-4 py-1.5 bg-slate-900 border border-slate-800 rounded-full">
                      <span className="text-[10px] sm:text-xs font-mono text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Cpu className="w-3 h-3" />
                        {msg.text}
                      </span>
                    </div>
                  </motion.div>
                );
              }

              const isPhoenix = msg.role === 'phoenix';

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                  key={msg.id} className={`flex ${isPhoenix ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-[85%] sm:max-w-[75%] flex gap-3 ${isPhoenix ? 'flex-row' : 'flex-row-reverse'}`}>
                    {isPhoenix ? (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-950 border border-cyan-500/50 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                      </div>
                    ) : (
                       <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-950 border border-blue-500/50 flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-400" />
                      </div>
                    )}
                    
                    <div className={`px-5 py-3.5 rounded-2xl ${
                      isPhoenix 
                        ? 'bg-slate-900/80 border border-cyan-500/20 text-slate-200 rounded-tl-sm shadow-[0_4px_20px_rgba(6,182,212,0.05)]' 
                        : 'bg-blue-600/10 border border-blue-500/20 text-blue-50 rounded-tr-sm'
                    }`}>
                      <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      
                      {isPhoenix && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-cyan-500/10">
                          <button 
                            onClick={() => speakText(msg.text)}
                            className="p-1.5 rounded-full hover:bg-cyan-500/20 text-cyan-500/70 hover:text-cyan-400 transition-colors"
                            title="Synthesize Voice (TTS)"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                          <div className="h-3 w-[1px] bg-slate-800"></div>
                          <button 
                            onClick={() => handleFeedback(5)}
                            className="p-1.5 rounded-full hover:bg-emerald-500/20 text-slate-500 hover:text-emerald-400 transition-colors"
                            title="Positive Feedback (+5)"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleFeedback(-5)}
                            className="p-1.5 rounded-full hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                            title="Negative Feedback (-5)"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {isTyping && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                 <div className="flex gap-3">
                   <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-950 border border-cyan-500/50 flex items-center justify-center">
                      <Orbit className="w-4 h-4 text-cyan-400 animate-spin" />
                   </div>
                   <div className="px-5 py-4 rounded-2xl bg-slate-900/80 border border-cyan-500/20 rounded-tl-sm flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                   </div>
                 </div>
               </motion.div>
            )}
            <div ref={messagesEndRef} />
          </main>

          {/* Input Area */}
          <footer className="p-4 md:p-6 bg-slate-950/80 backdrop-blur-md border-t border-slate-800">
            <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex items-end gap-2 group">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Talk to Phoenix..."
                className="w-full bg-slate-900/50 border border-slate-700/50 text-slate-100 rounded-3xl px-6 py-4 pr-16 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 focus:bg-slate-900 resize-none overflow-hidden transition-all duration-300"
                rows={1}
                style={{ minHeight: '56px', maxHeight: '150px' }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="absolute right-2 bottom-2 p-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 disabled:bg-slate-800 disabled:text-slate-500 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.4)] disabled:shadow-none"
              >
                <Send className="w-5 h-5 ml-0.5" />
              </button>
            </form>
            <div className="text-center mt-3">
              <span className="text-[10px] font-mono tracking-widest text-slate-600 uppercase">Neural uplink connection secured</span>
            </div>
          </footer>
        </>
      )}

      {activeTab === 'memory' && (
        <main className="flex-1 overflow-y-auto p-4 md:p-8 w-full max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold border-b border-cyan-500/20 pb-4 flex items-center gap-3">
              <Database className="text-cyan-400" />
              Neural HD Vault
            </h2>
            <p className="text-slate-400 mt-2 font-mono text-sm">Viewing consolidated fragments in the Storage directory. Represents long-term memories retained in the core.</p>
          </div>
          <div className="space-y-4">
            {memories.length === 0 ? (
              <div className="text-center p-12 bg-slate-900/50 rounded-xl border border-dashed border-slate-700">
                <BrainCircuit className="w-8 h-8 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Neural memory bank empty.</p>
              </div>
            ) : (
              memories.map((mem) => (
                <div key={mem.id} className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl hover:border-cyan-500/30 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-mono text-cyan-500 bg-cyan-500/10 px-2 py-1 rounded">ID: {mem.id}</span>
                    <span className="text-xs text-slate-500">{new Date(mem.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">{mem.content}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500">Importance:</span>
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full max-w-[100px] overflow-hidden">
                      <div
                        className="h-full bg-emerald-400"
                        style={{ width: `${((mem.importance ?? 0) / 10) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 w-8">
                      {mem.importance ?? 0}/10
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      )}

      {activeTab === 'settings' && (
        <main className="flex-1 overflow-y-auto p-4 md:p-8 w-full max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold border-b border-cyan-500/20 pb-4 flex items-center gap-3">
              <Settings className="text-cyan-400" />
              System Engine & Routing
            </h2>
            <p className="text-slate-400 mt-2 font-mono text-sm">Telemetry and dynamic profiling panel. Subconscious base configuration.</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" /> Active Profile
            </h3>
            {profile ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800/50">
                    <span className="block text-xs font-mono text-slate-500 uppercase mb-1">Master ID</span>
                    <span className="text-slate-200">{profile.id}</span>
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800/50">
                    <span className="block text-xs font-mono text-slate-500 uppercase mb-1">Name</span>
                    <span className="text-slate-200">{profile.name}</span>
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800/50">
                    <span className="block text-xs font-mono text-slate-500 uppercase mb-1">Permission</span>
                    <span className="text-emerald-400 font-mono uppercase text-sm">{profile.role}</span>
                  </div>
                </div>
                <div className="mt-4 border-t border-slate-800 pt-4">
                  <span className="block text-xs font-mono text-slate-500 uppercase mb-3">Heuristic Preferences (Auto-Adjustable)</span>
                  <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-sm text-cyan-200 overflow-x-auto">
                    {JSON.stringify(profile.preferences, null, 2)}
                  </pre>
                  <p className="text-xs text-slate-500 mt-2">* Preferences are dynamically adjusted via the incremental learning engine.</p>
                </div>
              </div>
            ) : (
              <div className="animate-pulse flex space-x-4">
                 <div className="flex-1 space-y-4 py-1">
                   <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                   <div className="h-4 bg-slate-800 rounded w-1/2"></div>
                 </div>
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  );
}
