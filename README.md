# yyabuilder

Settings and tools for building typescript projects

# How to use

```
yb clean_esm
yb clean_cjs
yb clean_all
```



# Why stopped development of full version

- tsc takes path from tsconfig.json base path, not from cwd. This prevents "building without mess in project's root folder"

- I stopped on "runTypescript.js" file.

- Now going to implement just the tools - in ybuild_tools
