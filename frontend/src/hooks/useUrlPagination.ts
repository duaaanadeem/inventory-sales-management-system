import { useCallback } from "react";
import { useRouter } from "next/router";

export function useUrlPagination(defaultLimit = 20) {
  const router = useRouter();
  
  // Extract page and limit from the query string, defaulting if missing or invalid
  const page = parseInt(router.query.page as string, 10) || 1;
  const limit = parseInt(router.query.limit as string, 10) || defaultLimit;

  // We only want to push to URL if the component asks to change it.
  const setPage = useCallback(
    (newPage: number) => {
      const query = { ...router.query, page: String(newPage) };
      router.push({ pathname: router.pathname, query }, undefined, { shallow: true });
    },
    [router]
  );

  const setLimit = useCallback(
    (newLimit: number) => {
      // When changing the limit, we should reset the page to 1
      const query = { ...router.query, limit: String(newLimit), page: "1" };
      router.push({ pathname: router.pathname, query }, undefined, { shallow: true });
    },
    [router]
  );

  return { page, limit, setPage, setLimit };
}
