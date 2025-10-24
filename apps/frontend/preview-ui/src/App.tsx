import React, { useEffect, useMemo, useRef, useState } from "react";
import drOrbAvatar from "./assets/dr-orb.png";
import missMadiAvatar from "./assets/miss-madi.png";

type Role = "user" | "ai";

type CardRecord = {
  id: string;
  name: string;
  system?: string;
  avatar?: string;
  kind?: "featured" | "api" | "custom";
};

type Message = {
  role: Role;
  text: string;
  cardId?: string;
  cardName?: string;
};

type HealthStatus = {
  status: string;
  service: string;
  provider: string;
  cards: number;
  hostname?: string;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

const PAYPAL_PLANS = [
  {
    id: "jp-1000",
    region: "国内向け",
    label: "IZAKAYA 1000P",
    description: "IZAKAYAverseの利用ポイント1000Pを購入します",
    price: "¥1,000",
    currency: "JPY",
    url: "https://www.paypal.com/ncp/payment/SBPMPM8BFRQUW",
  },
  {
    id: "jp-5000",
    region: "国内向け",
    label: "IZAKAYA 5000P",
    description: "IZAKAYAverseの利用ポイント5000Pを購入します",
    price: "¥5,000",
    currency: "JPY",
    url: "https://www.paypal.com/ncp/payment/WWLCPFUX2K2VA",
  },
  {
    id: "us-1000",
    region: "海外向け",
    label: "IZAKAYA 1000P",
    description: "Purchase 1000 points for IZAKAYAverse",
    price: "$10",
    currency: "USD",
    url: "https://www.paypal.com/ncp/payment/HTHQFN7EADLPC",
  },
  {
    id: "us-5000",
    region: "海外向け",
    label: "IZAKAYA 5000P",
    description: "Purchase 5000 points for IZAKAYAverse",
    price: "$50",
    currency: "USD",
    url: "https://www.paypal.com/ncp/payment/PKBQ6WBAGHVUW",
  },
  {
    id: "support",
    region: "Support",
    label: "IZAKAYA Support / Motoo Koyama",
    description: "活動を支援するためのカンパ（ポイント付与なし）",
    price: "自由設定",
    currency: "",
    url: "https://www.paypal.com/ncp/payment/YP4SEMBEH3AHQ",
  },
];

const FEATURED_CARDS: CardRecord[] = [
  { id: "dr-orb", name: "Dr. Orb", avatar: drOrbAvatar, kind: "featured" },
  { id: "miss-madi", name: "Miss Madi", avatar: missMadiAvatar, kind: "featured" },
  { id: "placeholder", name: "V2Card.PNG", kind: "placeholder" },
];

const MOCK_MESSAGES: Message[] = [
  {
    role: "ai",
    text: "ようこそ。ここは IZAKAYA verse のプレビュー。カードを選ぶか、画像(PNG 400x600)をドロップして反映してください。",
    cardId: "miss-madi",
    cardName: "Miss Madi",
  },
];

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }
  return res.json();
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

const STATUS_COLOR: Record<string, string> = {
  ok: "text-emerald-500",
  warn: "text-amber-500",
  error: "text-rose-500",
};

type Theme = "light" | "dark";

type ThemeClasses = {
  page: string;
  panel: string;
  accent: string;
  btnPrimary: string;
  header: string;
  title: string;
  bubbleUser: string;
  bubbleAi: string;
  badge: string;
  cardChipSelected: string;
  cardChip: string;
  cardSelected: string;
  card: string;
  textSubtle: string;
  dockLabel: string;
};

