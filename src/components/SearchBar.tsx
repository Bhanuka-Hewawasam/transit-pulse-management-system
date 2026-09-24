// File: d:\Robo_Mob\Robo-Controller\smartmove\src\components\SearchBar.tsx

import React, { useRef } from 'react';
import { Search, X } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SearchBarProps {
  /** Controlled value of the search input */
  value: string;
  /** Called whenever the input changes or the clear button is clicked */
  onChange: (value: string) => void;
  /** Placeholder text shown when the field is empty */
  placeholder?: string;
  /** Extra Tailwind classes applied to the outer wrapper */
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * SearchBar – a fully controlled, clearable search input field.
 *
 * Features:
 * - Leading magnifying-glass icon
 * - Clear (×) button appears when there is text; clicking it resets the value
 *   and returns focus to the input
 * - Blue focus ring consistent with the SmartMove palette
 * - Full-width by default; override with the `className` prop
 */
const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search…',
  className = '',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  /** Clear the field and restore focus so the user can keep typing */
  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className={`relative w-full ${className}`}>
      {/* Search icon – absolutely positioned on the left */}
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
        <Search size={16} className="text-gray-400" />
      </span>

      {/* Text input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full
          rounded-lg border border-gray-200 bg-white
          py-2 pl-9 pr-9
          text-sm text-gray-800 placeholder-gray-400
          outline-none
          transition-shadow duration-150
          focus:border-blue-400 focus:ring-2 focus:ring-blue-200
          hover:border-gray-300
        "
        style={
          // Ensure focus ring uses our sky blue (#3584e4 at 30 % opacity)
          undefined
        }
        aria-label="Search"
      />

      {/* Clear button – only visible when there is text */}
      {value.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="
            absolute inset-y-0 right-2.5
            flex items-center justify-center
            w-5 h-full
            text-gray-400 hover:text-gray-600
            transition-colors duration-100
          "
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
