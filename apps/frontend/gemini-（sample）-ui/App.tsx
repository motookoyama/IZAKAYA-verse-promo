import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PERSONAS, PAYPAL_LINKS, API_PROVIDERS } from './constants';
import type { Persona, ChatMessage, PayPalLink, ToastInfo, SoulState, TxHistoryItem } from './types';
import CharacterCard from './components/CharacterCard';
import Toast from './components/Toast';
import SoulInspectModal from './components/SoulInspectModal';

// Mock API call simulation using V2Card and Soul Core structure
const mockApi = {
  chat: async (prompt: string, cardId: Persona['id']): Promise<{ reply: string; meta: any }> => {
    await new Promise(res => setTimeout(res, 2000)); // Reduced delay
    const persona = PERSONAS[cardId];
    
    let reply = persona.sample_phrases[Math.floor(Math.random() * persona.sample_phrases.length)];
    const value = persona.soul_core.values[Math.floor(Math.random() * persona.soul_core.values.length)];

    if (persona.tone === 'logical') {
        reply = `[${value}に基づいて思考]: ${reply} ご質問の「${prompt}」について、私の見解は以上の通りです。`;
    } else { // friendly tone
        reply = `[${value}を込めてお答えします]: ${reply} 「${prompt}」とのこと、承知いたしました。`;
    }
    
    return { 
      reply, 
      meta: { provider: "Gemini", model: "Flash (mock)", card: persona.name } 
    };
  }
};

