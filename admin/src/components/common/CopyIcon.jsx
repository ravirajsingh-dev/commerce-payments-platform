import CopyToClipboard from "react-copy-to-clipboard";
import { MdOutlineCopyAll } from "react-icons/md";

const CopyIcon = ({ textToCopy, iconSize = 20, className = "", onCopy }) => {
  return (
    <CopyToClipboard text={textToCopy} onCopy={onCopy}>
      <span className={`${className} cursor-clickable`}>
        <MdOutlineCopyAll className="copy-action-icon" size={iconSize} />
      </span>
    </CopyToClipboard>
  );
};

export default CopyIcon;
