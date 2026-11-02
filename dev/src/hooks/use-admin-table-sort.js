import { useState, useCallback } from "react";

/**
 * Shared client sort state for admin `<Table>` headers.
 * @param {string} [defaultKey]
 * @param {"asc"|"desc"} [defaultDir]
 */
export function useAdminTableSort(defaultKey = "createdAt", defaultDir = "desc") {
  const [tableSort, setTableSort] = useState({ key: defaultKey, direction: defaultDir });

  const handleTableSort = useCallback((key, direction) => {
    setTableSort({ key, direction });
  }, []);

  return { tableSort, setTableSort, handleTableSort };
}
