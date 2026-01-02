import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, BookOpen, Menu, X, ShieldCheck, 
  Plus, MessageSquare, Brain, Zap, Loader2, 
  Home, ChevronRight, Scale, Wallet, Heart, 
  Users, BadgeCheck, Volume2, Square, Book, 
  Copy, Check, Share2
} from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";

// --- Types ---
type Language = 'en' | 'ur';
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// --- Constants ---
const SYSTEM_INSTRUCTION = `You are the "Darul Ifta Multi-Source Assistant". Your core purpose is to provide 100% accurate Islamic Fiqh information sourced EXCLUSIVELY from authorized search results (banuri.edu.pk, darululoomkarachi.edu.pk, darulifta-deoband.com, etc).
1. VERIFIED FATWA REQUIREMENT: If the search results do NOT contain a relevant fatwa, state: "No verified fatwa is available in the authorized archives for this specific inquiry."
2. FATWA ID ACCURACY: Extract the Fatwa ID/Number exactly. NEVER guess.
3. VERBATIM RECORDS: Provide a bit-for-bit exact copy in the verbatim section.

OUTPUT FORMAT:
[Scholarly answer in requested language]

OFFICIAL VERBATIM RECORD:
[Institution Name]
Fatwa ID: [Correct ID or Title]
[Exact Verbatim Text]`;

const translations = {
  en: {
    appTitle: "Al Fiqh Assistant",
    home: "Home",
    consult: "Ask Scholar",
    newSession: "New Inquiry",
    thinkingOn: "Deep Logic",
    standard: "Standard",
    placeholder: "Search archives or ask a question...",
    consulting: "Searching Jurisprudence...",
    heroTitle: "Digital Gateway to Islamic Jurisprudence",
    heroSub: "Real-time AI verification across major Darul Ifta archives including Jamia Binoria and Darul Uloom Karachi.",
    topicSalah: "Prayer & Rituals",
    topicZakat: "Zakat & Charity",
    topicNikah: "Family & Marriage",
    introMessage: "Welcome to Al Fiqh Assistant. I am your AI assistant for Islamic Fiqh, grounded exclusively in the databases of Jamia Binoria, Darul Uloom Karachi, and other authorized institutions."
  },
  ur: {
    appTitle: "الفقہ اسسٹنٹ",
    home: "ہوم",
    consult: "سوال پوچھیں",
    newSession: "نیا سوال",
    thinkingOn: "گہری تحقیق",
    standard: "معیاری",
    placeholder: "آرکائیوز میں تلاش کریں یا سوال پوچھیں...",
    consulting: "تحقیق جاری ہے...",
    heroTitle: "اسلامی فقہ کا ڈیجیٹل دروازہ",
    heroSub: "جامعہ بنوریہ، دارالعلوم کراچی اور دیگر مستند ذرائع سے براہ راست تصدیق شدہ معلومات۔",
    topicSalah: "نماز اور عبادات",
    topicZakat: "زکوٰۃ اور صدقات",
    topicNikah: "نکاح اور خاندان",
    introMessage: "الفقہ اسسٹنٹ میں خوش آمدید۔ میں آپ کا فقہی اسسٹنٹ ہوں، جو صرف جامعہ بنوریہ اور دیگر مجاز اداروں کے ڈیٹا سے رہنمائی فراہم کرتا ہوں۔"
  }
};

const isUrduText = (text: string) => /[\u0600-\u06FF]/.test(text);

