module.exports = [
  {
    files: ["**/*.js"],
    ignores: ["node_modules/**", "coverage/**"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
    },
    rules: {
      complexity: ["error", { max: 60 }],
      "max-lines": [
        "error",
        { max: 800, skipBlankLines: true, skipComments: true },
      ],
    },
  },
];
