"use client";

import React, { useMemo, useCallback } from "react";
import { PaginationProps } from "../lib/types/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

const Pagination: React.FC<PaginationProps> = ({
  text = "Productos por página",
  text2 = "Total de productos",
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}) => {
  const totalPages = useMemo(
    () => Math.ceil(totalItems / itemsPerPage),
    [totalItems, itemsPerPage]
  );

  const handlePrevious = useCallback(() => {
    onPageChange(Math.max(1, currentPage - 1));
  }, [currentPage, onPageChange]);

  const handleNext = useCallback(() => {
    onPageChange(Math.min(totalPages, currentPage + 1));
  }, [currentPage, totalPages, onPageChange]);

  const handleItemsPerPageChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onItemsPerPageChange(Number(e.target.value));
    },
    [onItemsPerPageChange]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      if (page !== currentPage) {
        onPageChange(page);
      }
    },
    [currentPage, onPageChange]
  );

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between ">
      <div className="flex items-center gap-2">
        <label
          htmlFor="items-per-page"
          className="text-sm text-gray_m dark:text-gray_l"
        >
          {text}
        </label>
        <select
          id="items-per-page"
          value={itemsPerPage}
          onChange={handleItemsPerPageChange}
          className="cursor-pointer bg-white text-black border border-gray_xl rounded-md p-1 text-sm focus:outline-none"
          aria-label="Items por página"
        >
          {[5, 10, 20, 30].map((n) => (
            <option key={n} value={n} aria-label={`Mostrar ${n} items`}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <nav aria-label="Paginación">
        <ul className="flex items-center gap-2">
          <li>
            <button
              onClick={handlePrevious}
              disabled={currentPage === 1}
              aria-label="Página anterior"
              className={`cursor-pointer p-2 rounded-md ${
                currentPage === 1
                  ? "text-gray_m "
                  : "text-gray_b hover:bg-blue_xl"
              }`}
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
          </li>
          {currentPage > 2 && (
            <li>
              <button
                onClick={() => handlePageChange(1)}
                aria-label="Ir a primera página"
                className="cursor-pointer text-gray_l px-3 py-1 rounded-md text-sm font-medium bg-blue_xl"
              >
                1
              </button>
            </li>
          )}
          {currentPage > 3 && (
            <li>
              <span className="px-2 text-gray_m">...</span>
            </li>
          )}

          {currentPage > 1 && (
            <li>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                aria-label={`Ir a página ${currentPage - 1}`}
                className="cursor-pointer text-gray_l px-3 py-1 rounded-md text-sm font-medium bg-blue_xl"
              >
                {currentPage - 1}
              </button>
            </li>
          )}
          <li>
            <button
              aria-current="page"
              className="cursor-pointer px-3 py-1 rounded-md text-sm font-medium bg-gradient-to-bl from-blue_m to-blue_b text-white"
            >
              {currentPage}
            </button>
          </li>
          {currentPage < totalPages && (
            <li>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                aria-label={`Ir a página ${currentPage + 1}`}
                className="cursor-pointer bg-blue_xl text-gray_l px-3 py-1 rounded-md text-sm font-medium "
              >
                {currentPage + 1}
              </button>
            </li>
          )}
          {currentPage < totalPages - 2 && (
            <li>
              <span className="px-2 text-gray_m">...</span>
            </li>
          )}

          {currentPage < totalPages - 1 && (
            <li>
              <button
                onClick={() => handlePageChange(totalPages)}
                aria-label="Ir a última página"
                className="cursor-pointer bg-blue_xl px-3 py-1 rounded-md text-sm font-medium text-gray_l "
              >
                {totalPages}
              </button>
            </li>
          )}
          <li>
            <button
              onClick={handleNext}
              disabled={currentPage === totalPages}
              aria-label="Página siguiente"
              className={`cursor-pointer p-2 rounded-md ${
                currentPage === totalPages
                  ? "text-gray_m "
                  : "text-gray_b hover:bg-blue_xl"
              }`}
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </li>
        </ul>
      </nav>

      <div className="text-sm text-gray_m dark:text-gray_l">
        {text2}: <span className="font-medium">{totalItems}</span>
      </div>
    </div>
  );
};

export default React.memo(Pagination);
