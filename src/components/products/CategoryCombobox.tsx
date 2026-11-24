import { Check, ChevronDown, Tag } from 'lucide-react';
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { cn } from '../../lib/utils';
import type { Category } from '../../types';

export function CategoryCombobox({
  id,
  value,
  onChange,
  categories,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  categories: Category[];
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useClickOutside([containerRef], () => setOpen(false), open);

  const filtered = useMemo(() => {
    const query = value.trim().toLocaleLowerCase();
    const items = query
      ? categories.filter(
          (category) =>
            category.name.toLocaleLowerCase().includes(query) &&
            category.name.toLocaleLowerCase() !== query,
        )
      : categories;
    return items.slice(0, 8);
  }, [categories, value]);

  const exactMatch = categories.some(
    (category) => category.name.toLocaleLowerCase() === value.trim().toLocaleLowerCase(),
  );
  const listboxId = `${id}-listbox`;

  const selectCategory = (name: string) => {
    onChange(name);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!open) {
      if (event.key === 'ArrowDown' && filtered.length > 0) {
        event.preventDefault();
        setOpen(true);
        setActiveIndex(0);
      }
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIndex >= 0 && filtered[activeIndex]) {
        selectCategory(filtered[activeIndex].name);
      } else {
        setOpen(false);
      }
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
        }
        aria-invalid={invalid || undefined}
        autoComplete="off"
        value={value}
        maxLength={60}
        placeholder="e.g. Plumbing"
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className="input-base pr-10"
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={open ? 'Close category suggestions' : 'Show category suggestions'}
        onClick={() => {
          setOpen((previous) => !previous);
          inputRef.current?.focus();
        }}
        className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-subtle transition-colors hover:bg-[#F1F5F9] hover:text-ink"
      >
        <ChevronDown size={14} aria-hidden="true" />
      </button>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Categories"
          className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-[244px] animate-rise overflow-y-auto rounded-lg border border-[#E2E8F0] bg-white p-1 shadow-pop"
        >
          {filtered.length > 0 ? (
            filtered.map((category, index) => {
              const selected = category.name === value;
              return (
                <button
                  key={category.id ?? category.name}
                  id={`${listboxId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectCategory(category.name)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-[12.5px] transition-colors',
                    activeIndex === index ? 'bg-[#F3F7FD] text-ink' : 'text-[#475569]',
                  )}
                >
                  <Tag size={12.5} className="shrink-0 text-subtle" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{category.name}</span>
                  {selected ? (
                    <Check size={13} className="shrink-0 text-brand-700" aria-hidden="true" />
                  ) : null}
                </button>
              );
            })
          ) : (
            <p className="px-2.5 py-2 text-[11.5px] text-muted">
              {value.trim() && !exactMatch
                ? `“${value.trim()}” will be created when you save.`
                : categories.length === 0
                  ? 'No categories yet. Type one to create it.'
                  : 'No matching categories.'}
            </p>
          )}
          {value.trim() && !exactMatch && filtered.length > 0 ? (
            <p className="mt-1 border-t border-line px-2.5 pb-0.5 pt-1.5 text-[10.5px] text-subtle">
              New category “{value.trim()}” will be created on save.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
