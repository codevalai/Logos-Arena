import React from 'react';
import { PHILOSOPHER_ROSTER } from '../engine/FighterRoster';

interface PhilosopherPortraitProps {
  philosopherKey: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PhilosopherPortrait: React.FC<PhilosopherPortraitProps> = ({
  philosopherKey,
  size = 'md',
  className = '',
}) => {
  const profile = PHILOSOPHER_ROSTER[philosopherKey] || PHILOSOPHER_ROSTER.SOCRATES;
  const { visual, stagePalette } = profile;

  const dimensions =
    size === 'sm' ? 'w-11 h-11' : size === 'lg' ? 'w-24 h-24' : 'w-16 h-16';

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-slate-700/80 shrink-0 ${dimensions} ${className}`}
      style={{
        background: `linear-gradient(155deg, ${stagePalette.skyTop} 0%, ${stagePalette.skyBottom} 100%)`,
      }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        aria-label={profile.name}
        role="img"
      >
        {/* Subtle halo / era geometric aura */}
        <circle
          cx="50"
          cy="45"
          r="34"
          fill="none"
          stroke={stagePalette.accentGlow}
          strokeOpacity="0.28"
          strokeWidth="1.5"
        />

        {/* Shoulders & Historical Attire Robe/Coat */}
        <path
          d="M 16 100 C 18 72, 34 66, 50 66 C 66 66, 82 72, 84 100 Z"
          fill={visual.primaryRobe}
          stroke={visual.secondaryTrim}
          strokeWidth="2.5"
        />

        {/* Stole / Collar / Lapel Trim */}
        <path
          d="M 38 67 L 50 88 L 62 67"
          fill="none"
          stroke={visual.secondaryTrim}
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Neck & Head */}
        <rect x="43" y="54" width="14" height="16" rx="4" fill={visual.skinTone} />
        <ellipse cx="50" cy="43" rx="17" ry="20" fill={visual.skinTone} />

        {/* Hair / Wig */}
        {visual.headwear === 'wig' ? (
          <path
            d="M 31 38 C 26 48, 28 65, 34 68 C 34 52, 35 32, 50 28 C 65 32, 66 52, 66 68 C 72 65, 74 48, 69 38 C 67 24, 33 24, 31 38 Z"
            fill={visual.hairColor}
          />
        ) : (
          <path
            d="M 32 40 C 32 23, 68 23, 68 40 C 66 30, 34 30, 32 40 Z"
            fill={visual.hairColor}
          />
        )}

        {/* Headwear */}
        {visual.headwear === 'laurel' && (
          <path
            d="M 31 35 Q 50 25 69 35"
            fill="none"
            stroke="#10B981"
            strokeWidth="3.5"
            strokeDasharray="4 2"
          />
        )}
        {visual.headwear === 'scholar_cap' && (
          <g>
            <rect x="36" y="16" width="28" height="12" rx="2" fill="#1E293B" stroke="#D97706" strokeWidth="1.5" />
            <line x1="26" y1="24" x2="74" y2="24" stroke="#D97706" strokeWidth="2.5" />
          </g>
        )}
        {visual.headwear === 'mitre' && (
          <path
            d="M 34 28 L 50 10 L 66 28 Z"
            fill="#78350F"
            stroke="#F59E0B"
            strokeWidth="2"
          />
        )}
        {visual.headwear === 'florentine_cap' && (
          <path
            d="M 30 30 Q 50 18 70 30 L 66 22 Q 50 14 34 22 Z"
            fill="#881337"
          />
        )}
        {visual.headwear === 'tricorn' && (
          <path
            d="M 24 28 L 50 15 L 76 28 L 66 31 L 34 31 Z"
            fill="#0F172A"
            stroke="#F8FAFC"
            strokeWidth="1.5"
          />
        )}
        {visual.headwear === 'top_hat' && (
          <g>
            <rect x="35" y="10" width="30" height="17" fill="#0F172A" />
            <line x1="27" y1="27" x2="73" y2="27" stroke="#0F172A" strokeWidth="3.5" />
          </g>
        )}
        {visual.headwear === 'beret' && (
          <ellipse cx="48" cy="24" rx="19" ry="7" fill="#1E293B" transform="rotate(-8 48 24)" />
        )}
        {visual.headwear === 'rustic_cap' && (
          <path d="M 32 30 Q 50 16 68 30 Z" fill="#78350F" />
        )}

        {/* Eyes & Brows */}
        <line x1="39" y1="38" x2="46" y2="39" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
        <line x1="54" y1="39" x2="61" y2="38" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
        <circle cx="43" cy="42" r="2" fill="#0F172A" />
        <circle cx="57" cy="42" r="2" fill="#0F172A" />

        {/* Spectacles for Nietzsche, Hegel, Sartre */}
        {(philosopherKey === 'NIETZSCHE' || philosopherKey === 'HEGEL' || philosopherKey === 'SARTRE') && (
          <g stroke="#F59E0B" strokeWidth="1.4" fill="none">
            <circle cx="43" cy="42" r="5" />
            <circle cx="57" cy="42" r="5" />
            <line x1="48" y1="42" x2="52" y2="42" />
          </g>
        )}

        {/* Beard / Mustache Styles */}
        {visual.beardStyle === 'full' && (
          <path
            d="M 33 46 C 33 65, 43 72, 50 72 C 57 72, 67 65, 67 46 C 62 52, 55 54, 50 54 C 45 54, 38 52, 33 46 Z"
            fill={visual.hairColor}
          />
        )}
        {visual.beardStyle === 'long_white' && (
          <path
            d="M 35 48 C 35 72, 45 86, 50 88 C 55 86, 65 72, 65 48 C 58 53, 42 53, 35 48 Z"
            fill="#F8FAFC"
          />
        )}
        {visual.beardStyle === 'mustache' && (
          <path
            d="M 37 52 Q 50 45 63 52 Q 56 58 50 53 Q 44 58 37 52 Z"
            fill={visual.hairColor}
          />
        )}
        {visual.beardStyle === 'goatee' && (
          <g fill={visual.hairColor}>
            <path d="M 41 50 Q 50 47 59 50 Q 50 53 41 50 Z" />
            <polygon points="47,55 53,55 50,63" />
          </g>
        )}
        {visual.beardStyle === 'clean' && (
          <line x1="45" y1="53" x2="55" y2="53" stroke="#7C2D12" strokeWidth="1.8" strokeLinecap="round" />
        )}
      </svg>
    </div>
  );
};
