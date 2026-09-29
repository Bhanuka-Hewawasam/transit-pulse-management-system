import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface SearchableSelectOption {
  value: string | number;
  label: string;
  secondaryLabel?: string;
  initials?: string;
}

interface SearchableSelectProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  disabled = false,
  ariaLabel = 'Select option',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find(opt => String(opt.value) === String(value));

  const filteredOptions = searchQuery.trim()
    ? options.filter(option => {
        const query = searchQuery.toLowerCase();
        return (
          option.label.toLowerCase().includes(query) ||
          (option.secondaryLabel && option.secondaryLabel.toLowerCase().includes(query)) ||
          String(option.value).toLowerCase().includes(query)
        );
      })
    : options;

  const openDropdown = () => {
    if (disabled) return;
    setIsOpen(true);
    setSearchQuery('');
    setTimeout(() => searchInputRef.current?.focus(), 10);
  };

  const closeDropdown = () => {
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    closeDropdown();
    triggerRef.current?.focus();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    closeDropdown();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      closeDropdown();
      triggerRef.current?.focus();
    } else if (e.key === 'Enter' && filteredOptions.length === 1) {
      handleSelect(filteredOptions[0].value);
    }
  };

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
      closeDropdown();
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, handleClickOutside]);

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* ── Trigger button ─────────────────────────────────────── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={openDropdown}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="w-full flex items-center justify-between gap-2 rounded border border-gray-300 bg-white px-3 py-2 text-sm text-left focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100 hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
      >
        <span className={`flex-1 truncate ${selectedOption ? 'text-gray-900' : 'text-gray-400'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {value && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear selection"
              onMouseDown={handleClear}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClear(e as unknown as React.MouseEvent); }}
              className="rounded p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {/* ── Dropdown panel ─────────────────────────────────────── */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[220px] rounded-lg border border-gray-200 bg-white shadow-lg">
          {/* Search input pinned at the top of the list */}
          <div className="border-b border-gray-100 p-2">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search by name…"
                aria-label="Search options"
                autoComplete="off"
                className="w-full rounded border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-56 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-gray-500">No matches</p>
            ) : (
              <ul role="listbox" aria-label={ariaLabel} className="py-1">
                {filteredOptions.map((option) => (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={String(value) === String(option.value)}
                    onClick={() => handleSelect(option.value)}
                    className={`flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-blue-50 ${
                      String(value) === String(option.value)
                        ? 'bg-blue-50 text-blue-900'
                        : 'text-gray-900'
                    }`}
                  >
                    <div className="h-8 w-8 shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-semibold text-xs">
                      {option.initials || getInitials(option.label)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{option.label}</div>
                      {option.secondaryLabel && (
                        <div className="text-xs text-gray-500 truncate">{option.secondaryLabel}</div>
                      )}
                    </div>
                    {String(value) === String(option.value) && (
                      <span className="shrink-0 text-blue-700">
                        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
                          <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                        </svg>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;