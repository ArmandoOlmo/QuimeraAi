import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@/utils';

interface ParsedOption {
  value: string;
  label: React.ReactNode;
  textLabel: string;
  disabled: boolean;
  key: React.Key;
}

type AppSelectProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  'children' | 'multiple' | 'size'
> & {
  children: React.ReactNode;
  placeholder?: string;
};

const textFromNode = (node: React.ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textFromNode).join('');
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return textFromNode(node.props.children);
  }
  return '';
};

const parseOptions = (children: React.ReactNode): ParsedOption[] => {
  const options: ParsedOption[] = [];

  const visit = (nodes: React.ReactNode, groupDisabled = false) => {
    React.Children.forEach(nodes, (child) => {
      if (!React.isValidElement(child)) return;

      if (child.type === React.Fragment) {
        visit((child.props as { children?: React.ReactNode }).children, groupDisabled);
        return;
      }

      if (child.type === 'optgroup') {
        const props = child.props as React.OptgroupHTMLAttributes<HTMLOptGroupElement>;
        visit(props.children, groupDisabled || Boolean(props.disabled));
        return;
      }

      if (child.type !== 'option') return;

      const props = child.props as React.OptionHTMLAttributes<HTMLOptionElement>;
      const textLabel = props.label ?? textFromNode(props.children);
      const value = props.value === undefined ? textLabel : String(props.value);

      options.push({
        value,
        label: props.children ?? textLabel,
        textLabel,
        disabled: groupDisabled || Boolean(props.disabled),
        key: child.key ?? `${value}-${options.length}`,
      });
    });
  };

  visit(children);
  return options;
};

const getStringValue = (
  value: React.SelectHTMLAttributes<HTMLSelectElement>['value'],
): string | undefined => {
  if (Array.isArray(value)) return value[0] === undefined ? undefined : String(value[0]);
  if (value === undefined) return undefined;
  return String(value);
};

function AppSelect({
  children,
  className,
  value,
  defaultValue,
  onChange,
  disabled,
  name,
  id,
  required,
  placeholder,
  'aria-label': ariaLabel,
  ...props
}: AppSelectProps) {
  const options = React.useMemo(() => parseOptions(children), [children]);
  const fallbackValue = React.useMemo(
    () => options.find((option) => !option.disabled)?.value ?? options[0]?.value ?? '',
    [options],
  );
  const controlledValue = getStringValue(value);
  const [internalValue, setInternalValue] = React.useState(
    getStringValue(defaultValue) ?? controlledValue ?? fallbackValue,
  );
  const selectedValue = controlledValue ?? internalValue;
  const selectedOption = options.find((option) => option.value === selectedValue);
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const reactId = React.useId();
  const listboxId = `${reactId}-listbox`;
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === selectedValue));
  const buttonProps = props as unknown as React.ButtonHTMLAttributes<HTMLButtonElement>;

  React.useEffect(() => {
    if (controlledValue === undefined && !options.some((option) => option.value === internalValue)) {
      setInternalValue(fallbackValue);
    }
  }, [controlledValue, fallbackValue, internalValue, options]);

  React.useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;

    setActiveIndex(selectedIndex);
    requestAnimationFrame(() => {
      const selectedElement = listRef.current?.querySelector('[data-selected="true"]');
      selectedElement?.scrollIntoView({ block: 'nearest' });
    });
  }, [isOpen, selectedIndex]);

  const selectValue = React.useCallback(
    (nextValue: string) => {
      const nextOption = options.find((option) => option.value === nextValue);
      if (!nextOption || nextOption.disabled) return;

      if (controlledValue === undefined) {
        setInternalValue(nextValue);
      }

      onChange?.({
        target: { value: nextValue, name },
        currentTarget: { value: nextValue, name },
      } as React.ChangeEvent<HTMLSelectElement>);

      setIsOpen(false);
      buttonRef.current?.focus();
    },
    [controlledValue, name, onChange, options],
  );

  const moveActive = React.useCallback(
    (direction: 1 | -1) => {
      if (!options.length) return;

      setActiveIndex((current) => {
        let next = current;

        for (let i = 0; i < options.length; i += 1) {
          next = (next + direction + options.length) % options.length;
          if (!options[next].disabled) return next;
        }

        return current;
      });
    },
    [options],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      moveActive(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      selectValue(options[activeIndex]?.value ?? selectedValue);
      return;
    }

    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const activeOption = options[activeIndex];

  return (
    <div
      ref={wrapperRef}
      className={cn('relative min-w-0', className?.includes('w-full') && 'w-full')}
      data-slot="app-select"
    >
      {name && <input type="hidden" name={name} value={selectedValue} required={required} />}
      <button
        {...buttonProps}
        ref={buttonRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={isOpen && activeOption ? `${reactId}-option-${activeIndex}` : undefined}
        aria-required={required}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex h-10 min-w-0 items-center justify-between gap-2 rounded-[var(--q-radius-md)] border border-border-subtle bg-q-surface px-3 text-left text-sm text-q-text shadow-[var(--q-shadow-card)] transition-all duration-[var(--q-duration-fast)]',
          'hover:border-q-border focus:outline-none focus:ring-2 focus:ring-q-accent/25',
          'disabled:cursor-not-allowed disabled:opacity-60',
          isOpen && 'border-q-accent/60 bg-q-surface ring-2 ring-q-accent/20',
          className,
        )}
      >
        <span className={cn('min-w-0 flex-1 truncate', !selectedOption && 'text-q-text-muted')}>
          {selectedOption?.label ?? placeholder ?? selectedValue}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-q-text-muted transition-transform',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {isOpen && (
        <div
          id={listboxId}
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 top-full z-[9999] mt-1 max-h-60 overflow-y-auto rounded-[var(--q-radius-lg)] border border-border-subtle bg-q-surface py-1 shadow-[var(--q-shadow-dropdown)] quimera-ds-scrollbar"
        >
          {options.map((option, index) => {
            const isSelected = option.value === selectedValue;
            const isActive = index === activeIndex;

            return (
              <button
                id={`${reactId}-option-${index}`}
                key={option.key}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-selected={isSelected}
                disabled={option.disabled}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectValue(option.value)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                  option.disabled && 'cursor-not-allowed opacity-50',
                  isSelected
                    ? 'bg-q-accent/15 font-medium text-q-accent'
                    : 'text-q-text hover:bg-q-surface-elevated/60',
                  isActive && !isSelected && 'bg-q-surface-elevated/50',
                )}
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {isSelected && <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AppSelect;
