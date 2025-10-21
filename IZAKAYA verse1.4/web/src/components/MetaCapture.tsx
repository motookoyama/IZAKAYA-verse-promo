import React, { useState } from 'react';
import { Image, FileText, Globe } from 'lucide-react';

interface V2CardData {
  name: string;
  description: string;
  personality: string;
  first_mes: string;
  scenario?: string;
  example_dialogue?: string;
  tags: string[];
  image_url?: string;
}

interface MetaCaptureProps {
  onCardCaptured?: (cardData: V2CardData) => void;
}

const MetaCapture: React.FC<MetaCaptureProps> = ({ onCardCaptured }) => {
  const [activeTab, setActiveTab] = useState<'url' | 'image' | 'file'>('url');
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedCard, setCapturedCard] = useState<V2CardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // URL Capture
  const [url, setUrl] = useState('');
  const [urlPrompt, setUrlPrompt] = useState('');

  // Image Capture
  const [imageUrl, setImageUrl] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');

  // File Capture
  const [fileContent, setFileContent] = useState('');
  const [fileFormat, setFileFormat] = useState<'json' | 'sAtd'>('json');
  const [filePrompt, setFilePrompt] = useState('');

  const handleUrlCapture = async () => {
    if (!url.trim()) {
      setError('URLを入力してください');
      return;
    }

    setIsCapturing(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/metacapture/capture-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: url.trim(),
          prompt: urlPrompt.trim() || undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'URLキャプチャーに失敗しました');
      }

      setCapturedCard(data.card_data);
      onCardCaptured?.(data.card_data);
      
      console.log('✅ URLキャプチャー成功:', data.card_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
      console.error('❌ URLキャプチャーエラー:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleImageCapture = async () => {
    if (!imageUrl.trim()) {
      setError('画像URLを入力してください');
      return;
    }

    setIsCapturing(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/metacapture/capture-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          image_url: imageUrl.trim(),
          prompt: imagePrompt.trim() || undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '画像キャプチャーに失敗しました');
      }

      setCapturedCard(data.card_data);
      onCardCaptured?.(data.card_data);
      
      console.log('✅ 画像キャプチャー成功:', data.card_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
      console.error('❌ 画像キャプチャーエラー:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleFileCapture = async () => {
    if (!fileContent.trim()) {
      setError('ファイル内容を入力してください');
      return;
    }

    setIsCapturing(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/metacapture/capture-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          file_content: fileContent.trim(),
          file_format: fileFormat,
          prompt: filePrompt.trim() || undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ファイルキャプチャーに失敗しました');
      }

      setCapturedCard(data.card_data);
      onCardCaptured?.(data.card_data);
      
      console.log('✅ ファイルキャプチャー成功:', data.card_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
      console.error('❌ ファイルキャプチャーエラー:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFileContent(content);
      
      // ファイル形式を自動検出
      if (content.includes('name:') && content.includes('description:')) {
        setFileFormat('sAtd');
      } else {
        setFileFormat('json');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="metacapture bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        🔗 MetaCapture - キャラクター情報抽出
      </h2>

      {/* エラーメッセージ */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* タブ切り替え */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('url')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'url'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Globe size={16} className="inline mr-2" />
          URL抽出
        </button>
        <button
          onClick={() => setActiveTab('image')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'image'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Image size={16} className="inline mr-2" />
          画像抽出
        </button>
        <button
          onClick={() => setActiveTab('file')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'file'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText size={16} className="inline mr-2" />
          ファイル抽出
        </button>
      </div>

      {/* URL抽出タブ */}
      {activeTab === 'url' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              参照URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/character-page"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isCapturing}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI拡張プロンプト（オプション）
            </label>
            <textarea
              value={urlPrompt}
              onChange={(e) => setUrlPrompt(e.target.value)}
              placeholder="このURLから抽出した情報を基に、居酒屋の世界観に合ったキャラクターを作成してください"
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isCapturing}
            />
          </div>

          <button
            onClick={handleUrlCapture}
            disabled={isCapturing || !url.trim()}
            className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-green-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isCapturing ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin -ml-1 mr-3 h-5 w-5 text-white border-2 border-white border-t-transparent rounded-full"></div>
                URL解析中...
              </span>
            ) : (
              '🔗 URLからキャラクター抽出'
            )}
          </button>
        </div>
      )}

      {/* 画像抽出タブ */}
      {activeTab === 'image' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              画像URL
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/character-image.jpg"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isCapturing}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI拡張プロンプト（オプション）
            </label>
            <textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="この画像を分析して、居酒屋の世界観に合ったキャラクターを作成してください"
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isCapturing}
            />
          </div>

          <button
            onClick={handleImageCapture}
            disabled={isCapturing || !imageUrl.trim()}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isCapturing ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin -ml-1 mr-3 h-5 w-5 text-white border-2 border-white border-t-transparent rounded-full"></div>
                画像解析中...
              </span>
            ) : (
              '🖼️ 画像からキャラクター抽出'
            )}
          </button>
        </div>
      )}

      {/* ファイル抽出タブ */}
      {activeTab === 'file' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ファイルアップロード
            </label>
            <input
              type="file"
              accept=".json,.txt,.sAtd"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              disabled={isCapturing}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ファイル形式
            </label>
            <select
              value={fileFormat}
              onChange={(e) => setFileFormat(e.target.value as 'json' | 'sAtd')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isCapturing}
            >
              <option value="json">JSON</option>
              <option value="sAtd">sAtd</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ファイル内容（直接入力も可能）
            </label>
            <textarea
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              placeholder="JSONまたはsAtd形式のキャラクターデータを入力してください"
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              disabled={isCapturing}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI拡張プロンプト（オプション）
            </label>
            <textarea
              value={filePrompt}
              onChange={(e) => setFilePrompt(e.target.value)}
              placeholder="このファイルの内容を基に、キャラクターを拡張してください"
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isCapturing}
            />
          </div>

          <button
            onClick={handleFileCapture}
            disabled={isCapturing || !fileContent.trim()}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-orange-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isCapturing ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin -ml-1 mr-3 h-5 w-5 text-white border-2 border-white border-t-transparent rounded-full"></div>
                ファイル解析中...
              </span>
            ) : (
              '📄 ファイルからキャラクター抽出'
            )}
          </button>
        </div>
      )}

      {/* 抽出結果 */}
      {capturedCard && (
        <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            ✅ 抽出完了: {capturedCard.name}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">基本情報</h4>
              <p className="text-sm text-gray-600 mb-2">
                <strong>説明:</strong> {capturedCard.description}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>性格:</strong> {capturedCard.personality}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>最初のメッセージ:</strong> {capturedCard.first_mes}
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">詳細</h4>
              {capturedCard.scenario && (
                <p className="text-sm text-gray-600 mb-2">
                  <strong>シナリオ:</strong> {capturedCard.scenario}
                </p>
              )}
              {capturedCard.example_dialogue && (
                <p className="text-sm text-gray-600 mb-2">
                  <strong>会話例:</strong> {capturedCard.example_dialogue}
                </p>
              )}
              <div className="flex flex-wrap gap-1 mt-2">
                {capturedCard.tags.map((tag, index) => (
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

export default MetaCapture;



