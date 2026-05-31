'use client';

import { Tone, TONE_LABELS } from '@/lib/promo/types';

interface ToneDropdownProps {
  selected: Tone | null;
  onSelect: (tone: Tone) => void;
}

export function ToneDropdown({ selected, onSelect }: ToneDropdownProps) {
  const tones = Object.keys(TONE_LABELS) as Tone[];

  return (
    <div className="relative">
      <select
        value={selected || ''}
        onChange={(e) => onSelect(e.target.value as Tone)}
        className="w-full bg-[#1A1A2E] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#7C3AED] transition-colors appearance-none cursor-pointer"
      >
        <option value="" disabled className="text-[#64748B]">
          Select a tone…
        </option>
        {tones.map((tone) => (
          <option key={tone} value={tone} className="bg-[#1A1A2E]">
            {TONE_LABELS[tone].emoji} {TONE_LABELS[tone].label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
