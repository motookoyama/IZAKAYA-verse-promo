import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

interface GameCardProps {
  title: string;
  prompt: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

export function GameCard({ title, prompt, category, difficulty }: GameCardProps) {
  const difficultyColors = {
    Easy: "bg-green-100 text-green-800 border-green-200",
    Medium: "bg-yellow-100 text-yellow-800 border-yellow-200", 
    Hard: "bg-red-100 text-red-800 border-red-200"
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start mb-2">
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
            {category}
          </Badge>
          <Badge variant="outline" className={difficultyColors[difficulty]}>
            {difficulty}
          </Badge>
        </div>
        <CardTitle className="text-lg text-amber-900">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-amber-800 leading-relaxed">{prompt}</p>
      </CardContent>
    </Card>
  );
}