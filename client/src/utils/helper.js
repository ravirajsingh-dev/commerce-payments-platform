export const handleNumberInput = (event) => {
  const allowedKeys = ["Backspace", "Tab", "ArrowLeft", "ArrowRight"];
  const isPaste = (event.ctrlKey || event.metaKey) && event.key === "v";

  if (isPaste) return;
  if (!/[0-9]/.test(event.key) && !allowedKeys.includes(event.key)) {
    event.preventDefault();
  }
};
