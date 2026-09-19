import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { initializeFavicon } from '@src/utils/faviconUtils';

/**
 * FaviconManager Component
 * Manages dynamic favicon updates based on Application Settings
 * Automatically updates favicon when logoUrl changes or theme changes
 */
const FaviconManager = () => {
  const { commonSettings, loadingCommonSettings } = useSelector((state) => ({
    commonSettings: state.common.commonSettings,
    loadingCommonSettings: state.common.loadingCommonSettings,
  }));

  const cleanupRef = useRef(null);

  useEffect(() => {
    // Don't update favicon while loading
    if (loadingCommonSettings) {
      return;
    }

    const logoUrl = commonSettings?.logoUrl;

    // Clean up previous listener if it exists
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    // Initialize favicon with current logo
    if (logoUrl) {
      cleanupRef.current = initializeFavicon(logoUrl);
    }

    // Cleanup on unmount
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [commonSettings?.logoUrl, loadingCommonSettings]);

  // This component doesn't render anything
  return null;
};

export default FaviconManager;
