import { useEffect, useMemo, useState } from 'react';
import { CharacterCard } from './components/character-card';
import { MultiplayerChat } from './components/multiplayer-chat';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Badge } from './components/ui/badge';
import { Users, Zap, Star, Trophy, Dice6, MessageSquare } from 'lucide-react';
import { ImageWithFallback } from './components/figma/ImageWithFallback';

interface Character {
  id: string;
  name: string;
  type: string;
  rarity: "Common" | "Rare" | "Epic" | "Legendary";
  power: number;
  health: number;
  abilities: string[];
  image: string;
  owned: boolean;
}

interface Player {
  id: string;
  name: string;
  avatar: string;
  character: string;
  isOnline: boolean;
}

function resolveInitialBffBase(): string {
  const raw =
    (import.meta.env.VITE_REACT_APP_BFF_URL as string | undefined) ||
    (import.meta.env.VITE_BFF_URL as string | undefined) ||
    (import.meta.env.REACT_APP_BFF_URL as string | undefined) ||
    (import.meta.env.VITE_API_BASE_URL as string | undefined);
  const fallback = "http://localhost:4117";
  const selected = typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : fallback;
  return selected.replace(/\/+$/, "");
}

const normalizeBase = (value: string) => value.replace(/\/+$/, "");
const BFF_BASE_URL = resolveInitialBffBase();
const BFF_CANDIDATES = [BFF_BASE_URL];
let resolvedBffBase = normalizeBase(BFF_BASE_URL);

const getResolvedBffBase = () => resolvedBffBase;
const setResolvedBffBase = (value: string) => {
  resolvedBffBase = normalizeBase(value);
};

const HEALTHCHECK_UID = "IZK_HEALTHCHECK_UI";
const HEALTHCHECK_PROMPT = "[health-check] BFF connectivity verification";

type ConnectionStatus =
  | { state: "pending" }
  | { state: "ok"; url: string; reply: string }
  | { state: "error"; failures: { url: string; detail: string }[] };

type EndpointCheck = {
  endpoint: string;
  url: string;
  ok: boolean;
  detail?: string;
};

