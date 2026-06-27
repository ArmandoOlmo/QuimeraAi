import React from 'react';
import { useTranslation } from 'react-i18next';
import type { WebsiteColorSystem } from '../../types/colorSystem';

type ColorExpertScoresProps = {
    scores: WebsiteColorSystem['scores'];
    totalScore: number;
    compact?: boolean;
    className?: string;
};

function scoreTone(value: number): string {
    if (value >= 80) return 'text-emerald-400';
    if (value >= 65) return 'text-q-accent';
    return 'text-amber-400';
}

function ScoreBadge({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] ${
                highlight
                    ? 'border-q-accent/30 bg-q-accent/10 text-q-accent'
                    : 'border-q-border bg-q-bg text-q-text-secondary'
            }`}
            title={`${label}: ${value}`}
        >
            <span className="truncate max-w-[4.5rem]">{label}</span>
            <span className={`font-semibold tabular-nums ${scoreTone(value)}`}>{value}</span>
        </span>
    );
}

export const ColorExpertScores: React.FC<ColorExpertScoresProps> = ({
    scores,
    totalScore,
    compact = false,
    className = '',
}) => {
    const { t } = useTranslation();
    const proportionBalance = scores.proportionBalance ?? 0;

    if (compact) {
        return (
            <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
                <span className="text-[10px] font-semibold tabular-nums text-q-accent">{totalScore}</span>
                <ScoreBadge
                    label={t('editor.controls.globalStyles.score603010Short', '60-30-10')}
                    value={proportionBalance}
                    highlight
                />
            </div>
        );
    }

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-q-text-secondary">
                    {t('editor.controls.globalStyles.scoreTotal', 'Total score')}
                </span>
                <span className="text-xs font-semibold tabular-nums text-q-accent">{totalScore}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
                <ScoreBadge label={t('editor.controls.globalStyles.scoreContrast', 'Contrast')} value={scores.contrast} />
                <ScoreBadge label={t('editor.controls.globalStyles.scoreHarmony', 'Harmony')} value={scores.harmony} />
                <ScoreBadge label={t('editor.controls.globalStyles.scoreBrandFit', 'Brand')} value={scores.brandFit} />
                <ScoreBadge label={t('editor.controls.globalStyles.scoreReadiness', 'Ready')} value={scores.componentReadiness} />
                <ScoreBadge
                    label={t('editor.controls.globalStyles.score603010', '60-30-10')}
                    value={proportionBalance}
                    highlight
                />
            </div>
            <p className="text-[10px] text-q-text-secondary">
                {t(
                    'editor.controls.globalStyles.score603010Hint',
                    '60% dominant neutrals, 30% brand colors, 10% accent pop.',
                )}
            </p>
        </div>
    );
};
