import PropTypes from "prop-types";
import { FaFacebookF, FaInstagram, FaYoutube, FaVideo } from "react-icons/fa";

/**
 * Reusable SocialIcons component
 * Displays social media icons consistently across the application
 *
 * @param {Object} socialMedia - Social media links object
 * @param {string} socialMedia.facebook - Facebook URL
 * @param {string} socialMedia.instagram - Instagram URL
 * @param {string} socialMedia.youtube - YouTube URL
 * @param {string} socialMedia.zoomMeeting - Zoom Meeting URL
 * @param {string} className - Additional CSS class for wrapper
 * @param {string} size - Icon size variant: 'small', 'medium', 'large' (default: 'medium')
 * @param {string} variant - 'default' | 'premium' (labeled, larger buttons for Contact page)
 */
const SocialIcons = ({
  socialMedia = {},
  className = "",
  size = "medium",
  variant = "default",
}) => {
  // Build array of available social links
  const socialLinks = [];

  if (socialMedia?.facebook) {
    socialLinks.push({
      icon: FaFacebookF,
      url: socialMedia.facebook,
      key: "facebook",
      label: "Facebook",
    });
  }

  if (socialMedia?.instagram) {
    socialLinks.push({
      icon: FaInstagram,
      url: socialMedia.instagram,
      key: "instagram",
      label: "Instagram",
    });
  }

  if (socialMedia?.youtube) {
    socialLinks.push({
      icon: FaYoutube,
      url: socialMedia.youtube,
      key: "youtube",
      label: "YouTube",
    });
  }

  if (socialMedia?.zoomMeeting) {
    socialLinks.push({
      icon: FaVideo,
      url: socialMedia.zoomMeeting,
      key: "zoomMeeting",
      label: "Zoom Meeting",
    });
  }

  // Don't render if no links available
  if (socialLinks.length === 0) {
    return null;
  }

  const wrapperClass = [
    "social-icons-wrapper",
    `social-icons-${size}`,
    variant === "premium" ? "social-icons--premium" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapperClass}>
      {socialLinks.map(({ icon: Icon, url, key, label }) => (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="social-icon-link"
          aria-label={label}
          title={label}
        >
          <span className="social-icon-link__inner">
            <Icon className="social-icon" aria-hidden="true" />
            {variant === "premium" ? (
              <span className="social-icon-label">{label}</span>
            ) : null}
          </span>
        </a>
      ))}
    </div>
  );
};

SocialIcons.propTypes = {
  socialMedia: PropTypes.shape({
    facebook: PropTypes.string,
    instagram: PropTypes.string,
    youtube: PropTypes.string,
    zoomMeeting: PropTypes.string,
  }),
  className: PropTypes.string,
  size: PropTypes.oneOf(["small", "medium", "large"]),
  variant: PropTypes.oneOf(["default", "premium"]),
};

export default SocialIcons;
