import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, BookOpen, Menu, Plus, Brain, Zap, Loader2, 
  Home, ChevronRight, Scale, Wallet, Heart
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
  
  const t = translations[language];
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const startNewChat = (initialText: string = "") => {
    const welcome: Message = { 
      id: 'welcome', 
      role: 'assistant', 
      content: t.introMessage, 
      timestamp: new Date() 
    };
    setMessages([welcome]);
    setView('chat');
    setIsSidebarOpen(false);
    if (initialText.trim()) {
      handleSend(initialText, [welcome]);
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
    } catch (e) {
      console.error("Generation error:", e);
      setMessages(prev => prev.map(m => 
        m.id === assistantMsgId ? { ...m, content: "Consultation failed. The server might be busy. Please try again in a moment." } : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden ${language === 'ur' ? 'rtl font-arabic' : 'ltr'}`}>
      {/* Sidebar */}
      <aside className={`fixed lg:relative inset-y-0 z-50 w-72 bg-emerald-950 text-white transform ${isSidebarOpen ? 'translate-x-0' : (language === 'ur' ? 'translate-x-full' : '-translate-x-full')} lg:translate-x-0 transition-transform duration-300 border-r border-emerald-900`}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-3 mb-10">
            <BookOpen className="text-emerald-400" />
            <h1 className="text-lg font-black tracking-tight">{t.appTitle}</h1>
          </div>
          
          <nav className="flex-1 space-y-2">
            <button 
              onClick={() => { setView('home'); setIsSidebarOpen(false); }} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'home' ? 'bg-emerald-800' : 'hover:bg-emerald-900/50'}`}
            >
              <Home size={18} /> 
              <span className="text-sm font-bold">{t.home}</span>
            </button>
            <button 
              onClick={() => startNewChat()} 
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-400 text-emerald-950 font-black mt-4 hover:bg-emerald-300 transition-transform active:scale-95 shadow-lg"
            >
              <Plus size={18} /> 
              <span>{t.newSession}</span>
            </button>
          </nav>

          <div className="pt-6 border-t border-emerald-900 space-y-4">
            <div className="flex flex-col gap-2">
               <span className="text-[10px] font-bold uppercase opacity-50 tracking-widest">{t.voiceSynthesis}</span>
               <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setSelectedVoice('Ayesha')}
                    className={`text-[10px] p-2 rounded-lg border transition-all ${selectedVoice === 'Ayesha' ? 'bg-emerald-400 text-emerald-950 border-emerald-300 font-bold' : 'border-emerald-800 hover:bg-emerald-900'}`}
                  >
                    Ayesha
                  </button>
                  <button 
                    onClick={() => setSelectedVoice('Ahmed')}
                    className={`text-[10px] p-2 rounded-lg border transition-all ${selectedVoice === 'Ahmed' ? 'bg-emerald-400 text-emerald-950 border-emerald-300 font-bold' : 'border-emerald-800 hover:bg-emerald-900'}`}
                  >
                    Ahmed
                  </button>
               </div>
            </div>
            <button 
              onClick={() => setLanguage(language === 'en' ? 'ur' : 'en')} 
              className="w-full p-3 rounded-xl bg-emerald-900 text-xs font-black uppercase tracking-wider hover:bg-emerald-800 transition-colors"
            >
              {language === 'en' ? 'اردو ورژن' : 'English Portal'}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-[#fdfbf7] relative">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-6 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"><Menu /></button>
            <div className="hidden md:flex flex-col">
              <span className="text-xs font-black uppercase tracking-widest text-emerald-900/40 leading-none">Status</span>
              <span className="text-sm font-bold text-emerald-950">System Operational</span>
            </div>
          </div>
          
          <button 
            onClick={() => setIsThinkingMode(!isThinkingMode)} 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${isThinkingMode ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-slate-100 text-slate-600 border border-transparent'}`}
          >
            {isThinkingMode ? <Brain size={14} className="text-amber-600" /> : <Zap size={14} />}
            {isThinkingMode ? t.thinkingOn : t.standard}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {view === 'home' ? (
            <div className="max-w-5xl mx-auto p-8 md:p-16 space-y-20">
              <section className="text-center space-y-8 animate-in">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 mb-4">
                  <Scale size={12} />
                  Official Scholarly Retrieval Engine
                </div>
                <h2 className="text-4xl md:text-7xl font-black text-emerald-950 leading-tight">{t.heroTitle}</h2>
                <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">{t.heroSub}</p>
                
                <div className="max-w-2xl mx-auto flex flex-col md:flex-row bg-white p-3 rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden ring-4 ring-emerald-50/50">
                  <input 
                    className="flex-1 px-6 py-4 border-none focus:ring-0 text-lg outline-none placeholder:text-slate-300" 
                    placeholder={t.placeholder} 
                    value={input} 
                    onChange={e => setInput(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && startNewChat(input)} 
                  />
                  <button 
                    onClick={() => startNewChat(input)} 
                    className="bg-emerald-950 text-white px-10 py-4 rounded-[24px] font-black uppercase text-xs hover:bg-emerald-900 transition-all active:scale-95 shadow-lg"
                  >
                    {t.consult}
                  </button>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in" style={{ animationDelay: '0.1s' }}>
                <TopicCard icon={Scale} title={t.topicSalah} prompt="What are the essential conditions for Salah?" onClick={startNewChat} />
                <TopicCard icon={Wallet} title={t.topicZakat} prompt="How is Zakat calculated on modern assets like stocks?" onClick={startNewChat} />
                <TopicCard icon={Heart} title={t.topicNikah} prompt="What are the fundamental requirements for a valid Nikah?" onClick={startNewChat} />
              </section>

              <footer className="text-center py-10 border-t border-slate-100 opacity-40">
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">{t.disclaimer}</p>
              </footer>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex-1 p-4 md:p-12 space-y-8 max-w-5xl mx-auto w-full">
                {messages.map(m => (
                  <ChatMessage 
                    key={m.id} 
                    message={m} 
                    selectedVoice={selectedVoice} 
                    onReply={(rep) => setInput(`Replying to: "${rep.content.substring(0, 30)}..." - `)} 
                  />
                ))}
                {isLoading && (
                  <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-amber-50 shadow-sm w-fit animate-pulse ml-4 md:ml-12">
                    <Loader2 className="animate-spin text-emerald-600" size={16} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.consulting}</span>
                  </div>
                )}
                <div ref={scrollRef} className="h-20" />
              </div>
              
              <div className="sticky bottom-0 p-6 bg-white/80 backdrop-blur-xl border-t border-slate-100">
                <div className="max-w-4xl mx-auto flex gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-lg">
                  <input 
                    className="flex-1 bg-transparent px-4 py-2 border-none focus:ring-0 text-sm outline-none" 
                    placeholder={t.placeholder} 
                    value={input} 
                    onChange={e => setInput(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && !isLoading && handleSend()} 
                  />
                  <button 
                    disabled={isLoading || !input.trim()}
                    onClick={() => handleSend()} 
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-95 ${isLoading || !input.trim() ? 'bg-slate-100 text-slate-300' : 'bg-emerald-950 text-white hover:bg-emerald-900'}`}
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {isSidebarOpen && <div className="fixed inset-0 bg-emerald-950/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
    </div>
  );
};

const TopicCard = ({ icon: Icon, title, prompt, onClick }: any) => (
  <button onClick={() => onClick(prompt)} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all text-left flex flex-col gap-6 group">
    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-950 group-hover:text-white transition-colors duration-500">
      <Icon size={24} />
    </div>
    <div className="flex justify-between items-center w-full">
      <span className="font-bold text-slate-800 text-lg">{title}</span>
      <ChevronRight size={18} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
    </div>
  </button>
);

export default App;