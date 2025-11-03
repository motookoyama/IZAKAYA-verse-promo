import type { Check } from './types';

export const CHECKS: Check[] = [
  {
    id: 'bff-health',
    label: 'BFFエンドポイント',
    description: 'BFFの/health/pingエンドポイントが応答するかを確認します。',
  },
  {
    id: 'ui-health',
    label: 'UIの可用性',
    description: 'UIが生存確認ファイルを提供しているかを確認します。',
  },
  {
    id: 'env-mismatch',
    label: '環境変数のURL不一致',
    description: 'VITE_BFF_URLとUI_URLが逆になっていないかを確認します。',
  },
  {
    id: 'env-completeness',
    label: '.envの設定',
    description: '.envファイル内の必須値が欠損していないかを確認します。',
  },
  {
    id: 'json-syntax',
    label: 'JSON構文',
    description: '重要なJSON設定ファイルの構文を検証します。',
  },
  {
    id: 'port-conflict',
    label: 'ポートの競合',
    description: '別のサービスが必要なポートを占有していないか検出します。',
  },
  {
    id: 'dependency-path',
    label: '依存関係パス',
    description: 'persona-engineのような重要な依存関係パスが有効かを確認します。',
  },
];