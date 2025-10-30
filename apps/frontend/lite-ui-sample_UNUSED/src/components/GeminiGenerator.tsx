import React, { useState } from 'react';

interface V2CardData {
  name: string;
  description: string;
  personality: string;
  first_mes: string;
  scenario: string;
  example_dialogue: string;
  tags: string[];
}

interface GeminiGeneratorProps {
  onCardGenerated?: (cardData: V2CardData) => void;
}

const GeminiGenerator: React.FC<GeminiGeneratorProps> = ({ onCardGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCard, setGeneratedCard] = useState<V2CardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('プロンプトを入力してください');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/gemini/generate-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'カード生成に失敗しました');
      }

      setGeneratedCard(data.card_data);
      onCardGenerated?.(data.card_data);
      
      // 成功メッセージ
      console.log('✅ V2カード生成成功:', data.card_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
      console.error('❌ V2カード生成エラー:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageAnalysis = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(file);
      });

      const response = await fetch('http://localhost:3001/api/gemini/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image_base64: base64 }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '画像分析に失敗しました');
      }

      // 分析結果をプロンプトに追加
      setPrompt(prev => `${prev}\n\n画像分析結果: ${data.analysis}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '画像分析に失敗しました');
    }
  };

  return (
    <div className="gemini-generator bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        🤖 Gemini AI キャラクター生成
      </h2>

      {/* エラーメッセージ */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* プロンプト入力 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          キャラクター生成プロンプト
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="例: 居酒屋の常連客で、いつも面白い話をしてくれるおじさんキャラクターを作ってください。"
          className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isGenerating}
        />
      </div>

      {/* 画像アップロード */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          画像分析（オプション）
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageAnalysis}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          disabled={isGenerating}
        />
        <p className="text-xs text-gray-500 mt-1">
          画像をアップロードすると、AIが分析してプロンプトに追加します
        </p>
      </div>

      {/* 生成ボタン */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      >
        {isGenerating ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            AI生成中...
          </span>
        ) : (
          '🤖 AIでキャラクター生成'
        )}
      </button>

      {/* 生成結果 */}
      {generatedCard && (
        <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            ✅ 生成完了: {generatedCard.name}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">基本情報</h4>
              <p className="text-sm text-gray-600 mb-2">
                <strong>説明:</strong> {generatedCard.description}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>性格:</strong> {generatedCard.personality}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>最初のメッセージ:</strong> {generatedCard.first_mes}
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">詳細</h4>
              <p className="text-sm text-gray-600 mb-2">
                <strong>シナリオ:</strong> {generatedCard.scenario}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>会話例:</strong> {generatedCard.example_dialogue}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {generatedCard.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeminiGenerator;



