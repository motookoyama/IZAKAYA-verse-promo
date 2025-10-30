import React from 'react';
import type { Persona } from '../types';

interface CharacterCardProps {
  persona: Persona;
  isSelected: boolean;
  onSelect: (id: Persona['id']) => void;
}

const CharacterCard: React.FC<CharacterCardProps> = ({ persona, isSelected, onSelect }) => {
  const glowColor = persona.id === 'dr_orb' ? 'var(--tw-color-izakaya-cyan-glow)' : 'var(--tw-color-izakaya-pink-glow)';
  
  return (
    <button
      onClick={() => onSelect(persona.id)}
      className={`w-full p-4 rounded-xl text-left transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 ${
        isSelected ? 'ring-4 shadow-lg soul-glow' : 'ring-1 ring-white/20'
      } glassmorphism`}
      style={{
        borderColor: isSelected ? glowColor : undefined,
        boxShadow: isSelected ? `0 0 25px ${glowColor}` : undefined,
        '--tw-ring-color': glowColor,
      } as React.CSSProperties}
    >
      <div className="flex items-center space-x-4">
        <img
          src={persona.avatarUrl}
          alt={persona.name}
          className="w-16 h-16 rounded-full border-2"
          style={{ borderColor: persona.color }}
        />
        <div>
          <h3 className="text-lg font-bold text-white">{persona.name}</h3>
          <p className="text-sm text-slate-300">{persona.role}</p>
        </div>
      </div>
    </button>
  );
};

export default CharacterCard;