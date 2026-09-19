import { useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

import CustomSelect from "@src/components/common/CustomSelect";
import {
  COLLECTION_ALL_TYPE_OPTION,
  COLLECTION_DEFAULT_SORT,
  COLLECTION_SORT_OPTIONS,
  buildTypeFilterOptions,
  findSelectOption,
} from "@src/utils/collectionPageHelpers";

const loadSortOptions = () => Promise.resolve(COLLECTION_SORT_OPTIONS);

const CollectionPageToolbar = ({
  collectionTitle,
  totalCount,
  filteredCount,
  entries,
  filterAttribute,
  typeFilterValue,
  onTypeFilterChange,
  sortValue,
  onSortChange,
  secondaryLink,
}) => {
  const typeOptions = useMemo(
    () =>
      filterAttribute
        ? buildTypeFilterOptions(
            entries,
            filterAttribute.code,
            filterAttribute,
          )
        : [],
    [entries, filterAttribute],
  );

  const showTypeFilter = Boolean(filterAttribute) && typeOptions.length > 1;

  const selectedTypeOption = useMemo(
    () =>
      findSelectOption(typeOptions, typeFilterValue) || COLLECTION_ALL_TYPE_OPTION,
    [typeOptions, typeFilterValue],
  );

  const selectedSortOption = useMemo(
    () =>
      findSelectOption(COLLECTION_SORT_OPTIONS, sortValue) ||
      COLLECTION_DEFAULT_SORT,
    [sortValue],
  );

  const loadTypeOptions = useCallback(
    () => Promise.resolve(typeOptions),
    [typeOptions],
  );

  const countLabel = useMemo(() => {
    const name = String(collectionTitle || "this collection").trim();
    const noun = filteredCount === 1 ? "variant" : "variants";
    if (filteredCount !== totalCount) {
      return (
        <>
          {filteredCount} of {totalCount} {noun} found in{" "}
          <strong className="collection-page__toolbar-count-name">{name}</strong>
        </>
      );
    }
    return (
      <>
        {filteredCount} {noun} found in{" "}
        <strong className="collection-page__toolbar-count-name">{name}</strong>
      </>
    );
  }, [collectionTitle, filteredCount, totalCount]);

  return (
    <header
      className={`collection-page__toolbar${
        secondaryLink ? " collection-page__toolbar--with-secondary" : ""
      }`}
    >
      <p className="collection-page__toolbar-count">{countLabel}</p>
      {secondaryLink ? (
        <div className="collection-page__toolbar-secondary">
          <Link
            to={secondaryLink.to}
            className="collection-page__all-variants-link collection-page__toolbar-cta"
          >
            {secondaryLink.label}
          </Link>
        </div>
      ) : null}
      <div className="collection-page__toolbar-controls">
        {showTypeFilter ? (
          <div className="collection-page__toolbar-field collection-page__toolbar-field--type">
            <span className="collection-page__toolbar-label">Type</span>
            <CustomSelect
              className="collection-page__toolbar-select"
              value={selectedTypeOption}
              onChange={(option) =>
                onTypeFilterChange(option?.value ?? "all")
              }
              loadOptions={loadTypeOptions}
              isRequired
              placeholder="All"
            />
          </div>
        ) : null}
        <div className="collection-page__toolbar-field collection-page__toolbar-field--sort">
          <span className="collection-page__toolbar-label">Sort by</span>
          <CustomSelect
            className="collection-page__toolbar-select collection-page__toolbar-select--sort"
            value={selectedSortOption}
            onChange={(option) =>
              onSortChange(option?.value ?? COLLECTION_DEFAULT_SORT.value)
            }
            loadOptions={loadSortOptions}
            isRequired
            placeholder="Sort by"
          />
        </div>
      </div>
    </header>
  );
};

CollectionPageToolbar.propTypes = {
  collectionTitle: PropTypes.string,
  totalCount: PropTypes.number.isRequired,
  filteredCount: PropTypes.number.isRequired,
  entries: PropTypes.arrayOf(PropTypes.object).isRequired,
  filterAttribute: PropTypes.shape({
    code: PropTypes.string,
    name: PropTypes.string,
    inputType: PropTypes.string,
    options: PropTypes.array,
  }),
  typeFilterValue: PropTypes.string.isRequired,
  onTypeFilterChange: PropTypes.func.isRequired,
  sortValue: PropTypes.string.isRequired,
  onSortChange: PropTypes.func.isRequired,
  secondaryLink: PropTypes.shape({
    to: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  }),
};

export default CollectionPageToolbar;
