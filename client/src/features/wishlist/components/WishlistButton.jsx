import { FaHeart, FaRegHeart } from "react-icons/fa";
import { connect } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";

import { toggleWishlistItem, selectIsInWishlist } from "../wishlistActions";

const WishlistButton = ({
  variantId,
  isAuthenticated,
  isSaved,
  togglingVariantId,
  toggleWishlistItem,
  className = "",
  showLabel = true,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isToggling = String(togglingVariantId) === String(variantId);
  const saved = isSaved;

  const onClick = async () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    await toggleWishlistItem(variantId);
  };

  return (
    <button
      type="button"
      className={`btn btn--outline wishlist-btn${saved ? " wishlist-btn--saved" : ""} ${className}`.trim()}
      onClick={onClick}
      disabled={isToggling}
      aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={saved}
    >
      {saved ? <FaHeart aria-hidden /> : <FaRegHeart aria-hidden />}
      {showLabel ? (
        <span>{isToggling ? "Saving…" : saved ? "Saved" : "Wishlist"}</span>
      ) : null}
    </button>
  );
};

const mapStateToProps = (state, ownProps) => ({
  isAuthenticated: state.auth.isAuthenticated,
  isSaved: selectIsInWishlist(state, ownProps.variantId),
  togglingVariantId: state.wishlist.togglingVariantId,
});

export default connect(mapStateToProps, { toggleWishlistItem })(WishlistButton);