const THEME_MAP: Record<Theme, ThemeClasses> = {
  light: {
    page: "bg-[#f7f5ff]",
    panel: "bg-white border border-zinc-200",
    accent: "from-rose-500 to-pink-500",
    btnPrimary: "bg-rose-600 hover:bg-rose-700",
    header: "bg-white/90",
    title: "text-4xl font-extrabold tracking-tight text-[#152053]",
    bubbleUser: "bg-[#1d1d2f] text-white",
    bubbleAi: "bg-white border border-[#ffe5ef]",
    badge: "bg-rose-100 text-rose-600",
    cardChipSelected: "border-rose-600 text-rose-700 bg-rose-50",
    cardChip: "border-zinc-300 bg-white text-zinc-600",
    cardSelected: "border-rose-600 ring-2 ring-rose-200",
    card: "border-zinc-200 hover:border-zinc-300 bg-white",
    textSubtle: "text-zinc-500",
    dockLabel: "text-zinc-600",
  },
  dark: {
    page: "bg-[#090910]",
    panel: "bg-[#111118] border border-zinc-800",
    accent: "from-purple-500 to-rose-500",
    btnPrimary: "bg-purple-600 hover:bg-purple-700",
    header: "bg-[#090910]/85",
    title: "text-4xl font-extrabold tracking-tight text-zinc-100",
    bubbleUser: "bg-[#202046] text-white",
    bubbleAi: "bg-[#161627] border border-[#2c2d52] text-zinc-100",
    badge: "bg-purple-900/40 text-purple-300",
    cardChipSelected: "border-purple-400 text-purple-300 bg-purple-900/30",
    cardChip: "border-zinc-700 bg-[#161616] text-zinc-300",
    cardSelected: "border-purple-400 ring-2 ring-purple-700/40",
    card: "border-zinc-700 hover:border-zinc-500 bg-[#13131e]",
    textSubtle: "text-zinc-400",
    dockLabel: "text-zinc-400",
  },
};

const cannedMessages = [
  "了解。カードの気配を解析中…",
  "舞台を用意しました。次の合図を。",
  "Dr.Orb: プロトコル起動。あなたのカードを反映しました。",
];

const HealthBadge: React.FC<{ health?: HealthStatus; loading: boolean; error?: string }> = ({
  health,
  loading,
  error,
}) => {
  if (loading) return <span className="text-xs text-zinc-400">checking…</span>;
  if (error)
    return (
      <span className="text-xs text-rose-500">
        offline <span className="text-zinc-500">({error})</span>
      </span>
    );
  if (!health) return null;
  return (
    <span className={`text-xs ${STATUS_COLOR[health.status] ?? "text-emerald-500"}`}>
      {health.status} <span className="text-zinc-500">• {health.provider}</span>
    </span>
  );
};

const HeaderIcon: React.FC = () => (
  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 via-indigo-500 to-rose-400 text-xl font-bold text-white shadow-lg">
    IZ
  </div>
);

const ChatAvatar: React.FC<{ url?: string; label: string; role: Role }> = ({ url, label, role }) => {
  if (url) {
    return <img src={url} alt={label} className="h-10 w-10 rounded-2xl border border-white/20 object-cover shadow" />;
  }
  if (role === "user") {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-dashed border-zinc-500 bg-transparent text-lg text-zinc-500 shadow">
        ◯
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-dashed border-zinc-500 bg-transparent text-xs font-semibold uppercase text-zinc-500">
      NPC
    </div>
  );
};

const CardChip: React.FC<{ name: string; selected?: boolean; themeClasses: ThemeClasses }> = ({
  name,
  selected,
  themeClasses,
}) => (
  <span
    className={[
      "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs",
      selected ? themeClasses.cardChipSelected : themeClasses.cardChip,
    ].join(" ")}
  >
    <span className="h-3 w-3 rounded-sm bg-gradient-to-br from-zinc-300 to-zinc-500" />
    {name}
  </span>
);

const Bubble: React.FC<{
  role: Role;
  text: string;
  card?: CardRecord;
  themeClasses: ThemeClasses;
}> = ({ role, text, card, themeClasses }) => (
  <div
    className={[
      "flex items-start gap-3",
      role === "user" ? "flex-row-reverse text-right" : "flex-row",
    ].join(" ")}
  >
    <ChatAvatar url={card?.avatar} label={card?.name ?? ""} role={role} />
    <div
      className={[
        "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm transition",
        role === "user" ? themeClasses.bubbleUser : themeClasses.bubbleAi,
      ].join(" ")}
    >
      <div className="mb-1 flex items-center gap-2 text-xs opacity-70">
        <span className="uppercase tracking-wide">{role === "user" ? "You" : card?.name ?? "Dr.Orb"}</span>
        {card && <CardChip name={card.name} themeClasses={themeClasses} />}
      </div>
      <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
    </div>
  </div>
);

