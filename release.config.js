export default {
	branches: ["main"],
	tagFormat: "v${version}",
	plugins: [
		[
			"@semantic-release/commit-analyzer",
			{
				preset: "conventionalcommits",
				releaseRules: [
					{ type: "feat", release: "minor" },
					{ type: "fix", release: "patch" },
					{ type: "perf", release: "patch" },
					{ type: "refactor", release: "patch" },
					{ type: "style", release: "patch" },
					{ type: "docs", release: "patch" },
					{ type: "build", release: "patch" },
					{ type: "ci", release: "patch" },
					{ type: "test", release: "patch" },
					{ type: "chore", release: "patch" },
					{ breaking: true, release: "major" },
				],
			},
		],
		[
			"@semantic-release/release-notes-generator",
			{
				preset: "conventionalcommits",
				presetConfig: {
					types: [
						{ type: "feat", section: "Features" },
						{ type: "fix", section: "Bug Fixes" },
						{ type: "perf", section: "Performance" },
						{ type: "refactor", section: "Refactoring" },
						{ type: "style", section: "Styling" },
						{ type: "docs", section: "Documentation" },
						{ type: "build", section: "Build System" },
						{ type: "ci", section: "CI/CD" },
						{ type: "test", section: "Tests" },
						{ type: "chore", section: "Chores" },
					],
				},
			},
		],
		["@semantic-release/changelog", { changelogFile: "CHANGELOG.md" }],
		[
			"@semantic-release/git",
			{
				assets: ["CHANGELOG.md", "package.json"],
				message:
					"chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
			},
		],
		"@semantic-release/github",
	],
};
