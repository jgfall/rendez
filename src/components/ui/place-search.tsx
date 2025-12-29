'use client';

import { useState, useRef, useEffect } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import { Input } from './input';

export interface PlaceResult {
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  types?: string[];
  photoUrl?: string;
}

interface PlaceSearchProps {
  value?: PlaceResult | null;
  onChange: (place: PlaceResult | null) => void;
  placeholder?: string;
  label?: string;
  hint?: string;
  onPlaceSelect?: (place: PlaceResult) => void;
}

// This component can be enhanced with Google Maps Places API
// For now, it provides a search interface that can be connected to any place search service
export function PlaceSearch({
  value,
  onChange,
  placeholder = 'Search for a place...',
  label = 'Location',
  hint,
  onPlaceSelect,
}: PlaceSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize search query from value
  useEffect(() => {
    if (value?.name) {
      setSearchQuery(value.name);
    }
  }, [value]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      setShowResults(false);
      setError(null);
      return;
    }

    setIsSearching(true);
    setShowResults(true);
    setError(null);

    try {
      const response = await fetch(`/api/places/search?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (!response.ok) {
        // Show the actual error message from the API
        setError(data.error || 'Failed to search places');
        setResults([]);
        return;
      }

      setResults(data.results || []);
    } catch (error) {
      console.error('Error searching places:', error);
      setError('Network error. Please check your connection.');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    handleSearch(query);
  };

  const handleSelectPlace = (place: PlaceResult) => {
    setSearchQuery(place.name);
    setShowResults(false);
    onChange(place);
    onPlaceSelect?.(place);
  };

  const handleClear = () => {
    setSearchQuery('');
    setResults([]);
    onChange(null);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sand-400">
          <Search className="h-4 w-4" />
        </div>
        <Input
          ref={inputRef}
          label={label}
          placeholder={placeholder}
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => {
            if (results.length > 0 || searchQuery) {
              setShowResults(true);
            }
          }}
          hint={hint || 'Start typing to search for a place'}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sand-400 hover:text-sand-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (isSearching || results.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-sand-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {isSearching ? (
            <div className="p-4 text-center text-sand-500 text-sm">Searching...</div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((place, index) => (
                <button
                  key={place.placeId || index}
                  type="button"
                  onClick={() => handleSelectPlace(place)}
                  className="w-full px-4 py-3 text-left hover:bg-sand-50 transition-colors flex items-start gap-3"
                >
                  <MapPin className="h-5 w-5 text-sand-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sand-900 truncate">{place.name}</div>
                    {place.address && (
                      <div className="text-sm text-sand-500 truncate">{place.address}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : searchQuery ? (
            <div className="p-4 text-center text-sand-500 text-sm">
              No places found. Try a different search.
            </div>
          ) : null}
        </div>
      )}

      {/* Selected Place Display */}
      {value && !showResults && (
        <div className="mt-2 p-3 rounded-lg bg-sand-50 border border-sand-200 flex items-start gap-3">
          <MapPin className="h-5 w-5 text-sand-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sand-900">{value.name}</div>
            {value.address && (
              <div className="text-sm text-sand-600 mt-0.5">{value.address}</div>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-sand-400 hover:text-sand-600 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

