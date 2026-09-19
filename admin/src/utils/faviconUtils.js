/**
 * Favicon Utility
 * Manages dynamic favicon updates based on Application Settings logo
 * Supports both light and dark mode detection
 */

/**
 * Removes all existing dynamic favicon links
 */
const removeDynamicFavicons = () => {
  if (typeof document === 'undefined') return;
  
  // Remove all favicon links (we'll recreate them)
  const existingLinks = document.querySelectorAll(
    'link[rel="icon"], link[rel="shortcut icon"]'
  );
  existingLinks.forEach(link => link.remove());
};

/**
 * Creates favicon links for both light and dark modes
 * Uses the same logo URL for both (as per requirements: adapt single logo for both modes)
 * @param {string} logoUrl - URL of the logo to use as favicon
 */
const createFaviconLinks = (logoUrl) => {
  if (!logoUrl || typeof document === 'undefined') return;

  // Remove existing favicons first
  removeDynamicFavicons();

  // Create favicon for light mode
  const lightLink = document.createElement('link');
  lightLink.rel = 'icon';
  lightLink.type = 'image/png';
  lightLink.href = logoUrl;
  lightLink.media = '(prefers-color-scheme: light)';
  lightLink.id = 'favicon-light';
  document.head.appendChild(lightLink);

  // Create favicon for dark mode (using same logo)
  // Browsers will automatically select based on user's preference
  const darkLink = document.createElement('link');
  darkLink.rel = 'icon';
  darkLink.type = 'image/png';
  darkLink.href = logoUrl;
  darkLink.media = '(prefers-color-scheme: dark)';
  darkLink.id = 'favicon-dark';
  document.head.appendChild(darkLink);

  // Add a default favicon without media query for browsers that don't support it
  const defaultLink = document.createElement('link');
  defaultLink.rel = 'icon';
  defaultLink.type = 'image/png';
  defaultLink.href = logoUrl;
  defaultLink.id = 'favicon-default';
  document.head.appendChild(defaultLink);
};

/**
 * Updates the favicon based on the logo URL
 * @param {string} logoUrl - URL of the logo from Application Settings
 */
const updateFavicon = (logoUrl) => {
  if (!logoUrl || typeof document === 'undefined') return;
  
  // Create favicon links for both themes
  createFaviconLinks(logoUrl);
};

/**
 * Sets up a listener for theme changes
 * Note: With media queries on favicon links, browsers handle theme switching automatically
 * This listener ensures favicon updates if logoUrl changes during theme switch
 * @param {string} logoUrl - URL of the logo from Application Settings
 * @returns {Function} Cleanup function to remove the listener
 */
const setupThemeChangeListener = (logoUrl) => {
  if (!logoUrl || typeof window === 'undefined') return () => {};

  void window.matchMedia("(prefers-color-scheme: dark)");
  
  // With media queries on favicon links, browsers automatically switch
  // We just need to ensure the links are present and updated
  // This listener can be used for additional logic if needed in the future
  
  // For now, we return a no-op cleanup since media queries handle it
  return () => {};
};

/**
 * Initializes favicon management
 * Call this when Application Settings are loaded
 * @param {string} logoUrl - URL of the logo from Application Settings
 */
export const initializeFavicon = (logoUrl) => {
  if (!logoUrl) {
    // If no logo, remove any existing dynamic favicons
    const dynamicFavicons = document.querySelectorAll(
      'link[rel="icon"][id="favicon-default"], link[rel="icon"][id="favicon-light"], link[rel="icon"][id="favicon-dark"]'
    );
    dynamicFavicons.forEach(link => link.remove());
    return () => {};
  }

  // Update favicon immediately
  updateFavicon(logoUrl);

  // Set up theme change listener
  return setupThemeChangeListener(logoUrl);
};
