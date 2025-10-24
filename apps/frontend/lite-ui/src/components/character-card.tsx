import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Star, Zap, Heart } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface CharacterCardProps {
  id: string;
  name: string;
  type: string;
  rarity: "Common" | "Rare" | "Epic" | "Legendary";
  power: number;
  health: number;
  abilities: string[];
  image: string;
  owned?: boolean;
  onSelect?: (id: string) => void;
}

export function CharacterCard({ 
  id, 
  name, 
  type, 
  rarity, 
  power, 
  health, 
  abilities, 
  image, 
  owned = false,
  onSelect 
}: CharacterCardProps) {
  const rarityColors = {
    Common: "bg-gray-100 text-gray-800 border-gray-300",
    Rare: "bg-blue-100 text-blue-800 border-blue-300",
    Epic: "bg-purple-100 text-purple-800 border-purple-300",
    Legendary: "bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-800 border-orange-300"
  };

  const cardBorders = {
    Common: "border-gray-300",
    Rare: "border-blue-400 shadow-blue-200/50",
    Epic: "border-purple-400 shadow-purple-200/50", 
    Legendary: "border-gradient-to-r from-yellow-400 to-orange-400 shadow-orange-200/50"
  };

  return (
    <Card className={`w-full max-w-sm bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 ${cardBorders[rarity]} shadow-lg hover:shadow-xl transition-all duration-300 ${owned ? 'ring-2 ring-cyan-400' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start mb-2">
          <Badge variant="outline" className="bg-slate-700 text-cyan-300 border-cyan-400">
            {type}
          </Badge>
          <Badge variant="outline" className={rarityColors[rarity]}>
            {rarity}
          </Badge>
        </div>
        
        <div className="relative h-32 mb-3 rounded-lg overflow-hidden bg-gradient-to-br from-slate-700 to-slate-600">
          <ImageWithFallback 
            src={image}
            alt={name}
            className="w-full h-full object-cover"
          />
          {owned && (
            <div className="absolute top-2 right-2 bg-cyan-400 text-slate-900 rounded-full p-1">
              <Star className="w-4 h-4 fill-current" />
            </div>
          )}
        </div>
        
        <CardTitle className="text-lg text-cyan-100">{name}</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1 text-red-400">
            <Zap className="w-4 h-4" />
            <span className="text-sm">{power}</span>
          </div>
          <div className="flex items-center gap-1 text-green-400">
            <Heart className="w-4 h-4" />
            <span className="text-sm">{health}</span>
          </div>
        </div>
        
        <div className="space-y-1">
          <p className="text-xs text-slate-400">Abilities:</p>
          <div className="flex flex-wrap gap-1">
            {abilities.map((ability, index) => (
              <Badge 
                key={index}
                variant="outline" 
                className="text-xs bg-slate-800 text-slate-300 border-slate-600"
              >
                {ability}
              </Badge>
            ))}
          </div>
        </div>
        
        {onSelect && (
          <Button 
            onClick={() => onSelect(id)}
            className="w-full mt-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
            disabled={!owned}
          >
            {owned ? 'Select' : 'Not Owned'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}