// --- Sub-components ---
const ChatBubble: React.FC<{ message: Message; language: Language }> = ({ message, language }) => {
  const isAssistant = message.role === 'assistant';
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const splitContent = (content: string) => {
    const verbatimKeyword = "OFFICIAL VERBATIM RECORD";
    if (content.includes(verbatimKeyword)) {
      const parts = content.split(verbatimKeyword);
      return { answer: parts[0], verbatim: parts[1].replace(/^[:\s-]+/, '') };
    }
    return { answer: content, verbatim: null };
  };

  const { answer, verbatim } = splitContent(message.content);

  const handlePlay = async () => {
    if (isPlaying) {
      activeSourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
      activeSourcesRef.current.clear();
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: answer.substring(0, 1000) }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
        }
      });
      const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64) {
        if (!audioContextRef.current) audioContextRef.current = new AudioContext({ sampleRate: 24000 });
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const dataInt16 = new Int16Array(bytes.buffer);
        const buffer = audioContextRef.current.createBuffer(1, dataInt16.length, 24000);
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;

        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.start();
        activeSourcesRef.current.add(source);
        source.onended = () => setIsPlaying(false);
      } else { setIsPlaying(false); }
    } catch (e) { 
      console.error("Audio playback error:", e);
      setIsPlaying(false); 
    }
  };

  return (
    <div className={`flex w-full mb-6 animate-in ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex w-full max-w-[95%] lg:max-w-[85%] ${isAssistant ? 'flex-row' : 'flex-row-reverse'}`}>
        <div className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center shadow-lg ${isAssistant ? 'bg-emerald-950 text-white' : 'bg-slate-200 text-slate-600'}`}>
          {isAssistant ? <ShieldCheck size={20} /> : <Users size={20} />}
        </div>
        <div className={`mx-3 flex-1 shadow-xl rounded-2xl p-5 md:p-8 ${isAssistant ? 'bg-white border border-amber-100 rounded-tl-none' : 'bg-emerald-900 text-white rounded-tr-none'}`}>
          {isAssistant && (
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-50">
              <div className="flex items-center gap-2">
                <BadgeCheck size={14} className="text-amber-600" />
                <span className="text-[10px] font-black uppercase text-emerald-950">Al Fiqh Assistant</span>
              </div>
              <button onClick={handlePlay} className={`p-2 rounded-full transition-all ${isPlaying ? 'bg-red-500 text-white' : 'bg-emerald-50 text-emerald-950'}`}>
                {isPlaying ? <Square size={12} fill="currentColor" /> : <Volume2 size={12} />}
              </button>
            </div>
          )}
          <div className="space-y-4">
            {answer.split('\n').map((line, i) => (
              <p key={i} dir={isUrduText(line) ? 'rtl' : 'ltr'} className={`${isUrduText(line) ? 'font-arabic text-xl md:text-2xl' : 'text-sm md:text-base font-medium'} ${isAssistant ? 'text-slate-900' : 'text-white'}`}>
                {line}
              </p>
            ))}
          </div>
          {isAssistant && verbatim && (
            <div className="mt-6 pt-4 border-t border-dashed border-amber-200">
              <div className="flex items-center gap-2 mb-3">
                <Book size={12} className="text-amber-700" />
                <span className="text-[10px] font-black uppercase text-amber-900">Archive Reference</span>
              </div>
              <div className="bg-amber-50/50 p-4 rounded-xl text-sm italic text-slate-700">
                {verbatim}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Main App ---
const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'chat'>('home');
  const [language, setLanguage] = useState<Language>('en');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const t = translations[language];
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const startNewChat = (initialText: string = "") => {
    const welcome: Message = { id: 'welcome', role: 'assistant', content: t.introMessage, timestamp: new Date() };
    setMessages([welcome]);
    setView('chat');
    setIsSidebarOpen(false);
    if (initialText) handleSend(initialText, [welcome]);
  };

  const handleSend = async (text: string = input, currentMessages: Message[] = messages) => {
    const prompt = text.trim();
    if (!prompt) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: prompt, timestamp: new Date() };
    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMsg: Message = { id: assistantMsgId, role: 'assistant', content: '', timestamp: new Date() };

    setMessages([...currentMessages, userMsg, assistantMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const searchSites = 'site:banuri.edu.pk OR site:darululoomkarachi.edu.pk OR site:darulifta-deoband.com OR site:suffahpk.com OR site:darulifta.info';
      const stream = await ai.models.generateContentStream({
        model: isThinkingMode ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview',
        contents: [
          ...currentMessages.filter(m => m.id !== 'welcome').slice(-4).map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
          })),
          { role: 'user', parts: [{ text: `[AUTHORIZED_ONLY] SITES: ${searchSites} | QUERY: ${prompt}` }] }
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ googleSearch: {} }],
          ...(isThinkingMode && { thinkingConfig: { thinkingBudget: 4000 } })
        }
      });

      let fullContent = "";
      for await (const chunk of stream) {
        if (chunk.text) {
          fullContent += chunk.text;
          setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: fullContent } : m));
        }
      }
    } catch (e) {
      console.error("Generation error:", e);
      setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: "Consultation failed. Please check your connection." } : m));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden ${language === 'ur' ? 'rtl font-arabic' : 'ltr'}`}>
      <aside className={`fixed lg:relative inset-y-0 z-50 w-72 bg-emerald-950 text-white transform ${isSidebarOpen ? 'translate-x-0' : (language === 'ur' ? 'translate-x-full' : '-translate-x-full')} lg:translate-x-0 transition-transform duration-300 border-r border-emerald-900`}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-3 mb-10">
            <BookOpen className="text-emerald-400" />
            <h1 className="text-lg font-black">{t.appTitle}</h1>
          </div>
          <nav className="flex-1 space-y-2">
            <button onClick={() => setView('home')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${view === 'home' ? 'bg-emerald-800' : 'hover:bg-emerald-900/50'}`}>
              <Home size={18} /> <span className="text-sm font-bold">{t.home}</span>
            </button>
            <button onClick={() => startNewChat()} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-400 text-emerald-950 font-black mt-4 hover:bg-emerald-300 transition-colors">
              <Plus size={18} /> <span>{t.newSession}</span>
            </button>
          </nav>
          <div className="pt-6 border-t border-emerald-900">
            <button onClick={() => setLanguage(language === 'en' ? 'ur' : 'en')} className="w-full p-3 rounded-xl bg-emerald-900 text-xs font-black uppercase tracking-wider">
              {language === 'en' ? 'Urdu Version' : 'English Version'}
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-[#fdfbf7] relative">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-6">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600"><Menu /></button>
          <button onClick={() => setIsThinkingMode(!isThinkingMode)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${isThinkingMode ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-slate-100 text-slate-600'}`}>
            {isThinkingMode ? <Brain size={14} className="text-amber-600" /> : <Zap size={14} />}
            {isThinkingMode ? t.thinkingOn : t.standard}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {view === 'home' ? (
            <div className="max-w-5xl mx-auto p-8 md:p-16 space-y-16">
              <section className="text-center space-y-8 animate-in">
                <h2 className="text-4xl md:text-6xl font-black text-emerald-950">{t.heroTitle}</h2>
                <p className="text-lg text-slate-500 max-w-2xl mx-auto">{t.heroSub}</p>
                <div className="max-w-2xl mx-auto flex bg-white p-2 rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                  <input className="flex-1 px-4 py-3 border-none focus:ring-0 text-lg outline-none" placeholder={t.placeholder} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && startNewChat(input)} />
                  <button onClick={() => startNewChat(input)} className="bg-emerald-950 text-white px-8 rounded-2xl font-black uppercase text-xs hover:bg-emerald-900 transition-colors">{t.consult}</button>
                </div>
              </section>
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in" style={{ animationDelay: '0.1s' }}>
                <TopicCard icon={Scale} title={t.topicSalah} prompt="Conditions for Salah?" onClick={startNewChat} />
                <TopicCard icon={Wallet} title={t.topicZakat} prompt="Zakat calculation rules?" onClick={startNewChat} />
                <TopicCard icon={Heart} title={t.topicNikah} prompt="Pillars of Nikah?" onClick={startNewChat} />
              </section>
            </div>
          ) : (
            <div className="flex flex-col h-full bg-[#faf9f6]">
              <div className="flex-1 p-6 md:p-12 space-y-2">
                {messages.map(m => <ChatBubble key={m.id} message={m} language={language} />)}
                {isLoading && (
                  <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-amber-50 shadow-sm w-fit animate-pulse">
                    <Loader2 className="animate-spin text-emerald-600" size={16} />
                    <span className="text-xs font-black text-slate-400 uppercase">{t.consulting}</span>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
              <div className="p-6 bg-white border-t border-slate-100">
                <div className="max-w-4xl mx-auto flex gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                  <input className="flex-1 bg-transparent px-4 py-2 border-none focus:ring-0 text-sm outline-none" placeholder={t.placeholder} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} />
                  <button onClick={() => handleSend()} className="w-10 h-10 bg-emerald-950 text-white rounded-xl flex items-center justify-center hover:bg-emerald-900 transition-colors shadow-lg active:scale-95"><Send size={18} /></button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      {isSidebarOpen && <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
    </div>
  );
};

const TopicCard = ({ icon: Icon, title, prompt, onClick }: any) => (
  <button onClick={() => onClick(prompt)} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all text-left flex flex-col gap-4 group">
    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-950 group-hover:text-white transition-colors">
      <Icon size={20} />
    </div>
    <div className="flex justify-between items-center">
      <span className="font-bold text-slate-800">{title}</span>
      <ChevronRight size={14} className="text-slate-300" />
    </div>
  </button>
);

export default App;