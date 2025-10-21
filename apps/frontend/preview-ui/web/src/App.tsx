import { useState } from 'react';
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