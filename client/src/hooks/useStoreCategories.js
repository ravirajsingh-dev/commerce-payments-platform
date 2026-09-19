import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";

import {
  getStoreCategories,
  mapAxiosToStorefrontError,
} from "@src/app/state/actions/publicActions";

export const useStoreCategories = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await dispatch(getStoreCategories());
        if (cancelled) return;
        setCategories(
          Array.isArray(payload?.categories) ? payload.categories : [],
        );
      } catch (err) {
        if (cancelled) return;
        const { message } = mapAxiosToStorefrontError(
          err,
          "Unable to load categories.",
        );
        setError(message);
        setCategories([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return { loading, error, categories };
}
