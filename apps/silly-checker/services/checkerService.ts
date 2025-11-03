import type { CheckResult } from '../types';
import { CheckStatus } from '../types';
import { CHECKS } from '../constants';

// Helper to simulate async operations
const simulateDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// A sample malformed JSON for testing the syntax check
const sampleBadJson = `{
  "key": "value",
  "anotherKey": "anotherValue"
  "forgottenComma": true 
}`;

const checkSimulations: Record<string, () => Promise<Omit<CheckResult, 'checkId' | 'status'>>> = {
  'bff-health': async () => {
    if (Math.random() > 0.8) {
      return {
        message: 'BFFエンドポイント /health/ping が応答しません。タイムアウトしました。',
        suggestion: 'BFFサーバーが実行中でアクセス可能であることを確認してください。',
      };
    }
    return { message: 'BFFは正常で応答しています。' };
  },
  'ui-health': async () => {
    return { message: 'UIの生存確認ファイルはアクセス可能です。' };
  },
  'env-mismatch': async () => {
    if (Math.random() > 0.7) {
      return {
        message: 'VITE_BFF_URLがUIのアドレス(localhost:5173)を指しています。',
        suggestion: '.envファイルでVITE_BFF_URLとUI_URLの値を交換してください。',
      };
    }
    return { message: '環境変数のURLは正しく設定されているようです。' };
  },
  'env-completeness': async () => {
    if (Math.random() > 0.6) {
      return {
        message: '.envファイルに必須キーVITE_API_KEYがありません。',
        suggestion: 'VITE_API_KEYを.envファイルに追加し、有効な値を設定してください。',
      };
    }
    return { message: '.envファイルにはすべての必須キーが含まれています。' };
  },
  'json-syntax': async () => {
    try {
      if (Math.random() > 0.5) {
        JSON.parse(sampleBadJson);
      }
      return { message: 'persona-engine.jsonは有効な構文です。' };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '不明なJSONエラー';
      return {
        message: `persona-engine.jsonの解析に失敗しました: ${errorMessage}。`,
        suggestion: 'JSONファイル内のカンマ、括弧、引用符の欠落を確認してください。',
      };
    }
  },
  'port-conflict': async () => {
    if (Math.random() > 0.85) {
      return {
        message: 'ポート7000はすでに別のプロセスによって使用されています。',
        suggestion: 'ポート7000を使用しているプロセスを停止するか、BFFが別のポートを使用するように設定してください。',
      };
    }
    return { message: '必須ポート7000は利用可能です。' };
  },
  'dependency-path': async () => {
     if (Math.random() > 0.9) {
      return {
        message: 'Persona Engineのパスが無効か、モジュールが見つかりません。',
        suggestion: '`rm -rf node_modules && npm install` を実行して依存関係を再構築してください。',
      };
    }
    return { message: '依存関係のパスは正しく解決されています。' };
  },
};


export const runAllChecks = async (onProgress: (result: CheckResult) => void) => {
  for (const check of CHECKS) {
    onProgress({
      checkId: check.id,
      status: CheckStatus.RUNNING,
      message: 'Running check...',
    });
    
    await simulateDelay(500 + Math.random() * 500);

    const simulation = checkSimulations[check.id];
    if (simulation) {
      const result = await simulation();
      const status = result.suggestion ? CheckStatus.FAIL : CheckStatus.SUCCESS;
      onProgress({
        checkId: check.id,
        status,
        ...result,
      });
    } else {
       onProgress({
        checkId: check.id,
        status: CheckStatus.FAIL,
        message: 'Check logic not implemented.',
        suggestion: 'Contact support to implement this check.'
      });
    }
  }
};