/** App display name: API settings → env → fallback (same source as document title). */
export const getAppDisplayName = (commonSettings = {}) => {
  return (
    commonSettings?.abbreviation ||
    commonSettings?.name ||
    import.meta.env.VITE_APP_ADMIN_NAME ||
    "Admin portal"
  );
}
