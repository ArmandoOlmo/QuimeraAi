import React from 'react';
import { SliderControl } from './EditorControlPrimitives';
import { DEFAULT_CARD_PADDING, resolveCardPadding, type CardPaddingFields, type CardPaddingKey } from '../../utils/cardPadding';

interface CardPaddingControlProps {
  label?: string;
  value?: CardPaddingFields | null;
  onChange: (key: CardPaddingKey, value: number) => void;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
}

const sideControls: { key: CardPaddingKey; label: string; valueKey: keyof ReturnType<typeof resolveCardPadding> }[] = [
  { key: 'cardPaddingTop', label: 'Top', valueKey: 'top' },
  { key: 'cardPaddingRight', label: 'Right', valueKey: 'right' },
  { key: 'cardPaddingBottom', label: 'Bottom', valueKey: 'bottom' },
  { key: 'cardPaddingLeft', label: 'Left', valueKey: 'left' },
];

const CardPaddingControl: React.FC<CardPaddingControlProps> = ({
  label = 'Card padding',
  value,
  onChange,
  defaultValue = DEFAULT_CARD_PADDING,
  min = 0,
  max = 96,
  step = 2,
}) => {
  const resolved = resolveCardPadding(value, defaultValue);
  const baseValue = value?.cardPadding ?? defaultValue;

  const syncAllSides = (nextValue: number) => {
    onChange('cardPadding', nextValue);
    onChange('cardPaddingTop', nextValue);
    onChange('cardPaddingRight', nextValue);
    onChange('cardPaddingBottom', nextValue);
    onChange('cardPaddingLeft', nextValue);
  };

  return (
    <div className="space-y-3 rounded-lg border border-q-border/70 bg-q-surface/40 p-3">
      <SliderControl
        label={label}
        value={baseValue}
        onChange={syncAllSides}
        min={min}
        max={max}
        step={step}
        suffix="px"
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sideControls.map((control) => (
          <SliderControl
            key={control.key}
            label={control.label}
            value={resolved[control.valueKey]}
            onChange={(nextValue) => onChange(control.key, nextValue)}
            min={min}
            max={max}
            step={step}
            suffix="px"
          />
        ))}
      </div>
    </div>
  );
};

export default CardPaddingControl;
