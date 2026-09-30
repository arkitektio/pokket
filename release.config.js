module.exports = {
  branches: ["main"],
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        // Every push to main is a release: no commit prefix needed. The
        // highest matching rule wins, so prefixes still count when used:
        // a breaking change is major, `feat:` minor, anything else patch.
        // Most releases are only an over-the-air update (release.yaml).
        releaseRules: [
          { breaking: true, release: "major" },
          { type: "feat", release: "minor" },
          { release: "patch" },
        ],
      },
    ],
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    ["@semantic-release/npm", { npmPublish: false }], // Updates package.json version
    [
      "@semantic-release/git",
      {
        assets: ["package.json", "pnpm-lock.yaml", "CHANGELOG.md"],
        message: "chore(release): ${nextRelease.version} [skip ci]",
      },
    ],
    "@semantic-release/github",
  ],
};
