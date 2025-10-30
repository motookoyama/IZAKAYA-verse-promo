import React from 'react';
import type { Persona } from '../types';

interface SoulInspectModalProps {
  persona: Persona;
  onClose: () => void;
}

const SoulInspectModal: React.FC<SoulInspectModalProps> = ({ persona, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 transition-opacity duration-300 animate-fadeIn" onClick={onClose}>
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-lg p-6 m-4 border border-white/20 glassmorphism text-white" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">ソウル確認: <span style={{ color: persona.color }}>{persona.name}</span></h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10">
            <i data-lucide="x" className="w-6 h-6"></i>
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-izakaya-pink mb-1">バージョン</h3>
            <p className="text-sm bg-black/20 p-2 rounded">{persona.soul_core.version}</p>
          </div>
          <div>
            <h3 className="font-semibold text-izakaya-pink mb-1">行動指針 (Guideline)</h3>
            <p className="text-sm bg-black/20 p-2 rounded leading-relaxed">{persona.soul_core.guideline}</p>
          </div>
          <div>
            <h3 className="font-semibold text-izakaya-pink mb-1">コアバリュー (Core Values)</h3>
            <div className="flex flex-wrap gap-2">
              {persona.soul_core.values.map(value => (
                <span key={value} className="bg-blue-500/50 text-xs font-medium px-2.5 py-1 rounded-full">{value}</span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-izakaya-pink mb-1">キーワード (Keywords)</h3>
             <div className="flex flex-wrap gap-2">
              {persona.soul_core.keywords.map(keyword => (
                <span key={keyword} className="bg-green-500/50 text-xs font-medium px-2.5 py-1 rounded-full">{keyword}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoulInspectModal;
