"use client";

import React, { useMemo, useCallback } from "react";
import { PaginationProps } from "../lib/types/types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { db } from "../database/db";
import { usePagination } from "../context/PaginationContext";
import Select from "react-select";

const Pagination: React.FC<
  Omit<
    PaginationProps,
    "onPageChange" | "onItemsPerPageChange" | "currentPage" | "itemsPerPage"
  > & {
    text?: string;
    text2?: string;
    totalItems: number;
  }
> = ({
  text = "Productos por página",
  text2 = "Total de productos",
  totalItems,
}) => {
  const { userId } = useAuth();
  const {
    currentPage,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
    isLoading,
  } = usePagination();

  const totalPages = useMemo(
    () => Math.ceil(totalItems / itemsPerPage),
    [totalItems, itemsPerPage]
  );

  const handlePrevious = useCallback(() => {
    setCurrentPage(Math.max(1, currentPage - 1));
  }, [currentPage, setCurrentPage]);

  const handleNext = useCallback(() => {
    setCurrentPage(Math.min(totalPages, currentPage + 1));
  }, [currentPage, totalPages, setCurrentPage]);

  const handleItemsPerPageChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newItemsPerPage = Number(e.target.value);
      setItemsPerPage(newItemsPerPage);
      setCurrentPage(1);

      if (userId) {
        try {
          const existingPrefs = await db.userPreferences
            .where("userId")
            .equals(userId)
            .first();

          if (existingPrefs) {
            await db.userPreferences.update(existingPrefs.id!, {
              itemsPerPage: newItemsPerPage,
            });
          } else {
            await db.userPreferences.add({
              userId,
              acceptedTerms: false,
              itemsPerPage: newItemsPerPage,
            });
          }
        } catch (error) {
          console.error("Error al guardar la preferencia:", error);
        }
      }
    },
    [setItemsPerPage, userId, setCurrentPage]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      if (page !== currentPage) {
        setCurrentPage(page);
      }
    },
    [currentPage, setCurrentPage]
  );
  if (isLoading) {
    return <div>Cargando preferencias...</div>;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between ">
      <div className="flex items-center gap-2">
        <label
          htmlFor="items-per-page"
          className="text-sm text-gray_m dark:text-gray_xl"
        >
          {text}
        </label>
        <Select
          inputId="items-per-page"
          options={[5, 10, 20, 30].map((n) => ({
            value: n,
            label: n.toString(),
          }))}
          noOptionsMessage={() => "No se encontraron opciones"}
          value={{ value: itemsPerPage, label: itemsPerPage.toString() }}
          onChange={(selectedOption) => {
            if (selectedOption) {
              handleItemsPerPageChange({
                target: { value: selectedOption.value.toString() },
              } as React.ChangeEvent<HTMLSelectElement>);
            }
          }}
          className="cursor-pointer text-gray_b p-1 text-sm focus:outline-none"
          classNamePrefix="react-select"
          menuPosition="fixed"
          aria-label="Items por página"
          components={{
            IndicatorSeparator: () => null,
          }}
        />
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
                  ? "text-gray_m dark:text-gray_xl "
                  : "text-gray_b dark:text-gray_xl hover:bg-blue_xl dark:hover:bg-gray_m"
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
              <span className="px-2 text-gray_m dark:text-gray_xl">...</span>
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
                className="cursor-pointer bg-blue_xl text-gray_l  px-3 py-1 rounded-md text-sm font-medium "
              >
                {currentPage + 1}
              </button>
            </li>
          )}
          {currentPage < totalPages - 2 && (
            <li>
              <span className="px-2 text-gray_m dark:text-gray_xl">...</span>
            </li>
          )}

          {currentPage < totalPages - 1 && (
            <li>
              <button
                onClick={() => handlePageChange(totalPages)}
                aria-label="Ir a última página"
                className="cursor-pointer bg-blue_xl px-3 py-1 rounded-md text-sm font-medium text-gray_l dark:text-gray_xl"
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
                  ? "text-gray_m dark:text-gray_xl"
                  : "text-gray_b dark:text-gray_xl hover:bg-blue_xl dark:hover:bg-gray_m"
              }`}
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </li>
        </ul>
      </nav>

      <div className="text-sm text-gray_m dark:text-gray_xl">
        {text2}: <span className="font-medium">{totalItems}</span>
      </div>
    </div>
  );
};

export default React.memo(Pagination);
