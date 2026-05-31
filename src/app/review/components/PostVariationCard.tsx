'use client';

import { useState } from 'react';
import { Platform, PLATFORM_LABELS, PLATFORM_CHAR_LIMITS } from '@/lib/promo/types';
import { hasCompliance } from '@/lib/promo/compliance';

interface PostVariationCardProps {
  index: number;
  content: string;
  platform: Platform;
  complianceOk: boolean;
  onCopy: () => void;
  onRegenerate: (index: number) => void;
  onChange: (index: number, value: string) => void;
  isRegenerating?: boolean;
}

export function PostVariationCard({
  index,
  content,
  platform,
  complianceOk,
  onCopy,
  onRegenerate,
  onChange,
  isRegenerating,
}: PostVariationCardProps) {
  const [copied, setCopied] = useState(false);
  const charLimit = PLATFORM_CHAR_LIMITS[platform];
  const charCount = content.length;
  const isOverLimit = charCount > charLimit;
  const isNearLimit = charCount > charLimit * 0.9;
  const compliance = hasCompliance(content);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    onCopy();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="post-card">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
            Variation {index + 1}
          </span>
          <span className="text-xs text-[#64748B]">· {PLATFORM_LABELS[platform]}</span>
        </div>
        <div className="flex items-center gap-2">
          {compliance ? (
            <span className="compliance-ok">✓ NFA</span>
          ) : (
            <span className="compliance-warn">⚠ No Disclaimer</span>
          )}
        </div>
      </div>

      {/* Editable Text Area */}
      {isRegenerating ? (
        <div className="skeleton h-28 mb-3" />
      ) : (
        <textarea
          value={content}
          onChange={(e) => onChange(index, e.target.value)}
          rows={5}
          className="w-full bg-transparent border border-white/5 rounded-lg px-3 py-2.5 text-sm text-[#F8FAFC] resize-none focus:outline-none focus:border-[#7C3AED]/40 transition-colors leading-relaxed"
        />
      )}

      {/* Char count + actions */}
      <div className="flex items-center justify-between mt-2">
        <span
          className={`text-xs font-mono ${
            isOverLimit ? 'text-[#EF4444]' : isNearLimit ? 'text-[#F59E0B]' : 'text-[#64748B]'
          }`}
        >
          {charCount.toLocaleString()} / {charLimit.toLocaleString()} chars
          {isOverLimit && ' (over limit)'}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onRegenerate(index)}
            disabled={isRegenerating}
            className="text-xs text-[#94A3B8] hover:text-[#7C3AED] transition-colors px-2 py-1 rounded border border-white/10 hover:border-[#7C3AED]/30 disabled:opacity-40"
          >
            {isRegenerating ? '…' : '↻ Regen'}
          </button>
          <button
            onClick={handleCopy}
            disabled={isRegenerating}
            className={`text-xs font-semibold px-3 py-1 rounded transition-all duration-200 ${
              copied
                ? 'bg-[#10B981] text-white'
                : 'bg-[#7C3AED] text-white hover:bg-[#6D28D9]'
            }`}
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}
