
import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, BookOpen, AlertCircle, Menu, X, Trash2, ShieldCheck, 
  Plus, MessageSquare, Brain, Zap, History, Loader2, 
  Mic, MicOff, Image as ImageIcon, CornerDownRight, 
  Languages, Home, Search, ChevronRight, GraduationCap, 
  Scale, Wallet, Heart, Moon, Users
} from 'lucide-react';
import { Message, ChatSession, VoiceType, Source, Language } from './types';
import { geminiService } from './services/geminiService';
import { ChatMessage } from './components/ChatMessage';
import { translations } from './translations';

const STORAGE_KEY = 'al_fiqh_web_v1';
const ACTIVE_VIEW_KEY = 'al_fiqh_view';

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'chat'>('home');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [language, setLanguage] = useState<Language>('en');
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceType>('Ayesha');
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<{ message: string; type: 'general' | 'quota' } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const t = translations[language];
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedSessions = localStorage.getItem(STORAGE_KEY);
    const savedView = localStorage.getItem(ACTIVE_VIEW_KEY) as 'home' | 'chat';
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
        })));
      } catch (e) {}
    }
    if (savedView) setView(savedView);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    localStorage.setItem(ACTIVE_VIEW_KEY, view);
  }, [sessions, view]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = language === 'ur' ? 'ur-PK' : 'en-US';
      recognitionRef.current.onresult = (e: any) => {
        setInput(prev => prev + (prev ? ' ' : '') + e.results[0][0].transcript);
        setIsListening(false);
      };
    }
  }, [language]);

  const startNewChat = (initialInput?: string) => {
    const id = Date.now().toString();
    const newSession: ChatSession = {
      id,
      title: initialInput ? initialInput.substring(0, 30) + '...' : t.newSession,
      messages: [{ id: 'welcome', role: 'assistant', content: t.introMessage, timestamp: new Date() }],
      createdAt: new Date()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(id);
    setMessages(newSession.messages);
    setView('chat');
    if (initialInput) {
      handleSend(initialInput, id, true);
    }
  };

  const switchSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setActiveSessionId(sessionId);
      setMessages(session.messages);
      setView('chat');
      setIsSidebarOpen(false);
    }
  };

  const handleSend = async (textInput: string = input, sessionId: string = activeSessionId, isNew: boolean = false) => {
    const finalPrompt = textInput.trim();
    if (!finalPrompt && !selectedImage) return;

    let targetId = sessionId;
    if (!targetId) {
      targetId = Date.now().toString();
      const newSession: ChatSession = {
        id: targetId,
        title: finalPrompt ? finalPrompt.substring(0, 30) : 'New Inquiry',
        messages: [{ id: 'welcome', role: 'assistant', content: t.introMessage, timestamp: new Date() }],
        createdAt: new Date()
      };
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(targetId);
      setMessages(newSession.messages);
    }

    const userMsg: Message = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: finalPrompt || "(Analyzed image)", 
      timestamp: new Date(),
      image: selectedImage ? { ...selectedImage } : undefined,
      replyTo: replyTo ? { id: replyTo.id, content: replyTo.content, role: replyTo.role } : undefined
    };

    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMsg: Message = { id: assistantMsgId, role: 'assistant', content: '', timestamp: new Date() };
    
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
    setReplyTo(null);
    const img = selectedImage;
    setSelectedImage(null);
    setIsLoading(true);
    setView('chat');

    try {
      const stream = geminiService.sendMessageStream(finalPrompt, messages, isThinkingMode, img || undefined);
      let content = '';
      let sources: Source[] = [];
      for await (const chunk of stream) {
        if (chunk.text) content += chunk.text;
        if (chunk.sources) sources = [...sources, ...chunk.sources];
        setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content, sources } : m));
      }
      setSessions(prev => prev.map(s => s.id === targetId ? { ...s, messages: [...messages, userMsg, { ...assistantMsg, content, sources }] } : s));
    } catch (err) {
      setError({ message: "Search interrupted.", type: 'general' });
    } finally {
      setIsLoading(false);
    }
  };

  const TopicCard = ({ icon: Icon, title, prompt }: { icon: any, title: string, prompt: string }) => (
    <button 
      onClick={() => startNewChat(prompt)}
      className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group text-left flex flex-col gap-4"
    >
      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-950 group-hover:text-white transition-colors">
        <Icon size={24} />
      </div>
      <div className="flex justify-between items-center w-full">
        <span className="font-bold text-slate-800">{title}</span>
        <ChevronRight size={16} className="text-slate-300 group-hover:text-emerald-600 transition-colors" />
      </div>
    </button>
  );

  return (
    <div className={`flex h-screen bg-white text-slate-900 font-sans overflow-hidden ${language === 'ur' ? 'rtl font-arabic' : 'ltr'}`}>
      {/* Universal Navigation Drawer */}
      <div className={`fixed inset-y-0 ${language === 'ur' ? 'right-0' : 'left-0'} z-50 w-80 bg-[#064e3b] text-white transform ${isSidebarOpen ? 'translate-x-0' : (language === 'ur' ? 'translate-x-full' : '-translate-x-full')} transition-transform duration-500 lg:relative lg:translate-x-0 border-r border-emerald-900/50 shadow-2xl`}>
        <div className="flex flex-col h-full">
          <div className="p-8 border-b border-emerald-900/50">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-400 p-2.5 rounded-2xl shadow-lg text-emerald-950"><BookOpen size={26} /></div>
              <h1 className="text-xl font-black tracking-tight leading-tight">{t.appTitle}</h1>
            </div>
          </div>
          
          <div className="p-5 flex-1 overflow-y-auto space-y-8">
            <nav className="space-y-2">
              <button onClick={() => { setView('home'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'home' ? 'bg-emerald-800 text-white' : 'text-emerald-100/60 hover:bg-emerald-900'}`}>
                <Home size={18} /> <span className="text-sm font-bold">{t.home}</span>
              </button>
              <button onClick={() => { setView('chat'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'chat' ? 'bg-emerald-800 text-white' : 'text-emerald-100/60 hover:bg-emerald-900'}`}>
                <GraduationCap size={18} /> <span className="text-sm font-bold">{t.consult}</span>
              </button>
            </nav>

            <button onClick={() => startNewChat()} className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-emerald-400 text-emerald-950 font-black text-xs uppercase shadow-lg hover:bg-emerald-300 transition-all">
              <Plus size={18} /> {t.newSession}
            </button>

            <section>
              <h2 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4 opacity-70 px-1">{t.history}</h2>
              <div className="space-y-2">
                {sessions.map(s => (
                  <div key={s.id} onClick={() => switchSession(s.id)} className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${activeSessionId === s.id && view === 'chat' ? 'bg-emerald-900 border border-emerald-800' : 'hover:bg-emerald-900/50'}`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      <MessageSquare size={14} className="text-emerald-500 shrink-0" />
                      <span className="text-xs font-medium truncate">{s.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
          
          <div className="p-6 bg-emerald-950/50 border-t border-emerald-900/50">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-emerald-400/50">{t.language}</span>
                <button onClick={() => setLanguage(language === 'en' ? 'ur' : 'en')} className="p-2 rounded-lg bg-emerald-900 text-[10px] font-black">
                  {language === 'en' ? 'URDU' : 'ENGLISH'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full bg-[#fdfbf7] relative overflow-hidden">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-6 z-30">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600"><Menu size={24} /></button>
          <div className="hidden lg:flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.liveArchive}</span>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => setIsThinkingMode(!isThinkingMode)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${isThinkingMode ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-slate-100 text-slate-600'}`}>
               {isThinkingMode ? <Brain size={14} className="text-amber-600" /> : <Zap size={14} />}
               {isThinkingMode ? t.thinkingOn : t.standard}
             </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-hide">
          {view === 'home' ? (
            <div className="max-w-6xl mx-auto p-6 md:p-12 space-y-16">
              {/* Hero Section */}
              <section className="text-center space-y-8 py-12">
                <div className="space-y-4">
                  <h2 className="text-4xl md:text-6xl font-black text-emerald-950 tracking-tight leading-none">
                    {t.heroTitle}
                  </h2>
                  <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">
                    {t.heroSub}
                  </p>
                </div>

                <div className="max-w-3xl mx-auto relative group">
                  <div className="absolute inset-0 bg-emerald-500/10 blur-3xl group-focus-within:bg-emerald-500/20 transition-all rounded-full" />
                  <div className="relative flex items-center bg-white p-2 rounded-[32px] shadow-2xl border border-slate-100 focus-within:border-emerald-500 transition-all">
                    <div className="p-4 text-slate-400"><Search size={24} /></div>
                    <input 
                      type="text" 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && startNewChat(input)}
                      placeholder={t.placeholder}
                      className="flex-1 bg-transparent border-none focus:ring-0 text-lg font-medium py-4 px-2"
                    />
                    <button 
                      onClick={() => startNewChat(input)}
                      className="bg-emerald-950 text-white px-8 py-4 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-emerald-900 transition-all active:scale-95"
                    >
                      {t.consult}
                    </button>
                  </div>
                </div>
              </section>

              {/* Topics Grid */}
              <section className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-emerald-950 uppercase tracking-tight">{t.quickTopics}</h3>
                  <button className="text-emerald-700 font-bold text-sm hover:underline">{t.viewAll}</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <TopicCard icon={Scale} title={t.topicSalah} prompt="Explain the basic requirements and fardh of Salah (Prayer) according to Hanafi Fiqh." />
                  <TopicCard icon={Wallet} title={t.topicZakat} prompt="What are the current rules for calculating Zakat on gold, silver, and cash? Please provide references." />
                  <TopicCard icon={Heart} title={t.topicNikah} prompt="What are the essential pillars (Arkan) of Nikah in Islamic jurisprudence?" />
                  <TopicCard icon={Moon} title={t.topicFast} prompt="What common things invalidate a fast and what requires Kaffarah or just Qadha?" />
                  <TopicCard icon={Users} title={t.topicInherit} prompt="How is inheritance typically distributed among children and spouses when a father passes away?" />
                  <TopicCard icon={ShieldCheck} title={t.topicBusiness} prompt="What are the main haram elements to avoid in modern banking and trade contracts?" />
                </div>
              </section>

              {/* Institutions Section */}
              <section className="bg-emerald-950 text-white rounded-[40px] p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
                  <div className="space-y-6">
                    <h3 className="text-3xl font-black leading-tight">{t.sources}</h3>
                    <div className="grid grid-cols-1 gap-4">
                      {['Jamia Binoria (banuri.edu.pk)', 'Darul Uloom Karachi', 'Darul Ifta Deoband', 'Suffah PK'].map(source => (
                        <div key={source} className="flex items-center gap-3 bg-emerald-900/40 p-4 rounded-2xl border border-emerald-800/50">
                          <ShieldCheck className="text-emerald-400" size={20} />
                          <span className="font-bold text-sm opacity-90">{source}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10 space-y-4">
                    <GraduationCap size={48} className="text-emerald-400" />
                    <p className="text-lg font-medium opacity-80 leading-relaxed italic">
                      "I strive to bring the vast heritage of Islamic jurisprudence to your fingertips, ensuring every answer is backed by authorized archives."
                    </p>
                    <div className="pt-4 border-t border-white/10">
                      <p className="font-black text-xs uppercase tracking-widest text-emerald-400">Al Fiqh Assistant</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <div className="flex flex-col h-full bg-[#faf9f6]">
              <div className="flex-1 overflow-y-auto p-4 md:p-12 space-y-10 scrollbar-hide">
                {messages.map((m) => (
                  <ChatMessage key={m.id} message={m} selectedVoice={selectedVoice} onReply={setReplyTo} />
                ))}
                {isLoading && (
                  <div className={`flex ${language === 'ur' ? 'justify-end' : 'justify-start'}`}>
                    <div className="bg-white p-6 rounded-[30px] rounded-tl-none shadow-xl border border-amber-100 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-950 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                      </div>
                      <div className="flex flex-col">
                         <span className="text-[10px] font-black text-amber-900 uppercase tracking-widest animate-pulse">{t.consulting}</span>
                         <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{t.authorizedOnly}</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-4" />
              </div>

              {/* Chat Input Overlay */}
              <div className="p-6 bg-white border-t border-slate-100">
                <div className="max-w-4xl mx-auto space-y-4">
                  {replyTo && (
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-2xl border border-emerald-100 animate-in slide-in-from-bottom-2">
                      <CornerDownRight size={14} className="text-emerald-700" />
                      <p className="text-xs truncate font-medium flex-1">{replyTo.content}</p>
                      <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-emerald-200/50 rounded-lg"><X size={14} /></button>
                    </div>
                  )}
                  <div className="relative flex items-center bg-[#f8fafc] p-1.5 rounded-[28px] border border-slate-200 focus-within:border-emerald-500/50 transition-all">
                    <button onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-400 hover:text-emerald-600"><ImageIcon size={20} /></button>
                    <input type="file" ref={fileInputRef} onChange={(e) => {
                      const file = e.target.files?.[0];
                      if(file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setSelectedImage({ data: (reader.result as string).split(',')[1], mimeType: file.type });
                        reader.readAsDataURL(file);
                      }
                    }} className="hidden" />
                    
                    <textarea 
                      value={input} 
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                      placeholder={t.placeholder}
                      className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium resize-none max-h-40 py-3"
                      rows={1}
                    />
                    
                    <button onClick={() => handleSend()} className="w-12 h-12 bg-emerald-950 text-white rounded-full flex items-center justify-center hover:bg-emerald-900 transition-all">
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      
      {isSidebarOpen && <div className="fixed inset-0 bg-emerald-950/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
    </div>
  );
};

export default App;
