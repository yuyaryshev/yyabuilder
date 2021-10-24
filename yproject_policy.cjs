module.exports = {
    policy: "ytslib_policy",
    options: {
        // policy options here
        excludePackageJsonKeys: ["scripts", "devDependencies"],
        exclude: [], // ignore specified directories and files during policy enforcement
    },
};
