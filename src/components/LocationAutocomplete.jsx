/**
 * LocationAutocomplete Component
 * 
 * A reusable input component with location suggestions dropdown.
 * Features:
 * - Instant local suggestions (no API cost)
 * - Debounced Google Places API calls
 * - Visual indicators for loading and source
 * - Keyboard navigation support
 * - Click outside to close
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocationAutocomplete } from "../hooks/useLocationAutocomplete.js";
import { getLocationIcon } from "../utils/localLocations.js";

const LocationAutocomplete = ({
  value,
  onChange,
  onSelect,
  placeholder = "Enter location...",
  label,
  className = "",
  disabled = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const {
    query,
    suggestions,
    isLoading,
    error,
    source,
    handleInputChange,
    handleSelect,
    setQuery,
    clearSuggestions,
  } = useLocationAutocomplete();

  // Sync external value with internal query
  useEffect(() => {
    if (value !== undefined && value !== query) {
      setQuery(value);
    }
  }, [value, query, setQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsFocused(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle input change
  const handleChange = useCallback(
    (e) => {
      const newValue = e.target.value;
      handleInputChange(newValue);
      onChange?.(newValue);
      setHighlightedIndex(-1);
    },
    [handleInputChange, onChange]
  );

  // Handle suggestion click
  const handleSuggestionClick = useCallback(
    (suggestion, index) => {
      const selected = handleSelect(suggestion);
      const address = selected.fullAddress || selected.description || selected.name;
      onChange?.(address);
      onSelect?.(selected);
      setIsFocused(false);
      setHighlightedIndex(-1);
    },
    [handleSelect, onChange, onSelect]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (!isFocused || suggestions.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
            handleSuggestionClick(suggestions[highlightedIndex], highlightedIndex);
          }
          break;
        case "Escape":
          setIsFocused(false);
          setHighlightedIndex(-1);
          clearSuggestions();
          break;
        default:
          break;
      }
    },
    [isFocused, suggestions, highlightedIndex, handleSuggestionClick, clearSuggestions]
  );

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current && highlightedIndex >= 0) {
      const items = listRef.current.querySelectorAll("[data-suggestion]");
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [highlightedIndex]);

  // Get source indicator badge
  const getSourceBadge = (suggestionSource) => {
    switch (suggestionSource) {
      case "local":
        return (
          <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium rounded bg-green-100 text-green-700">
            Local
          </span>
        );
      case "cache":
        return (
          <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-100 text-blue-700">
            Cached
          </span>
        );
      case "api":
        return (
          <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-100 text-purple-700">
            Google
          </span>
        );
      default:
        return null;
    }
  };

  const showDropdown = isFocused && (suggestions.length > 0 || isLoading || error);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-sm text-gray-600 mb-1">{label}</label>
      )}
      <div className="flex items-center border border-gray-300 bg-white rounded px-3 py-2 focus-within:border-purple-500">
        {/* Search icon */}
        <svg
          className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none disabled:opacity-50"
        />

        {/* Loading spinner */}
        {isLoading && (
          <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-purple-600 flex-shrink-0" />
        )}

        {/* Clear button */}
        {query && !isLoading && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              onChange?.("");
              clearSuggestions();
              inputRef.current?.focus();
            }}
            className="ml-2 p-1 text-zinc-400 hover:text-zinc-600 transition-colors flex-shrink-0"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Helper text */}
      <p className="mt-1 text-[11px] text-zinc-500">
        Type 5+ characters for suggestions
        {source && suggestions.length > 0 && (
          <span className="ml-1">
            · {suggestions.length} result{suggestions.length !== 1 ? "s" : ""} from {source}
          </span>
        )}
      </p>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full rounded-xl border border-zinc-200 bg-white shadow-lg max-h-60 overflow-auto"
        >
          {/* Error message */}
          {error && (
            <div className="px-4 py-3 text-sm text-red-600 bg-red-50 border-b border-red-100">
              ⚠️ {error}
            </div>
          )}

          {/* Loading state */}
          {isLoading && suggestions.length === 0 && (
            <div className="px-4 py-3 text-sm text-zinc-500 flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-purple-600" />
              Searching...
            </div>
          )}

          {/* Suggestions list */}
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.placeId || `${suggestion.name}-${index}`}
              data-suggestion
              onClick={() => handleSuggestionClick(suggestion, index)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`w-full px-4 py-3 text-left text-sm border-b border-zinc-100 last:border-0 transition-colors flex items-start gap-2 ${highlightedIndex === index
                ? "bg-purple-50"
                : "hover:bg-zinc-50"
                }`}
            >
              {/* Icon */}
              <span className="flex-shrink-0 text-base">
                {getLocationIcon(suggestion.type)}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-zinc-900 flex items-center flex-wrap">
                  <span className="truncate">{suggestion.name}</span>
                  {getSourceBadge(suggestion.source)}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5 truncate">
                  {suggestion.fullAddress}
                </div>
              </div>
            </button>
          ))}

          {/* No results */}
          {!isLoading && !error && suggestions.length === 0 && query.length >= 5 && (
            <div className="px-4 py-3 text-sm text-zinc-500">
              No locations found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;
