const splittedRegExp = /([\\/]lib[\\/](cjs|esm))[\\/]/g;
const _thisPackageDir = __filename.split(splittedRegExp)[0];

export function thisPackageDir() {
    return _thisPackageDir;
}
