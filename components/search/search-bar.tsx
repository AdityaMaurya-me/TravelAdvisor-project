"use client";

import { FormEvent, useEffect, useState } from "react";
import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

const PLACEHOLDERS = [
  "Where do you want to go?",
  "Search a destination...",
  "Find your next adventure...",
];

export default function SearchBar({
  value,
  onChange,
  onSubmit,
}: SearchBarProps) {
  const [placeholder, setPlaceholder] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [characterIndex, setCharacterIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = PLACEHOLDERS[placeholderIndex];

    const timeout = setTimeout(() => {
      if (!deleting) {
        if (characterIndex < current.length) {
          setPlaceholder(current.slice(0, characterIndex + 1));
          setCharacterIndex((prev) => prev + 1);
        } else {
          setDeleting(true);
        }
      } else {
        if (characterIndex > 0) {
          setPlaceholder(current.slice(0, characterIndex - 1));
          setCharacterIndex((prev) => prev - 1);
        } else {
          setDeleting(false);
          setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
        }
      }
    }, deleting ? 35 : 55);

    return () => clearTimeout(timeout);
  }, [characterIndex, deleting, placeholderIndex]);

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="search-bar-input w-full rounded-full bg-white px-8 py-5 pr-20 text-lg text-gray-900 shadow-lg transition-all placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
        />

        <button
          type="submit"
          aria-label="Search"
          className="absolute right-3 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500 text-white transition-colors hover:bg-cyan-600"
        >
          <Search className="h-5 w-5" />
        </button>
      </div>
    </form>
  );
}
