module.exports = {
    overrides: [
      {
        files: "*.sol",
        options: {
          printWidth: 200,
          tabWidth: 4,
          useTabs: false,
          singleQuote: false,
          bracketSpacing: false,
          explicitTypes: "always",
        }
      },
      {
        files: "*.test.js",
        options: {
          "semi": true
        }
      },
    ]
  };