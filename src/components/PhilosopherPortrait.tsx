import React from 'react';
import { PHILOSOPHER_ROSTER } from '../engine/FighterRoster';

interface PhilosopherPortraitProps {
  philosopherKey: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
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
    size === 'xs'
      ? 'w-8 h-8'
      : size === 'sm'
      ? 'w-11 h-11'
      : size === 'lg'
      ? 'w-24 h-24'
      : 'w-16 h-16';

  const gradId = `skin-${philosopherKey}`;
  const robeGradId = `robe-${philosopherKey}`;
  const glowGradId = `glow-${philosopherKey}`;

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-slate-700/90 shadow-inner shrink-0 ${dimensions} ${className}`}
      style={{
        background: `radial-gradient(circle at 50% 35%, ${stagePalette.skyBottom} 0%, ${stagePalette.skyTop} 75%, #090D16 100%)`,
      }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        aria-label={profile.name}
        role="img"
      >
        <defs>
          <radialGradient id={gradId} cx="42%" cy="38%" r="58%">
            <stop offset="0%" stopColor="#FFE8CE" />
            <stop offset="62%" stopColor={visual.skinTone} />
            <stop offset="100%" stopColor="#7C4D32" />
          </radialGradient>
          <linearGradient id={robeGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={visual.primaryRobe} />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          <radialGradient id={glowGradId} cx="50%" cy="42%" r="48%">
            <stop offset="0%" stopColor={stagePalette.accentGlow} stopOpacity="0.45" />
            <stop offset="100%" stopColor={stagePalette.accentGlow} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Era Halo / Sacred Geometric Crest Behind Head */}
        <circle cx="50" cy="42" r="42" fill={`url(#${glowGradId})`} />
        <circle
          cx="50"
          cy="42"
          r="35"
          fill="none"
          stroke={stagePalette.accentGlow}
          strokeOpacity="0.4"
          strokeWidth="1.2"
          strokeDasharray="3 2"
        />

        {/* Back Hair / Flowing Locks / Cape Collar */}
        {visual.headwear === 'wig' ? (
          <path
            d="M 27 38 C 22 50, 24 72, 31 76 C 32 54, 34 30, 50 25 C 66 30, 68 54, 69 76 C 76 72, 78 50, 73 38 C 70 20, 30 20, 27 38 Z"
            fill={visual.hairColor}
            stroke="#0F172A"
            strokeWidth="1.2"
          />
        ) : (
          <path
            d="M 29 42 C 27 22, 73 22, 71 42 C 73 56, 68 62, 65 62 L 35 62 C 32 62, 27 56, 29 42 Z"
            fill={visual.hairColor}
          />
        )}

        {/* Sculpted Shoulders, Historical Tunic/Coat & Gold Pauldrons */}
        <path
          d="M 12 100 C 15 70, 32 64, 50 64 C 68 64, 85 70, 88 100 Z"
          fill={`url(#${robeGradId})`}
          stroke={visual.secondaryTrim}
          strokeWidth="2.5"
        />

        {/* Ornate Stole / Lapel / Philosophical Collar & Medallion */}
        <path
          d="M 35 65 L 50 92 L 65 65"
          fill="none"
          stroke={visual.secondaryTrim}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle
          cx="50"
          cy="80"
          r="4.5"
          fill="#FDE047"
          stroke="#92400E"
          strokeWidth="1.2"
        />

        {/* Shaded Neck */}
        <rect x="42" y="53" width="16" height="16" rx="5" fill={`url(#${gradId})`} />

        {/* Ears */}
        <ellipse cx="31" cy="44" rx="3.5" ry="6" fill={visual.skinTone} stroke="#451A03" strokeWidth="0.8" />
        <ellipse cx="69" cy="44" rx="3.5" ry="6" fill={visual.skinTone} stroke="#451A03" strokeWidth="0.8" />

        {/* Sculpted Head with Cheekbones & Jawline */}
        <path
          d="M 32 36 C 32 21, 68 21, 68 36 C 68 48, 63 61, 50 63 C 37 61, 32 48, 32 36 Z"
          fill={`url(#${gradId})`}
          stroke="#1E293B"
          strokeWidth="1.4"
        />

        {/* Forehead / Temple Hair Framing */}
        {visual.headwear !== 'wig' && (
          <path
            d="M 31 38 C 31 21, 69 21, 69 38 C 66 28, 58 26, 50 26 C 42 26, 34 28, 31 38 Z"
            fill={visual.hairColor}
          />
        )}

        {/* Expressive Eyes with Sclera, Iris, Pupil & White Catchlight */}
        <g>
          <ellipse cx="42" cy="41" rx="4.2" ry="2.6" fill="#FFFFFF" stroke="#0F172A" strokeWidth="0.8" />
          <ellipse cx="58" cy="41" rx="4.2" ry="2.6" fill="#FFFFFF" stroke="#0F172A" strokeWidth="0.8" />
          <circle cx="42.5" cy="41" r="2" fill="#0F172A" />
          <circle cx="57.5" cy="41" r="2" fill="#0F172A" />
          <circle cx="43.3" cy="40.2" r="0.8" fill="#FFFFFF" />
          <circle cx="58.3" cy="40.2" r="0.8" fill="#FFFFFF" />
        </g>

