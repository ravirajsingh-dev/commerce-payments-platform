import { useState, useEffect, useCallback, useRef } from "react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
const CustomSelect = ({
  value,
  onChange,
  loadOptions,
  isCreatable = false,
  isMulti = false,
  isDisabled = false,
  isRequired = false,
  placeholder = "Select...",
  error = null,
  className = "",
  cacheOptions = false,
  defaultOptions = false,
  onInputChange = null,
  filterOption = null,
  noOptionsMessage = null,
  formatOptionLabel = null,
  /** Typing and selected label display use uppercase (e.g. Address Details) */
  inputUppercase = false,
  selectProps = {},
}) => {
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const loadOptionsRef = useRef(loadOptions);

  useEffect(() => {
    loadOptionsRef.current = loadOptions;
  }, [loadOptions]);

  const fetchOptions = useCallback(async () => {
    const currentLoadOptions = loadOptionsRef.current;
    if (!currentLoadOptions) return;

    setIsLoading(true);
    try {
      const response = await currentLoadOptions();
      let optionsData = [];

      if (response && response.data && Array.isArray(response.data)) {
        optionsData = response.data;
      } else if (response && Array.isArray(response)) {
        optionsData = response;
      } else if (
        response &&
        response.response &&
        Array.isArray(response.response)
      ) {
        optionsData = response.response;
      }

      setOptions(optionsData);
    } catch (error) {
      console.error("Error loading options:", error);
      setOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load once when enabled (first paint or Edit turned on), not when loadOptions identity changes.
  const prevDisabledRef = useRef(undefined);
  useEffect(() => {
    if (!loadOptionsRef.current) return;
    const wasDisabled = prevDisabledRef.current;
    prevDisabledRef.current = isDisabled;

    if (isDisabled) return;

    const initialOpen = wasDisabled === undefined;
    const turnedOn = wasDisabled === true;
    if (initialOpen || turnedOn) {
      fetchOptions();
    }
  }, [isDisabled, fetchOptions]);

  const handleChange = (selectedOption) => {
    onChange(selectedOption);
  };

  const handleCreate = async (inputValue) => {
    if (!isCreatable) return null;

    setIsLoading(true);
    try {
      if (onInputChange) {
        await onInputChange(inputValue, { action: "create-option" });
        // Refresh options after creation
        if (loadOptions) {
          try {
            const response = await loadOptions();
            let optionsData = [];

            if (response && response.data && Array.isArray(response.data)) {
              optionsData = response.data;
            } else if (response && Array.isArray(response)) {
              optionsData = response;
            } else if (
              response &&
              response.response &&
              Array.isArray(response.response)
            ) {
              optionsData = response.response;
            }

            setOptions(optionsData);
          } catch (error) {
            console.error("Error refreshing options:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error creating option:", error);
    } finally {
      setIsLoading(false);
    }
    return null;
  };

  const handleInputChange = useCallback(
    (newValue, actionMeta) => {
      let v = newValue;
      if (inputUppercase && actionMeta?.action === "input-change") {
        v = String(newValue ?? "").toUpperCase();
      }
      setInputValue(v);
      if (
        onInputChange &&
        actionMeta?.action !== "input-blur" &&
        actionMeta?.action !== "menu-close"
      ) {
        onInputChange(v, actionMeta);
      }
    },
    [inputUppercase, onInputChange],
  );

  const SelectComponent = isCreatable ? CreatableSelect : Select;

  const formatCreateLabel = (inputValue) => `Create "${inputValue}"`;

  const defaultFormatOptionLabel = ({ label, status }) => {
    if (formatOptionLabel) {
      return formatOptionLabel({ label, status });
    }
    return (
      <div className="d-flex justify-content-between align-items-center">
        <span>{label}</span>
        {status === "pending" && (
          <span className="badge bg-warning text-dark ms-2 custom-select__pending-badge">
            Pending
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={className}>
      <SelectComponent
        className={`custom-select${inputUppercase ? " custom-select--uppercase" : ""}${error ? " custom-select--error" : ""}`}
        classNamePrefix="custom-select"
        value={value}
        onChange={handleChange}
        onCreateOption={isCreatable ? handleCreate : undefined}
        options={options}
        isLoading={isLoading}
        isDisabled={isDisabled}
        isMulti={isMulti}
        isClearable={!isRequired}
        isSearchable={true}
        placeholder={placeholder}
        {...(inputUppercase ? { inputValue } : {})}
        onInputChange={handleInputChange}
        filterOption={
          filterOption ||
          ((option, inputValue) => {
            if (!inputValue) return true;
            const searchValue = inputValue.toLowerCase();
            return option.label?.toLowerCase().includes(searchValue);
          })
        }
        noOptionsMessage={noOptionsMessage || (() => "No options available")}
        formatOptionLabel={defaultFormatOptionLabel}
        formatCreateLabel={formatCreateLabel}
        cacheOptions={cacheOptions}
        defaultOptions={defaultOptions}
        {...selectProps}
      />
      {error ? (
        <div className="invalid-feedback d-block">{error}</div>
      ) : null}
    </div>
  );
};

export default CustomSelect;
