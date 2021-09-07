module.exports = {
    root: true,
    parser: "@typescript-eslint/parser",
    //    plugins: ["@typescript-eslint", "eslint-plugin-import"],
    extends: [],
    rules: {
        "import/extensions": [
            "error",
            "ignorePackages",
            {
                js: "ignorePackages",
            },
        ],
    },
};
