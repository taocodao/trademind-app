'use client';

import { Theme, THEME_LABELS } from '@/lib/promo/types';

interface ThemeGridProps {
  selected: Theme | null;
  onSelect: (theme: Theme) => void;
  customText: string;
  onCustomChange: (text: string) => void;
}

const THEME_EMOJIS: Partial<Record<Theme, string>> = {
  'backtest-story': '📈',
  'regime-signal': '🎯',
  'genz-wealth': '💰',
  'stress-test-2022': '🛡️',
  'chatbot-demo': '🤖',
  'authentic-review': '⭐',
  'proved-right': '✅',
  'proved-wrong': '🤔',
  'beginners-intro': '🌱',
  'leaps-education': '📊',
  'community-spotlight': '🏆',
  custom: '✏️',
};

export function ThemeGrid({ selected, onSelect, customText, onCustomChange }: ThemeGridProps) {
  const themes = Object.keys(THEME_LABELS) as Theme[];

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {themes.map((theme) => (
          <button
            key={theme}
            onClick={() => onSelect(theme)}
            className={`theme-btn text-left ${selected === theme ? 'selected' : ''}`}
          >
            <span className="mr-1.5">{THEME_EMOJIS[theme]}</span>
            {THEME_LABELS[theme]}
          </button>
        ))}
      </div>

      {selected === 'custom' && (
        <div className="mt-3">
          <textarea
            value={customText}
            onChange={(e) => onCustomChange(e.target.value)}
            placeholder="Describe what you want to post about… (e.g. 'I followed the BULL signal and QQQ was up 2% the next day')"
            rows={3}
            className="w-full bg-[#0A0A0F] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#7C3AED] transition-colors resize-none"
          />
        </div>
      )}
    </div>
  );
}