        {/* Furrowed Philosophical Eyebrows */}
        <path
          d="M 36 36.5 Q 42 35 46.5 38"
          fill="none"
          stroke={visual.beardStyle === 'long_white' ? '#F8FAFC' : '#1E293B'}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M 64 36.5 Q 58 35 53.5 38"
          fill="none"
          stroke={visual.beardStyle === 'long_white' ? '#F8FAFC' : '#1E293B'}
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* Sculpted Nose Bridge & Shadow */}
        <path
          d="M 50 38 L 48.5 47.5 L 52.5 48"
          fill="none"
          stroke="#5C3A21"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Cheekbone Contour Lines */}
        <path d="M 35 46 Q 38 50 40 52" fill="none" stroke="rgba(124,77,50,0.45)" strokeWidth="1.2" />
        <path d="M 65 46 Q 62 50 60 52" fill="none" stroke="rgba(124,77,50,0.45)" strokeWidth="1.2" />

        {/* Gold Spectacles for Nietzsche, Hegel, Sartre */}
        {(philosopherKey === 'NIETZSCHE' ||
          philosopherKey === 'HEGEL' ||
          philosopherKey === 'SARTRE') && (
          <g stroke="#FDE047" strokeWidth="1.6" fill="rgba(56, 189, 248, 0.14)">
            <circle cx="42" cy="41" r="5.6" />
            <circle cx="58" cy="41" r="5.6" />
            <line x1="47.6" y1="41" x2="52.4" y2="41" />
          </g>
        )}

        {/* Detailed Beard / Mustache Styles */}
        {visual.beardStyle === 'full' && (
          <g>
            <path
              d="M 32 45 C 31 66, 42 75, 50 76 C 58 75, 69 66, 68 45 C 63 51, 56 53, 50 53 C 44 53, 37 51, 32 45 Z"
              fill={visual.hairColor}
              stroke="#0F172A"
              strokeWidth="1"
            />
            <path
              d="M 41 51 Q 50 48 59 51"
              fill="none"
              stroke="#0F172A"
              strokeWidth="1.5"
            />
          </g>
        )}
        {visual.beardStyle === 'long_white' && (
          <g>
            <path
              d="M 34 46 C 33 74, 44 90, 50 93 C 56 90, 67 74, 66 46 C 59 52, 41 52, 34 46 Z"
              fill="#F8FAFC"
              stroke="#94A3B8"
              strokeWidth="1"
            />
            <path d="M 40 50 Q 50 46 60 50" fill="none" stroke="#CBD5E1" strokeWidth="2" />
          </g>
        )}
        {visual.beardStyle === 'mustache' && (
          <g>
            <path d="M 44 55 L 56 55" stroke="#5C3A21" strokeWidth="1.5" strokeLinecap="round" />
            <path
              d="M 35 53 Q 50 43 65 53 Q 57 60 50 53 Q 43 60 35 53 Z"
              fill={visual.hairColor}
              stroke="#0F172A"
              strokeWidth="0.9"
            />
          </g>
        )}
        {visual.beardStyle === 'goatee' && (
          <g fill={visual.hairColor}>
            <path d="M 40 50 Q 50 46 60 50 Q 50 53 40 50 Z" />
            <polygon points="46,55 54,55 50,65" />
          </g>
        )}
        {visual.beardStyle === 'clean' && (
          <path
            d="M 44 53 Q 50 55.5 56 53"
            fill="none"
            stroke="#6B3410"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}

        {/* Historical Headwear & Crowns */}
        {philosopherKey === 'SOCRATES' && (
          <rect x="31" y="27" width="38" height="3.5" rx="1.5" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="0.8" />
        )}
        {visual.headwear === 'laurel' && (
          <g stroke="#10B981" strokeWidth="3.2" fill="none">
            <path d="M 30 35 Q 50 22 70 35" strokeDasharray="5 2" />
            <circle cx="50" cy="26" r="2.2" fill="#FDE047" stroke="none" />
          </g>
        )}
        {visual.headwear === 'scholar_cap' && (
          <g>
            <rect x="34" y="14" width="32" height="14" rx="2" fill="#0F172A" stroke="#F59E0B" strokeWidth="1.6" />
            <line x1="24" y1="24" x2="76" y2="24" stroke="#F59E0B" strokeWidth="3" />
            <circle cx="50" cy="20" r="2.5" fill="#FDE047" />
          </g>
        )}
        {visual.headwear === 'mitre' && (
          <g>
            <path
              d="M 33 28 L 50 7 L 67 28 Z"
              fill="#78350F"
              stroke="#FDE047"
              strokeWidth="2"
            />
            <line x1="50" y1="10" x2="50" y2="27" stroke="#FDE047" strokeWidth="2" />
          </g>
        )}
        {visual.headwear === 'florentine_cap' && (
          <path
            d="M 28 30 Q 50 16 72 30 L 67 20 Q 50 12 33 20 Z"
            fill="#9F1239"
            stroke="#FDE047"
            strokeWidth="1.2"
          />
        )}
        {visual.headwear === 'tricorn' && (
          <path
            d="M 22 28 L 50 13 L 78 28 L 67 31 L 33 31 Z"
            fill="#0F172A"
            stroke="#FDE047"
            strokeWidth="1.6"
          />
        )}
        {visual.headwear === 'top_hat' && (
          <g>
            <rect x="34" y="8" width="32" height="19" rx="2" fill="#0F172A" stroke="#334155" strokeWidth="1" />
            <rect x="34" y="23" width="32" height="3.5" fill="#F59E0B" />
            <line x1="25" y1="27" x2="75" y2="27" stroke="#0F172A" strokeWidth="4" />
          </g>
        )}
        {visual.headwear === 'beret' && (
          <ellipse cx="48" cy="23" rx="20" ry="7.5" fill="#1E293B" stroke="#475569" strokeWidth="1" transform="rotate(-8 48 23)" />
        )}
        {visual.headwear === 'rustic_cap' && (
          <path d="M 31 30 Q 50 15 69 30 Z" fill="#78350F" stroke="#D97706" strokeWidth="1.2" />
        )}
      </svg>
    </div>
  );
};
