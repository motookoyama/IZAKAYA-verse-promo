import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Checklist } from './components/Checklist';
import { ResultsPanel } from './components/ResultsPanel';
import { RunChecksButton } from './components/RunChecksButton';
import { DownloadReportButton } from './components/DownloadReportButton';
import { UploadReport } from './components/UploadReport';
import { GenerateRepairScriptButton } from './components/GenerateRepairScriptButton';
import { ExecuteRepairButton } from './components/ExecuteRepairButton';
import { HistoryPanel } from './components/HistoryPanel';
import { runAllChecks } from './services/checkerService';
import { generateScript } from './services/aiService';
import { CHECKS } from './constants';
import type { CheckResult, HistoryItem } from './types';
import { CheckStatus } from './types';
import { mapReportToResults } from './utils/reportMapper';
import { getHistory, saveToHistory } from './utils/historyService';

const App: React.FC = () => {
  const [results, setResults] = useState<Record<string, CheckResult>>({});
  const [isChecking, setIsChecking] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);
  
  const updateHistory = () => {
     setHistory(getHistory());
  }

  const handleRunChecks = useCallback(async () => {
    setIsChecking(true);
    setGeneratedScript(null);
    setResults({});
    
    const onProgress = (result: CheckResult) => {
      setResults(prev => ({ ...prev, [result.checkId]: result }));
    };

    await runAllChecks(onProgress);
    setIsChecking(false);
  }, []);
  
  useEffect(() => {
    if (!isChecking && Object.keys(results).length === CHECKS.length && Object.values(results).every(r => r.status !== CheckStatus.RUNNING)) {
      saveToHistory(results);
      updateHistory();
    }
  }, [isChecking, results]);

  const handleGenerateScript = useCallback(async () => {
    const failedChecks = Object.values(results).filter(
      r => r.status === CheckStatus.FAIL
    );
    if (failedChecks.length === 0) return;

    setIsGeneratingScript(true);
    const script = await generateScript(failedChecks);
    setGeneratedScript(script);
    setIsGeneratingScript(false);
  }, [results]);

  const handleUpload = (content: string) => {
    try {
      const report = JSON.parse(content);
      const newResults = mapReportToResults(report);
      setResults(newResults);
      setGeneratedScript(null);
    } catch (e) {
      alert('無効なレポートファイルです。JSON形式ではありません。');
      console.error(e);
    }
  };

  const loadFromHistory = (historyResults: Record<string, CheckResult>) => {
    setResults(historyResults);
    setGeneratedScript(null);
  }

  const failedChecks = Object.values(results).filter(r => r.status === CheckStatus.FAIL);
  const isCheckCompleted = !isChecking && Object.keys(results).length > 0;

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Header />
        <main className="mt-8">
          <div className="bg-gray-800/50 p-6 rounded-lg shadow-lg">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                <RunChecksButton isChecking={isChecking} onClick={handleRunChecks} />
                <UploadReport onUpload={handleUpload} />
                <DownloadReportButton results={results} disabled={!isCheckCompleted} />
            </div>
            
            <div className="mt-6">
                <Checklist checks={CHECKS} results={results} />
            </div>
          </div>
          
          {isCheckCompleted && failedChecks.length > 0 && (
              <div className="mt-8 bg-gray-800/50 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold text-gray-200 mb-4">検出された問題</h2>
                <ResultsPanel failedChecks={failedChecks} />
                <div className="mt-6 text-center">
                    <GenerateRepairScriptButton 
                        isGenerating={isGeneratingScript} 
                        onClick={handleGenerateScript}
                        disabled={failedChecks.length === 0}
                    />
                </div>
              </div>
          )}

          {generatedScript && (
            <div className="mt-8 bg-gray-800/50 p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-semibold text-gray-200 mb-4">AIが生成した修復スクリプト</h2>
              <pre className="bg-gray-900 p-4 rounded-md text-cyan-300 overflow-x-auto text-sm">
                <code>{generatedScript}</code>
              </pre>
              <div className="mt-4 flex justify-end">
                <ExecuteRepairButton script={generatedScript} />
              </div>
            </div>
          )}

          <HistoryPanel history={history} onLoad={loadFromHistory} />
        </main>
      </div>
    </div>
  );
};

export default App;