function buildRequestUrl(path: string, baseOverride?: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const base = baseOverride ? normalizeBase(baseOverride) : getResolvedBffBase();
  return `${base}${normalizedPath}`;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = buildRequestUrl(path);
  const res = await fetch(url, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`.trim());
  }
  return res.json();
}

const characters: Character[] = [
  {
    id: '1',
    name: 'Cyber Assassin',
    type: 'Rogue',
    rarity: 'Legendary',
    power: 95,
    health: 80,
    abilities: ['Stealth', 'Critical Strike', 'Digital Phantom'],
    image: 'https://images.unsplash.com/photo-1750192524484-36450bbb1dd6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmdXR1cmlzdGljJTIwY2hhcmFjdGVyJTIwZGVzaWdufGVufDF8fHx8MTc1ODUzODY4MXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    owned: true
  },
  {
    id: '2',
    name: 'Quantum Mage',
    type: 'Caster',
    rarity: 'Epic',
    power: 88,
    health: 65,
    abilities: ['Teleport', 'Energy Blast', 'Time Dilation'],
    image: 'https://images.unsplash.com/photo-1629271518916-fd9506240f48?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob2xvZ3JhbSUyMGRpZ2l0YWx8ZW58MXx8fHwxNzU4NTM4NjgxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    owned: true
  },
  {
    id: '3',
    name: 'Mech Guardian',
    type: 'Tank',
    rarity: 'Rare',
    power: 70,
    health: 120,
    abilities: ['Shield Wall', 'Rocket Punch', 'Repair Protocol'],
    image: 'https://images.unsplash.com/photo-1750096319146-6310519b5af2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzY2ktZmklMjByb2JvdCUyMGFuZHJvaWR8ZW58MXx8fHwxNzU4NTM4NjgxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    owned: false
  },
  {
    id: '4',
    name: 'Data Hunter',
    type: 'Ranger',
    rarity: 'Epic',
    power: 82,
    health: 75,
    abilities: ['Tracking', 'Snipe', 'Information Warfare'],
    image: 'https://images.unsplash.com/photo-1750192524484-36450bbb1dd6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmdXR1cmlzdGljJTIwY2hhcmFjdGVyJTIwZGVzaWdufGVufDF8fHx8MTc1ODUzODY4MXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    owned: true
  }
];

export default function App() {
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(characters.find(c => c.owned) || null);
  const [activeTab, setActiveTab] = useState('collection');
  const [currentPlayer] = useState<Player>({
    id: '1',
    name: 'Player1',
    avatar: '🎮',
    character: selectedCharacter?.name || 'No Character',
    isOnline: true
  });
  const bffCandidates = useMemo(() => BFF_CANDIDATES, []);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ state: 'pending' });
  const [healthChecks, setHealthChecks] = useState<EndpointCheck[]>([]);
  const [healthChecksRunning, setHealthChecksRunning] = useState(false);
  const [bootstrapReply, setBootstrapReply] = useState<string | null>(null);

  const probeChatEndpoint = async (base: string) => {
    const url = buildRequestUrl('/chat/v1', base);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: HEALTHCHECK_PROMPT, cardId: 'health-check', temperature: 0 }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status} ${text}`.trim());
    }
    const data = await response.json();
    const reply = typeof data.reply === 'string' ? data.reply.trim() : '';
    if (!reply) {
      throw new Error('BFF応答エラー: 空の返信');
    }
    return { reply };
  };

  const performHealthChecks = async (base: string, reply: string): Promise<EndpointCheck[]> => {
    const normalizedBase = normalizeBase(base);
    const checks: EndpointCheck[] = [
      {
        endpoint: '/chat/v1',
        url: buildRequestUrl('/chat/v1', normalizedBase),
        ok: true,
        detail: `reply length: ${reply.length}`,
      },
    ];

    const headers = {
      'content-type': 'application/json',
      'X-IZK-UID': HEALTHCHECK_UID,
    };

    const balanceUrl = buildRequestUrl('/wallet/balance', normalizedBase);
    try {
      const res = await fetch(balanceUrl, { headers });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        checks.push({
          endpoint: '/wallet/balance',
          url: balanceUrl,
          ok: false,
          detail: `HTTP ${res.status} ${text}`.trim(),
        });
      } else {
        const payload = await res.json().catch(() => ({}));
        const balanceDetail = typeof payload.balance === 'number' ? `balance=${payload.balance}` : undefined;
        checks.push({ endpoint: '/wallet/balance', url: balanceUrl, ok: true, detail: balanceDetail });
      }
    } catch (error) {
      checks.push({
        endpoint: '/wallet/balance',
        url: balanceUrl,
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      });
    }

    const redeemUrl = buildRequestUrl('/wallet/redeem', normalizedBase);
    const consumeUrl = buildRequestUrl('/wallet/consume', normalizedBase);
    const now = new Date();
    const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
    const token = Math.random().toString(36).slice(2, 8).toUpperCase();
    const txId = `TX-${ymd}-${token}`;
    let redeemSucceeded = false;
    let redeemDetail: string | undefined;

    try {
      const redeemRes = await fetch(redeemUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ amount_pt: 1, tx_id: txId }),
      });
      if (!redeemRes.ok) {
        const text = await redeemRes.text().catch(() => '');
        redeemDetail = `HTTP ${redeemRes.status} ${text}`.trim();
      } else {
        redeemSucceeded = true;
      }
    } catch (error) {
      redeemDetail = error instanceof Error ? error.message : String(error);
    }

    if (redeemSucceeded) {
      const idempotencyKey = `health-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      try {
        const consumeRes = await fetch(consumeUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ amount_pt: 1, sku: 'health-check', idempotency_key: idempotencyKey }),
        });
        if (!consumeRes.ok) {
          const text = await consumeRes.text().catch(() => '');
          checks.push({
            endpoint: '/wallet/consume',
            url: consumeUrl,
            ok: false,
            detail: `HTTP ${consumeRes.status} ${text}`.trim(),
          });
        } else {
          const payload = await consumeRes.json().catch(() => ({}));
          const detail = typeof payload.balance === 'number' ? `balance=${payload.balance}` : 'ok';
          checks.push({ endpoint: '/wallet/consume', url: consumeUrl, ok: true, detail });
        }
      } catch (error) {
        checks.push({
          endpoint: '/wallet/consume',
          url: consumeUrl,
          ok: false,
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      checks.push({
        endpoint: '/wallet/consume',
        url: consumeUrl,
        ok: false,
        detail: redeemDetail ? `redeem failed: ${redeemDetail}` : 'redeem failed',
      });
    }

    return checks;
  };

  const runHealthChecks = async (base: string, reply: string) => {
    setHealthChecksRunning(true);
    try {
      const checks = await performHealthChecks(base, reply);
      setHealthChecks(checks);
      const failures = checks.filter(check => !check.ok);
      if (failures.length > 0) {
        console.error('CHAT_REQUEST_FAILED', { reason: 'healthcheck_failed', failures });
      }
      return checks;
    } finally {
      setHealthChecksRunning(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setConnectionStatus({ state: 'pending' });
      setHealthChecks([]);
      const failures: { url: string; detail: string }[] = [];

      for (const candidate of bffCandidates) {
        const base = normalizeBase(candidate);
        try {
          const { reply } = await probeChatEndpoint(base);
          if (cancelled) return;
          setResolvedBffBase(base);
          setConnectionStatus({ state: 'ok', url: base, reply });
          setBootstrapReply(reply);
          await runHealthChecks(base, reply);
          return;
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          console.error('CHAT_REQUEST_FAILED', {
            reason: 'bootstrap_candidate_failed',
            url: base,
            error,
          });
          failures.push({ url: base, detail });
        }
      }

      if (!cancelled) {
        setConnectionStatus({ state: 'error', failures });
        if (typeof window !== 'undefined') {
          const failedUrls = failures.map(failure => failure.url).join(', ') || '未設定';
          window.alert(`❌ BFFに接続できません（URL: ${failedUrls}）`);
        }
        console.error('CHAT_REQUEST_FAILED', { reason: 'bootstrap_failed', failures });
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [bffCandidates]);

  const handleRetryHealthChecks = async () => {
    if (connectionStatus.state !== 'ok') {
      if (typeof window !== 'undefined') {
        window.alert('BFF未接続です。接続を確認してから再度お試しください。');
      }
      console.error('CHAT_REQUEST_FAILED', { reason: 'healthcheck_retry_without_connection' });
      return;
    }
    try {
      await runHealthChecks(connectionStatus.url, connectionStatus.reply);
    } catch (error) {
      console.error('CHAT_REQUEST_FAILED', { reason: 'healthcheck_retry_failed', error });
    }
  };

  const sendChatToBff = async (prompt: string) => {
    if (connectionStatus.state !== 'ok') {
      throw new Error('BFF未接続です');
    }
    const body = {
      prompt,
      cardId: selectedCharacter?.id ?? 'default-card',
      temperature: 0.7,
    };
    let data: { reply: string };
    try {
      data = await apiFetch<{ reply: string }>('/chat/v1', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    } catch (error) {
      console.error('CHAT_REQUEST_FAILED', { reason: 'send_failed', error });
      throw error instanceof Error ? error : new Error(String(error));
    }
    const reply = typeof data.reply === 'string' ? data.reply.trim() : '';
    if (!reply) {
      console.error('CHAT_REQUEST_FAILED', { reason: 'empty_reply', body });
      throw new Error('BFF応答エラー: 空の返信');
    }
    return reply;
  };

  const connectionSummary = useMemo(() => {
    if (connectionStatus.state === 'pending') {
      return 'BFF接続チェック中…';
    }
    if (connectionStatus.state === 'ok') {
      return `✅ BFF接続成功 • ${connectionStatus.url}`;
    }
    const first = connectionStatus.failures[0];
    return `❌ BFF接続失敗${first ? ` • ${first.url} (${first.detail})` : ''}`;
  }, [connectionStatus]);

  const healthHasFailures = useMemo(() => healthChecks.some(check => !check.ok), [healthChecks]);

  const handleCharacterSelect = (id: string) => {
    const character = characters.find(c => c.id === id);
    if (character && character.owned) {
      setSelectedCharacter(character);
    }
  };

  const handleStartAdventure = () => {
    setActiveTab('adventure');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black relative">
      {/* Background Image */}
      <div className="absolute inset-0 opacity-30">
        <ImageWithFallback 
          src="https://images.unsplash.com/photo-1623002126996-a38b8a41f4f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjeWJlcnB1bmslMjBuZW9uJTIwY2l0eXxlbnwxfHx8fDE3NTg0NTc4MDd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
          alt="Cyberpunk city"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Header */}
      <div className="relative z-10 p-6">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text drop-shadow-lg">
              IZAKAYA verse
            </h1>
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Star className="w-6 h-6 text-white fill-current" />
            </div>
          </div>
          <p className="text-slate-300 text-lg drop-shadow">
            AI-Driven Character Collection & Adventure Game
          </p>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-6 mb-8">
          <Card className="bg-white/10 backdrop-blur-sm border-cyan-500/30">
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <p className="text-slate-300 text-sm">Online Players</p>
              <p className="text-cyan-400">2,847</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-sm border-purple-500/30">
            <CardContent className="p-4 text-center">
              <Trophy className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <p className="text-slate-300 text-sm">Adventures</p>
              <p className="text-purple-400">15,632</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-sm border-blue-500/30">
            <CardContent className="p-4 text-center">
              <Star className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-slate-300 text-sm">Characters</p>
              <p className="text-blue-400">156</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-6 pb-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 rounded-xl border border-cyan-500/30 bg-slate-900/80 p-4 text-sm text-cyan-100 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{connectionSummary}</span>
              <button
                onClick={handleRetryHealthChecks}
                disabled={healthChecksRunning}
                className="rounded-md border border-cyan-400 px-3 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {healthChecksRunning ? '検証中…' : 'ヘルス再検証'}
              </button>
            </div>
            <div
              className={`mt-2 text-xs ${
                healthChecks.length === 0
                  ? 'text-slate-300'
                  : healthHasFailures
                  ? 'text-rose-300'
                  : 'text-emerald-300'
              }`}
            >
              {healthChecks.length === 0
                ? 'ヘルスチェック待機中…'
                : healthHasFailures
                ? '⚠️ ヘルスチェックで失敗した項目があります'
                : '✅ ヘルスチェックを全て通過しました'}
            </div>
            {healthChecks.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-slate-200">
                {healthChecks.map((check) => (
                  <li key={check.endpoint}>
                    {check.ok ? '✅' : '❌'} {check.endpoint}
                    {check.detail ? ` — ${check.detail}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-800/80 backdrop-blur-sm border border-slate-600">
              <TabsTrigger 
                value="collection" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
              >
                <Star className="w-4 h-4 mr-2" />
                Character Collection
              </TabsTrigger>
              <TabsTrigger 
                value="adventure"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Multiplayer Adventure
              </TabsTrigger>
            </TabsList>

            <TabsContent value="collection" className="mt-6">
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Character Selection */}
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl text-cyan-100 mb-2">Your Collection</h2>
                    <p className="text-slate-400">Collect and upgrade powerful characters for your adventures</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {characters.map((character) => (
                      <CharacterCard
                        key={character.id}
                        {...character}
                        onSelect={handleCharacterSelect}
                      />
                    ))}
                  </div>
                </div>

                {/* Selected Character & Adventure Start */}
                <div className="space-y-6">
                  {selectedCharacter ? (
                    <div className="space-y-4">
                      <Card className="bg-gradient-to-br from-slate-800 to-slate-700 border-cyan-500/50">
                        <CardContent className="p-6 text-center">
                          <h3 className="text-xl text-cyan-100 mb-4">Selected Character</h3>
                          <div className="space-y-3">
                            <h4 className="text-lg text-white">{selectedCharacter.name}</h4>
                            <div className="flex justify-center gap-4">
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                                <Zap className="w-3 h-3 mr-1" />
                                {selectedCharacter.power}
                              </Badge>
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                                ❤️ {selectedCharacter.health}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-1 justify-center">
                              {selectedCharacter.abilities.map((ability, index) => (
                                <Badge 
                                  key={index}
                                  variant="outline" 
                                  className="text-xs bg-slate-700 text-slate-300 border-slate-500"
                                >
                                  {ability}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Button 
                        onClick={handleStartAdventure}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg py-6"
                      >
                        <Dice6 className="w-5 h-5 mr-2" />
                        Start Multiplayer Adventure
                      </Button>
                    </div>
                  ) : (
                    <Card className="bg-slate-800/50 border-slate-600">
                      <CardContent className="p-6 text-center">
                        <div className="text-slate-400">
                          <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>Select a character from your collection to begin your adventure</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  <div className="space-y-4 text-center">
                    <h3 className="text-xl text-slate-200">Game Features</h3>
                    <div className="space-y-2 text-slate-300">
                      <p className="flex items-center justify-center gap-2">
                        <Users className="w-4 h-4 text-cyan-400" />
                        Multiplayer adventures with AI Game Master
                      </p>
                      <p className="flex items-center justify-center gap-2">
                        <Star className="w-4 h-4 text-purple-400" />
                        Collect & upgrade unique characters
                      </p>
                      <p className="flex items-center justify-center gap-2">
                        <Zap className="w-4 h-4 text-blue-400" />
                        Dynamic AI-driven storylines
                      </p>
                      <p className="flex items-center justify-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        Compete in global leaderboards
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="adventure" className="mt-6">
              <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700 shadow-2xl">
                <div className="h-[700px]">
                  <MultiplayerChat 
                    roomId="Neo-Tokyo-001" 
                    currentPlayer={{
                      ...currentPlayer,
                      character: selectedCharacter?.name || 'No Character'
                    }}
                    onSendChat={sendChatToBff}
                    connectionReady={connectionStatus.state === 'ok'}
                    initialBotMessage={bootstrapReply ?? undefined}
                  />
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
