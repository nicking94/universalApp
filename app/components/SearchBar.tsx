"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { SearchBarProps } from "../lib/types/types";

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [query, setQuery] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  return (
    <div className="h-[2rem] 2xl:h-auto max-w-[20rem] flex items-center w-full bg-white p-2 rounded-sm placeholder:text-gray_l outline-none text-gray_b border">
      <Search className="text-gray_m dark:text-gray_m mr-2" />
      <input
        type="text"
        placeholder="Buscar..."
        value={query}
        onChange={handleChange}
        className="w-full dark:bg-white dark:text-gray_b placeholder:text-gray_l dark:placeholder:text-gray_l outline-none "
      />
    </div>
  );
};

export default SearchBar;
