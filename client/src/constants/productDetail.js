/**
 * Ordered size bands — smallest to largest. Aliases in one row share the same rank.
 * Used by `canonicalSizeSortKey` in product detail / variant display helpers.
 */
export const SIZE_RANK_GROUPS = [
  ["6xs"],
  ["5xs"],
  ["4xs"],
  ["xxxs", "3xs", "xxxsmall"],
  ["xxs", "2xs", "xxsmall"],
  ["xs", "extrasmall", "xsmall"],
  ["s", "small"],
  ["m", "medium"],
  ["l", "large"],
  ["xl", "xlarge"],
  ["xxl", "2xl", "xxlarge"],
  ["xxxl", "3xl", "xxxlarge"],
  ["xxxxl", "4xl"],
  ["5xl"],
  ["6xl"],
  ["7xl"],
  ["8xl"],
  ["os", "onesize", "one", "free", "freesize", "fs", "universal"],
];
