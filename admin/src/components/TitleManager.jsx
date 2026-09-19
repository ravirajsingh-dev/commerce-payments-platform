import { useEffect } from "react";
import { useSelector } from "react-redux";
import { getAppDisplayName } from "@src/utils/helper";

/**
 * TitleManager Component
 * Manages dynamic document title updates based on Application Settings
 * Automatically updates title when settings are loaded
 */
const TitleManager = () => {
  const commonSettings = useSelector((state) => state.common.commonSettings);

  useEffect(() => {
    document.title = getAppDisplayName(commonSettings);
  }, [commonSettings]);

  // This component doesn't render anything
  return null;
};

export default TitleManager;
