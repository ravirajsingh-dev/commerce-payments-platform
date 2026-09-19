export const shouldRedirectToLogin = ({ isAuthenticated }) => !isAuthenticated;

export const shouldShowAuthLoader = ({ loading, isAuthChecked }) =>
  loading || !isAuthChecked;
