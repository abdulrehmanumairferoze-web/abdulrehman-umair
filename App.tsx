import { useState, useRef, useEffect } from 'react';
import { 
  Send, BookOpen, Menu, Plus, Brain, Zap, Loader2, 
  Home, ChevronRight, Scale, Wallet, Heart, ShieldCheck, 
  Globe, Info, MessageSquare, AlertCircle, Key
} from 'lucide-react';
import { Message, Language, VoiceType } from './types';
import { geminiService } from './services/geminiService';
import { translations } from './translations';
import { ChatMessage } from './components/ChatMessage';

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'chat'>('home');
  const [language, setLanguage] = useState<Language>('en');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<VoiceType>('Ayesha');
  const [errorState, setErrorState] = useState<{message: string, type: 'key' | 'quota' | 'general'} | null>(null);
  
  const t = translations[language];
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSelectKey = async () => {
    try {
      // @ts-ignore
      if (window.aistudio?.openSelectKey) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        setErrorState(null);
        // Resetting messages or view is not strictly required, but it gives a clean start
      } else {
        alert("API Key selection is only available within the AI Studio environment.");
      }
    } catch (e) {
      console.error("Key selection failed:", e);
    }
  };

  const handleInquirySubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    setErrorState(null);
    
    if (view === 'home') {
      const welcome: Message = { 
        id: 'welcome', 
        role: 'assistant', 
        content: t.introMessage, 
        timestamp: new Date() 
      };
      setMessages([welcome]);
      setView('chat');
      handleSend(input, [welcome]);
    } else {
      handleSend();
    }
  };

  const handleSend = async (text: string = input, currentMessages: Message[] = messages) => {
    const prompt = text.trim();
    if (!prompt) return;

    const userMsg: Message = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: prompt, 
      timestamp: new Date() 
    };
    
    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMsg: Message = { 
      id: assistantMsgId, 
      role: 'assistant', 
      content: '', 
      timestamp: new Date(),
      sources: []
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const stream = geminiService.sendMessageStream(
        prompt, 
        currentMessages, 
        isThinkingMode
      );

      let fullContent = "";
      for await (const chunk of stream) {
        if (chunk.text) {
          fullContent += chunk.text;
          setMessages(prev => prev.map(m => 
            m.id === assistantMsgId ? { ...m, content: fullContent } : m
          ));
        }
        if (chunk.sources) {
          setMessages(prev => prev.map(m => 
            m.id === assistantMsgId ? { ...m, sources: [...(m.sources || []), ...chunk.sources!] } : m
          ));
        }
      }
    } catch (e: any) {
      console.error("Generation error:", e);
      let errorMsg = t.errorGeneral;
      let type: 'key' | 'quota' | 'general' = 'general';

      if (e.message === "INVALID_KEY") {
        errorMsg = t.errorKey;
        type = 'key';
      } else if (e.message === "QUOTA_EXHAUSTED") {
        errorMsg = t.errorQuota;
        type = 'quota';
      } else if (e.message) {
        errorMsg = `API Error: ${e.message}`;
      }

      setErrorState({ message: errorMsg, type });
      setMessages(prev => prev.map(m => 
        m.id === assistantMsgId ? { ...m, content: errorMsg } : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden ${language === 'ur' ? 'rtl font-arabic' : 'ltr'}`}>
      {/* Sidebar */}
      <aside className={`fixed lg:relative inset-y-0 z-50 w-80 bg-[#042f24] text-white transform ${isSidebarOpen ? 'translate-x-0' : (language === 'ur' ? 'translate-x-full' : '-translate-x-full')} lg:translate-x-0 transition-transform duration-300 border-r border-emerald-900/50 shadow-2xl`}>
        <div className="flex flex-col h-full p-8">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <BookOpen className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none">{t.appTitle}</h1>
              <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-bold">Research Portal</span>
            </div>
          </div>
          
          <nav className="flex-1 space-y-3">
            <button 
              onClick={() => { setView('home'); setIsSidebarOpen(false); setErrorState(null); }} 
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${view === 'home' ? 'bg-emerald-800 shadow-lg' : 'hover:bg-emerald-900/40 text-emerald-100/70'}`}
            >
              <Home size={18} /> 
              <span className="text-sm font-bold">{t.home}</span>
            </button>
            <button 
              onClick={() => { setView('chat'); setMessages([]); setInput(''); setErrorState(null); }} 
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-emerald-500 text-[#042f24] font-black mt-6 hover:bg-emerald-400 transition-transform active:scale-95 shadow-xl"
            >
              <Plus size={18} /> 
              <span>{t.newSession}</span>
            </button>
          </nav>

          <div className="pt-8 border-t border-emerald-900 space-y-6">
            <div className="bg-emerald-900/30 p-4 rounded-2xl space-y-3">
               <span className="text-[9px] font-black uppercase opacity-40 tracking-widest block">{t.voiceSynthesis}</span>
               <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setSelectedVoice('Ayesha')} className={`text-[10px] p-2 rounded-xl border transition-all ${selectedVoice === 'Ayesha' ? 'bg-emerald-500 text-white border-transparent' : 'border-emerald-800 text-emerald-100/40 hover:text-white'}`}>Ayesha</button>
                  <button onClick={() => setSelectedVoice('Ahmed')} className={`text-[10px] p-2 rounded-xl border transition-all ${selectedVoice === 'Ahmed' ? 'bg-emerald-500 text-white border-transparent' : 'border-emerald-800 text-emerald-100/40 hover:text-white'}`}>Ahmed</button>
               </div>
            </div>
            <button 
              onClick={() => setLanguage(language === 'en' ? 'ur' : 'en')} 
              className="w-full p-4 rounded-2xl bg-[#064e3b] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-800 transition-all border border-emerald-900"
            >
              {language === 'en' ? 'اردو پورٹل' : 'English Portal'}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-[#fdfbf7] relative">
        <header className="h-24 bg-white/80 backdrop-blur-xl border-b border-emerald-100/50 flex items-center justify-between px-8 z-30">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-3 text-emerald-900 hover:bg-emerald-50 rounded-2xl transition-colors"><Menu /></button>
            <div className="hidden md:flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-900/30">System Status</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${errorState ? 'bg-red-500' : 'bg-emerald-500'}`} />
                <span className="text-sm font-black text-emerald-950">{errorState ? 'System Alert' : t.keyActive}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsThinkingMode(!isThinkingMode)} 
              className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all shadow-md ${isThinkingMode ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-white text-slate-400 border border-slate-100'}`}
            >
              {isThinkingMode ? <Brain size={14} className="text-amber-600" /> : <Zap size={14} />}
              {isThinkingMode ? t.thinkingOn : t.standard}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {errorState && (
            <div className="max-w-4xl mx-auto mt-8 p-6 bg-red-50 border border-red-200 rounded-3xl flex flex-col md:flex-row items-center gap-6 animate-in shadow-lg">
              <div className="flex items-center gap-4 flex-1">
                <AlertCircle className="text-red-600 flex-shrink-0" size={32} />
                <div>
                  <p className="text-sm font-black text-red-900 uppercase tracking-wide">
                    {errorState.type === 'quota' ? 'Rate Limit Exceeded' : 'Connection Error'}
                  </p>
                  <p className="text-sm font-medium text-red-800/80">{errorState.message}</p>
                </div>
              </div>
              {(errorState.type === 'key' || errorState.type === 'quota') && (
                <button 
                  onClick={handleSelectKey}
                  className="w-full md:w-auto px-8 py-3 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-red-200 ring-4 ring-red-100/50"
                >
                  <Key size={14} />
                  {t.selectKey}
                </button>
              )}
            </div>
          )}

          {view === 'home' ? (
            <div className="max-w-4xl mx-auto p-8 md:pt-32 space-y-24">
              <section className="text-center space-y-10 animate-in">
                <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-emerald-50 text-emerald-800 rounded-full text-[11px] font-black uppercase tracking-[0.15em] border border-emerald-100">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  Authorized Scholarly Engine
                </div>
                <h2 className="text-5xl md:text-8xl font-black text-emerald-950 leading-[0.9] tracking-tighter">
                  {t.heroTitle}
                </h2>
                <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
                  {t.heroSub}
                </p>
                
                <form 
                  onSubmit={handleInquirySubmit}
                  className="max-w-2xl mx-auto group relative"
                >
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-amber-500 rounded-[40px] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                  <div className="relative flex flex-col md:flex-row bg-white p-4 rounded-[36px] shadow-2xl border border-emerald-100 overflow-hidden ring-8 ring-emerald-50/30">
                    <input 
                      className="flex-1 px-8 py-5 border-none focus:ring-0 text-xl outline-none placeholder:text-slate-300 font-medium" 
                      placeholder={t.placeholder} 
                      value={input} 
                      onChange={e => setInput(e.target.value)} 
                    />
                    <button 
                      type="submit"
                      className="bg-[#042f24] text-white px-12 py-5 rounded-[28px] font-black uppercase text-xs hover:bg-emerald-900 transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3"
                    >
                      <Send size={16} />
                      {t.consult}
                    </button>
                  </div>
                </form>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in" style={{ animationDelay: '0.1s' }}>
                <TopicCard icon={Scale} title={t.topicSalah} prompt="Define the Fardh acts of Wudu as per Hanafi Fiqh." onClick={(p: string) => { setInput(p); handleInquirySubmit(); }} />
                <TopicCard icon={Wallet} title={t.topicZakat} prompt="Calculate Zakat on 10 Tola Gold with current valuation." onClick={(p: string) => { setInput(p); handleInquirySubmit(); }} />
                <TopicCard icon={Heart} title={t.topicNikah} prompt="What are the essential pillars of a valid Nikah contract?" onClick={(p: string) => { setInput(p); handleInquirySubmit(); }} />
              </section>

              <footer className="text-center py-12 border-t border-emerald-100/50">
                <p className="text-[10px] font-black text-emerald-900/40 uppercase tracking-[0.3em]">{t.disclaimer}</p>
              </footer>
            </div>
          ) : (
            <div className="flex flex-col h-full parchment-bg">
              <div className="flex-1 p-6 md:p-12 space-y-12 max-w-5xl mx-auto w-full">
                {messages.map(m => (
                  <ChatMessage 
                    key={m.id} 
                    message={m} 
                    selectedVoice={selectedVoice} 
                    onReply={(rep) => setInput(`In reference to: "${rep.content.substring(0, 40)}..." - `)} 
                  />
                ))}
                {isLoading && (
                  <div className="flex items-center gap-4 p-6 bg-white rounded-3xl border border-amber-100 shadow-xl w-fit animate-pulse ml-4 md:ml-16">
                    <Loader2 className="animate-spin text-emerald-600" size={20} />
                    <span className="text-[11px] font-black text-emerald-900 uppercase tracking-[0.2em]">{t.consulting}</span>
                  </div>
                )}
                <div ref={scrollRef} className="h-32" />
              </div>
              
              <div className="sticky bottom-0 p-8 bg-white/60 backdrop-blur-2xl border-t border-emerald-100/50">
                <form 
                  onSubmit={handleInquirySubmit}
                  className="max-w-4xl mx-auto flex gap-4 bg-white p-3 rounded-3xl border border-emerald-100 shadow-2xl ring-4 ring-emerald-50/50"
                >
                  <input 
                    className="flex-1 bg-transparent px-6 py-3 border-none focus:ring-0 text-base outline-none font-medium" 
                    placeholder={t.placeholder} 
                    value={input} 
                    onChange={e => setInput(e.target.value)} 
                  />
                  <button 
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-95 ${isLoading || !input.trim() ? 'bg-slate-100 text-slate-300' : 'bg-[#042f24] text-white hover:bg-emerald-900'}`}
                  >
                    <Send size={22} />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {isSidebarOpen && <div className="fixed inset-0 bg-emerald-950/40 backdrop-blur-md z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
    </div>
  );
};

const TopicCard = ({ icon: Icon, title, prompt, onClick }: any) => (
  <button onClick={() => onClick(prompt)} className="bg-white p-10 rounded-[40px] border border-emerald-50 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all text-left flex flex-col gap-8 group relative overflow-hidden">
    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 group-hover:bg-emerald-500 transition-colors duration-500 opacity-20 group-hover:opacity-10"></div>
    <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-[#042f24] group-hover:text-white transition-all duration-500 shadow-inner">
      <Icon size={28} />
    </div>
    <div className="space-y-2">
      <span className="block font-black text-emerald-950 text-xl tracking-tight">{title}</span>
      <span className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
        Explore Topic <ChevronRight size={14} className="text-emerald-500" />
      </span>
    </div>
  </button>
);

export default App;