const CardDock: React.FC<{
  cards: CardRecord[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onRegisterClick: () => void;
  onDropFiles: (files: FileList | null) => void;
  onRemove: (id: string) => void;
  themeClasses: ThemeClasses;
}> = ({ cards, selectedId, onSelect, onRegisterClick, onDropFiles, onRemove, themeClasses }) => {
  const handleDrop: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    onDropFiles(event.dataTransfer.files);
  };

  const handleDragOver: React.DragEventHandler<HTMLDivElement> = (event) => event.preventDefault();

  return (
    <section
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={`rounded-2xl ${themeClasses.panel} p-4 shadow-sm`}
      title="PNG(400x600)をドロップしてカードを追加"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className={`text-[11px] uppercase tracking-wide ${themeClasses.dockLabel}`}>Card Dock</div>
        <button
          onClick={onRegisterClick}
          className="rounded-full border border-dashed border-rose-300 px-3 py-1 text-xs font-medium text-rose-500 hover:border-rose-500 hover:text-rose-600"
        >
          ＋ カード登録
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {cards.map((card) => {
          const isSelected = selectedId === card.id;
          const hasAvatar = Boolean(card.avatar);
          return (
            <button
              key={card.id}
              onClick={() => onSelect(card.id)}
              className={[
                "group relative flex flex-none flex-col overflow-hidden rounded-2xl transition focus:outline-none",
                hasAvatar ? "h-32 w-24 border shadow-sm" : "h-auto w-auto border-none",
                hasAvatar
                  ? isSelected
                    ? themeClasses.cardSelected
                    : themeClasses.card
                  : isSelected
                  ? "ring-2 ring-rose-200 bg-white text-rose-500"
                  : "bg-white text-zinc-600 hover:bg-rose-50",
              ].join(" ")}
            >
            {hasAvatar ? (
              <>
                  <div className="relative flex-1 w-full">
                    <img src={card.avatar} alt={card.name} className="h-full w-full object-cover" />
                    {card.kind === "featured" && (
                      <span className="absolute left-2 top-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                        featured
                      </span>
                    )}
                    {card.kind === "custom" && (
                      <button
                        type="button"
                        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-sm font-semibold text-white hover:bg-black/80"
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemove(card.id);
                        }}
                      >
                        ⏏︎
                      </button>
                    )}
                  </div>
                  <div className="line-clamp-2 px-2 py-1 text-center text-[11px] text-zinc-600">{card.name}</div>
                </>
              ) : (
                <div className="flex h-32 w-24 flex-col items-center justify-center rounded-2xl border border-dashed border-rose-200 bg-white text-xs font-medium text-rose-500">
                  <span className="text-base">🖼️</span>
                  <span className="mt-1">{card.name}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
      <p className={`mt-3 text-xs ${themeClasses.textSubtle}`}>
        Dr.Orb / Miss Madi はプリロード済み。PNG(400×600)をドロップするとカードキャラクターを追加登録できます。
      </p>
    </section>
  );
};

const PayPalGrid: React.FC = () => (
  <section id="billing" className="rounded-2xl bg-white/90 p-6 shadow-lg ring-1 ring-rose-100">
    <header className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-[#152053]">課金ポイント・サポート</h2>
      <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-600">PayPal</span>
    </header>
    <p className="mb-4 text-sm text-zinc-600">
      AI駆動系のエンタメサービスです。長期プレイの場合はポイントのご購入をお願いします。
    </p>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {PAYPAL_PLANS.map((plan) => (
        <article
          key={plan.id}
          className="flex h-full flex-col rounded-xl border border-rose-100 bg-white p-4 shadow-sm transition hover:border-rose-300"
        >
          <div className="text-xs font-medium uppercase tracking-wide text-rose-500">{plan.region}</div>
          <h3 className="mt-1 text-base font-semibold text-[#1d1d35]">{plan.label}</h3>
          <p className="mt-2 flex-1 text-sm text-zinc-500">{plan.description}</p>
          <div className="mt-3 text-sm font-semibold text-rose-600">
            {plan.price} {plan.currency}
          </div>
          <a
            href={plan.url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-rose-500 to-rose-600 px-3 py-2 text-sm font-semibold text-white shadow hover:from-rose-600 hover:to-rose-700"
          >
            PayPalで購入
          </a>
        </article>
      ))}
    </div>
  </section>
);

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>("light");
  const themeClasses = useMemo(() => THEME_MAP[theme], [theme]);

  const [cards, setCards] = useState<CardRecord[]>(FEATURED_CARDS);
  const [selectedCard, setSelectedCard] = useState<string>(FEATURED_CARDS[0]?.id ?? "");
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [input, setInput] = useState("");
  const [temperature, setTemperature] = useState("0.7");
  const [health, setHealth] = useState<HealthStatus>();
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [healthError, setHealthError] = useState<string>();
  const [sending, setSending] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const hiddenFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    refreshHealth();
    refreshCards();
  }, []);

  const refreshHealth = async () => {
    setLoadingHealth(true);
    setHealthError(undefined);
    try {
      const data = await apiFetch<HealthStatus>("/health");
      setHealth(data);
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingHealth(false);
    }
  };

  const enrichCard = (card: CardRecord, kind: CardRecord["kind"] = "api"): CardRecord => {
    const preset = FEATURED_CARDS.find((featured) => {
      const normalizedName = card.name.toLowerCase();
      return (
        featured.id === card.id ||
        normalizedName.includes(featured.name.toLowerCase()) ||
        (card.system && card.system.toLowerCase().includes(featured.name.toLowerCase()))
      );
    });
    return {
      ...card,
      id: card.id || slugify(card.name),
      avatar: card.avatar || preset?.avatar,
      kind,
    };
  };

  const refreshCards = async () => {
    try {
      const data = await apiFetch<{ cards: CardRecord[] }>("/cards");
      if (Array.isArray(data.cards) && data.cards.length > 0) {
        setCards((prev) => {
          const map = new Map<string, CardRecord>();
          [...prev, ...data.cards.map((card) => enrichCard(card))].forEach((card) => {
            map.set(card.id, card);
          });
          const merged = Array.from(map.values());
          if (!merged.find((card) => card.id === selectedCard) && merged.length > 0) {
            setSelectedCard(merged[0].id);
          }
          return merged;
        });
      }
    } catch (err) {
      console.warn("failed to fetch cards", err);
    }
  };

  const addMessage = (message: Message) => setMessages((prev) => [...prev, message]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;
    const tempValue = Math.min(1, Math.max(0, Number(temperature) || 0.7));
    const selectedCardMeta = cards.find((card) => card.id === selectedCard);
    setInput("");
    addMessage({ role: "user", text: content });
    setSending(true);
    try {
      const body = { prompt: content, cardId: selectedCard, temperature: tempValue };
      const data = await apiFetch<{ reply: string; meta?: Record<string, string> }>("/chat/v1", {
        method: "POST",
        body: JSON.stringify(body),
      });
      addMessage({
        role: "ai",
        text: data.reply || "（応答なし）",
        cardId: selectedCard,
        cardName: selectedCardMeta?.name,
      });
    } catch (err) {
      addMessage({
        role: "ai",
        text: `エラー: ${(err as Error)?.message ?? String(err)}\nモック応答: ${cannedMessages[Math.floor(Math.random() * cannedMessages.length)]}`,
        cardId: selectedCard,
        cardName: selectedCardMeta?.name,
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (event) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleRegisterCard = () => hiddenFileInputRef.current?.click();

  const handleFilesToCards = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = Array.from(files).find((item) => item.type === "image/png");
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    const name = file.name.replace(/\.png$/i, "");
    const newCard: CardRecord = {
      id: `custom-${Date.now()}`,
      name,
      avatar: objectUrl,
      kind: "custom",
    };
    setCards((prev) => [newCard, ...prev]);
    setSelectedCard(newCard.id);
  };

  const selectedCardMeta = cards.find((card) => card.id === selectedCard) ?? cards[0];

  const handleRemoveCard = (id: string) => {
    setCards((prev) => {
      const next = prev.filter((card) => card.id !== id);
      if (selectedCard === id) {
        const fallback = next[0] ?? FEATURED_CARDS[0];
        setSelectedCard(fallback ? fallback.id : "");
      }
      return next;
    });
  };

  return (
    <div className={`min-h-screen ${themeClasses.page}`}>
      <header className={`sticky top-0 z-10 ${themeClasses.header} border-b border-white/40 backdrop-blur-xl`}>
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-4">
          <HeaderIcon />
          <div className="flex flex-col">
            <h1 className={themeClasses.title}>IZAKAYA verse – Lite Preview</h1>
            <div className={`text-sm font-medium ${themeClasses.textSubtle}`}>
              Mini BFF /chat 接続テストパネル
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <HealthBadge health={health} loading={loadingHealth} error={healthError} />
            {selectedCardMeta && <CardChip name={selectedCardMeta.name} selected themeClasses={themeClasses} />}
            <button
              onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
              className={`rounded-full bg-gradient-to-br px-4 py-2 text-sm font-semibold text-white shadow ${themeClasses.accent}`}
            >
              {theme === "light" ? "Dark" : "Light"}
            </button>
            <a
              href="#billing"
              className={`rounded-full px-4 py-2 text-sm font-semibold shadow ${themeClasses.badge}`}
            >
              ポイント表示
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-6">
        <section className={`relative rounded-3xl ${themeClasses.panel} shadow-xl`}>
          <div ref={listRef} className="h-[52vh] space-y-4 overflow-y-auto px-6 py-6">
            {messages.map((message, index) => (
              <Bubble
                key={`${message.role}-${index}-${message.cardId ?? "unknown"}`}
                role={message.role}
                text={message.text}
                card={cards.find((card) => card.id === message.cardId)}
                themeClasses={themeClasses}
              />
            ))}
          </div>
          <div className="border-t border-zinc-200/50 bg-white/60 px-6 py-4 backdrop-blur dark:border-zinc-700/60 dark:bg-[#111118]/60">
            <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
              <span>カード: {selectedCardMeta?.name ?? "未選択"}</span>
              <span>Cmd/Ctrl+Enter で送信</span>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="メッセージを入力…"
                rows={3}
                className={`flex-1 resize-none rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 ${
                  theme === "light"
                    ? "border-zinc-300 bg-white focus:ring-rose-200"
                    : "border-zinc-700 bg-[#0f0f19] text-zinc-100 focus:ring-purple-600/40"
                }`}
              />
              <div className="flex flex-col gap-1 text-xs text-zinc-500">
                <label className="uppercase tracking-wide">温度</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={temperature}
                  onChange={(event) => setTemperature(event.target.value)}
                  className={`w-24 rounded-xl border px-3 py-2 text-sm focus:outline-none ${
                    theme === "light"
                      ? "border-zinc-300 bg-white focus:ring-rose-200"
                      : "border-zinc-700 bg-[#0f0f19] text-zinc-100 focus:ring-purple-600/40"
                  }`}
                />
              </div>
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-semibold text-white shadow ${themeClasses.btnPrimary} ${
                  sending ? "opacity-60" : ""
                }`}
              >
                {sending ? "送信中…" : "送信"}
              </button>
            </div>
          </div>
        </section>

        <CardDock
          cards={cards}
          selectedId={selectedCard}
          onSelect={setSelectedCard}
          onRegisterClick={handleRegisterCard}
          onDropFiles={handleFilesToCards}
          onRemove={handleRemoveCard}
          themeClasses={themeClasses}
        />

        <input
          type="file"
          ref={hiddenFileInputRef}
          accept="image/png"
          className="hidden"
          onChange={(event) => handleFilesToCards(event.target.files)}
        />

        <PayPalGrid />
      </main>
    </div>
  );
};

export default App;
