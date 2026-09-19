import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";

import {
  getStoreNavigation,
  mapAxiosToStorefrontError,
} from "@src/app/state/actions/publicActions";

const emptyNavigation = { columns: [] };

export const useStoreNavigation = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [navigation, setNavigation] = useState(emptyNavigation);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await dispatch(getStoreNavigation());
        if (cancelled) return;
        setNavigation({
          columns: Array.isArray(payload?.columns) ? payload.columns : [],
        });
      } catch (err) {
        if (cancelled) return;
        const { message } = mapAxiosToStorefrontError(
          err,
          "Unable to load shop menu.",
        );
        setError(message);
        setNavigation(emptyNavigation);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return { loading, error, columns: navigation.columns };
}