const getContrastYIQ = (hexcolor: string) => {
    hexcolor = hexcolor.replace("#", "");
    const r = parseInt(hexcolor.substr(0, 2), 16);
    const g = parseInt(hexcolor.substr(2, 2), 16);
    const b = parseInt(hexcolor.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? 'black' : 'white';
}

const Header: React.FC<{ isDarkMode: boolean; onToggleDarkMode: () => void }> = ({ isDarkMode, onToggleDarkMode }) => (
  <header className="flex justify-between items-center p-4 border-b border-white/10 flex-shrink-0">
    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-izakaya-pink to-izakaya-red">IZAKAYA Lite Preview</h1>
    <button onClick={onToggleDarkMode} className="p-2 rounded-full hover:bg-white/10 transition-colors">
      <i data-lucide={isDarkMode ? 'sun' : 'moon'} className="w-6 h-6"></i>
    </button>
  </header>
);

const Footer: React.FC = () => (
    <footer className="text-center p-4 text-xs text-slate-400">
        © moto koyama / IZAKAYA verse
    </footer>
);

const App: React.FC = () => {
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('izakaya-dark-mode') === 'true');
    const [selectedPersonaId, setSelectedPersonaId] = useState<Persona['id']>('miss_madi');
    const [messages, setMessages] = useState<ChatMessage[]>(() => JSON.parse(localStorage.getItem('izakaya-chat-history') || '[]'));
    const [walletBalance, setWalletBalance] = useState(() => parseInt(localStorage.getItem('izakaya-wallet-balance') || '1000', 10));
    const [txHistory, setTxHistory] = useState<TxHistoryItem[]>(() => JSON.parse(localStorage.getItem('izakaya-tx-history') || '[]'));
    const [apiProvider, setApiProvider] = useState(() => localStorage.getItem('izakaya-api-provider') || API_PROVIDERS[0]);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [toasts, setToasts] = useState<ToastInfo[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const showToast = (message: string, type: ToastInfo['type'] = 'info') => {
      const iconMap = { success: 'check-circle', info: 'info', error: 'alert-circle' };
      const newToast: ToastInfo = { id: Date.now(), message, type, icon: iconMap[type] };
      setToasts(prev => [...prev, newToast]);
    };
    
    const dismissToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDarkMode);
        localStorage.setItem('izakaya-dark-mode', isDarkMode.toString());
    }, [isDarkMode]);

    useEffect(() => { localStorage.setItem('izakaya-wallet-balance', walletBalance.toString()); }, [walletBalance]);
    useEffect(() => { localStorage.setItem('izakaya-chat-history', JSON.stringify(messages)); }, [messages]);
    useEffect(() => { localStorage.setItem('izakaya-tx-history', JSON.stringify(txHistory)); }, [txHistory]);
    useEffect(() => { localStorage.setItem('izakaya-api-provider', apiProvider); }, [apiProvider]);
    
    useEffect(() => {
        const activePersona = PERSONAS[selectedPersonaId];
        const soulState: SoulState = {
            persona_id: selectedPersonaId,
            resonance_level: (Math.random() * 0.2 + 0.8).toFixed(2), // e.g., "0.82"
            last_guideline: activePersona.soul_core.guideline,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('izakaya-soul-state', JSON.stringify(soulState));
    }, [selectedPersonaId]);

    useEffect(() => { (window as any).lucide?.createIcons(); });
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    useEffect(() => {
      if (messages.length === 0) {
        setMessages([{
          id: Date.now().toString(),
          text: 'IZAKAYA Liteへようこそ！会話したいキャラクターを選んで、メッセージを送ってください。',
          sender: 'miss_madi',
          timestamp: new Date().toISOString()
        }]);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    const addTxHistory = (type: 'redeem' | 'consume', amount: number) => {
      const newTx: TxHistoryItem = { id: `tx-${Date.now()}`, type, amount, timestamp: new Date().toISOString() };
      setTxHistory(prev => [newTx, ...prev].slice(0, 10));
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isSending) return;
        const userMessage: ChatMessage = { id: Date.now().toString(), text: input, sender: 'user', timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsSending(true);
        try {
            const response = await mockApi.chat(input, selectedPersonaId);
            const aiMessage: ChatMessage = { id: (Date.now() + 1).toString(), text: response.reply, sender: selectedPersonaId, timestamp: new Date().toISOString(), meta: response.meta };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) { showToast("メッセージの送信に失敗しました。", "error"); } 
        finally { setIsSending(false); }
    };
    
    const handleRedeem = useCallback(() => {
        const amount = 1000;
        setWalletBalance(prev => prev + amount);
        showToast(`${amount}P が追加されました！ (TX-ID: ${Date.now()})`, 'success');
        addTxHistory('redeem', amount);
    }, []);

    const handleConsume = useCallback(() => {
        const amount = 150;
        if (walletBalance >= amount) {
            setWalletBalance(prev => prev - amount);
            showToast(`${amount}P を消費しました。`, 'info');
            addTxHistory('consume', amount);
        } else {
            showToast("ポイント残高が不足しています。", "error");
        }
    }, [walletBalance]);

    const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newProvider = e.target.value;
        setApiProvider(newProvider);
        showToast(`APIプロバイダを ${newProvider} に設定しました。`, 'info');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-100 via-red-100 to-pink-200 dark:from-slate-800 dark:via-red-900/50 dark:to-slate-900 transition-colors duration-300">
            <div className="container mx-auto p-0 sm:p-4 max-w-7xl">
                <div className="flex flex-col lg:flex-row gap-4 h-screen sm:h-[calc(100vh-2rem)]">
                    <main className="lg:w-2/3 flex flex-col bg-white/30 dark:bg-black/20 rounded-none sm:rounded-xl shadow-lg overflow-hidden glassmorphism">
                        <Header isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} />
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[calc(100vh-200px)] lg:max-h-full">
                            {messages.map((msg) => {
                                const isUser = msg.sender === 'user';
                                const persona = !isUser ? PERSONAS[msg.sender] : null;
                                const bubbleStyle = !isUser && persona ? { backgroundColor: persona.color, color: getContrastYIQ(persona.color) } : {};
                                return (
                                    <div key={msg.id} className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                                        {!isUser && persona && <img src={persona.avatarUrl} alt={persona.name} className="w-10 h-10 rounded-full self-start flex-shrink-0" />}
                                        <div className={`max-w-md p-3 rounded-2xl ${isUser ? 'bg-izakaya-red text-white rounded-br-none' : 'rounded-bl-none'}`} style={bubbleStyle}>
                                            <p className="text-sm break-words">{msg.text}</p>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={chatEndRef} />
                        </div>

                        <div className="p-4 border-t border-white/20 flex-shrink-0">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 rounded-lg p-1">
                                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={isSending ? '通信中... 少々お待ちください' : `${PERSONAS[selectedPersonaId].name}へメッセージを送信...`} className="flex-1 bg-transparent p-2 focus:outline-none text-slate-800 dark:text-slate-200" disabled={isSending} />
                                <button type="submit" disabled={isSending || !input.trim()} className="p-2 rounded-full bg-izakaya-red text-white disabled:bg-slate-400 transition-colors">
                                    <i data-lucide="send-horizontal" className="w-5 h-5"></i>
                                </button>
                            </form>
                            <div className="flex justify-center mt-2">
                                <button onClick={() => setIsModalOpen(true)} className="text-xs text-slate-500 dark:text-slate-400 hover:text-izakaya-pink dark:hover:text-izakaya-pink transition-colors py-1 px-3 rounded-full hover:bg-black/10 dark:hover:bg-white/10">ソウル確認</button>
                            </div>
                        </div>
                    </main>

                    <aside className="lg:w-1/3 flex flex-col gap-4 overflow-y-auto p-4 sm:p-0">
                        <div className="p-4 rounded-xl space-y-4 glassmorphism"><h2 className="text-lg font-semibold text-white">Card Dock</h2>{Object.values(PERSONAS).map(p => <CharacterCard key={p.id} persona={p} isSelected={selectedPersonaId === p.id} onSelect={setSelectedPersonaId} />)}</div>
                        <div className="p-4 rounded-xl space-y-3 glassmorphism"><h2 className="text-lg font-semibold text-white">Wallet Balance</h2><div className="text-center text-4xl font-bold py-4 bg-black/20 rounded-lg text-white">{walletBalance.toLocaleString()} P</div><div className="flex gap-2"><button onClick={handleRedeem} className="flex-1 bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition-colors">ポイント加算テスト</button><button onClick={handleConsume} className="flex-1 bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors">ポイント消費テスト</button></div></div>
                        <div className="p-4 rounded-xl space-y-3 glassmorphism"><h2 className="text-lg font-semibold text-white">Purchase Points</h2><div className="flex flex-wrap gap-2">{PAYPAL_LINKS.map(link => <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="flex-grow text-center p-2 text-sm rounded-lg bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold transition-colors">{link.label} <span className="font-normal text-xs">({link.subLabel})</span></a>)}</div></div>
                        <div className="p-4 rounded-xl space-y-2 glassmorphism"><h2 className="text-lg font-semibold text-white">API Provider</h2><select value={apiProvider} onChange={handleProviderChange} className="w-full p-2 rounded-lg bg-slate-700 text-white border border-slate-500 focus:outline-none focus:ring-2 focus:ring-izakaya-pink">{API_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                        <Footer/>
                    </aside>
                </div>
            </div>
            {toasts.map(toast => <Toast key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />)}
            {isModalOpen && <SoulInspectModal persona={PERSONAS[selectedPersonaId]} onClose={() => setIsModalOpen(false)} />}
        </div>
    );
};

export default App;
