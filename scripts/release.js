#!/usr/bin/env node

import { intro, outro, text, select, confirm, spinner, isCancel, cancel, log } from "@clack/prompts";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { execa } from "execa";
import semver from "semver";
import chalk from "chalk";

const PACKAGE_PATH = resolve(process.cwd(), "packages/waveform-renderer/package.json");
const PACKAGE_DIR = resolve(process.cwd(), "packages/waveform-renderer");

// Check for --dry-run flag and --show-warnings flag
const isDryRun = process.argv.includes("--dry-run");
const showWarnings = process.argv.includes("--show-warnings");

function logCommand(description, command, args = []) {
  if (isDryRun) {
    log.info(chalk.blue(`🔄 [DRY RUN] ${description}`));
    log.info(chalk.gray(`   Command: ${command} ${args.join(" ")}`));
    return;
  }
}

async function execaOrLog(description, command, args, options = {}) {
  if (isDryRun) {
    logCommand(description, command, args);
    return { stdout: "", stderr: "" };
  }
  return await execa(command, args, options);
}

async function getPackageFileStatus() {
  try {
    // Get package contents from npm pack
    const { stdout, stderr } = await execa("npm", ["pack", "--dry-run"], {
      cwd: PACKAGE_DIR,
      stdio: "pipe",
    });

    // The detailed output is in stderr, not stdout
    const packOutput = stderr || stdout;

    // Parse npm pack output
    const lines = packOutput.split("\n");
    const packageFiles = [];
    let inTarballSection = false;

    for (const line of lines) {
      if (line.includes("Tarball Contents")) {
        inTarballSection = true;
        continue;
      }

      if (inTarballSection && line.trim()) {
        // Parse lines like "npm notice 15.1kB README.md"
        const match = line.match(/npm notice\s+([0-9.]+[kMG]?B)\s+(.+)/);
        if (match) {
          const [, size, filepath] = match;
          packageFiles.push({ path: filepath, size });
        }
        // Stop parsing when we reach "Tarball Details" section
        if (line.includes("Tarball Details")) {
          break;
        }
      }
    }

    // Get git status for file changes
    let gitFileStatus = {};
    let hasGitInfo = false;

    try {
      // First try to get the latest tag
      const { stdout: latestTag } = await execa("git", ["describe", "--tags", "--abbrev=0"], {
        stdio: "pipe",
      }).catch(() => ({ stdout: "" }));

      if (latestTag.trim()) {
        // Get file status changes since last tag, including files in the specific package directory
        const { stdout: gitStatus } = await execa(
          "git",
          ["diff", "--name-status", `${latestTag}..HEAD`, "--", "packages/waveform-renderer/"],
          {
            stdio: "pipe",
          },
        );

        if (gitStatus.trim()) {
          hasGitInfo = true;
          gitStatus.split("\n").forEach(line => {
            if (!line.trim()) return;

            const match = line.match(/^([AMD])\s+(.+)/);
            if (match) {
              const [, status, filepath] = match;
              // Remove packages/waveform-renderer/ prefix to match package file paths
              const cleanPath = filepath.replace(/^packages\/waveform-renderer\//, "");
              gitFileStatus[cleanPath] = status;
            }
          });
        }
      } else {
        // No tags exist yet - this might be the first release
        // Check if there are any commits at all
        const { stdout: commitCount } = await execa("git", ["rev-list", "--count", "HEAD"], {
          stdio: "pipe",
        }).catch(() => ({ stdout: "0" }));

        if (parseInt(commitCount.trim()) > 0) {
          // There are commits but no tags - treat all files as new for first release
          hasGitInfo = true;
          const { stdout: allFiles } = await execa("git", ["ls-files", "packages/waveform-renderer/"], {
            stdio: "pipe",
          });

          allFiles.split("\n").forEach(filepath => {
            if (filepath.trim()) {
              const cleanPath = filepath.replace(/^packages\/waveform-renderer\//, "");
              gitFileStatus[cleanPath] = "A"; // All files are new in first release
            }
          });
        }
      }
    } catch (error) {
      // Continue without git info if unavailable
      hasGitInfo = false;
    }

    // Combine package files with git status
    const filesWithStatus = packageFiles.map(file => {
      const gitStatus = gitFileStatus[file.path];
      let status;

      if (!hasGitInfo) {
        status = "INCLUDED"; // No git info available
      } else if (gitStatus === "A") {
        status = "NEW";
      } else if (gitStatus === "M") {
        status = "MODIFIED";
      } else if (gitStatus === "D") {
        status = "REMOVED";
      } else if (gitFileStatus[file.path] === undefined) {
        status = "UNCHANGED";
      } else {
        status = "UNCHANGED";
      }

      return {
        ...file,
        status,
        icon: getFileIcon(file.path),
      };
    });

    return filesWithStatus;
  } catch (error) {
    throw new Error(`Failed to get package file status: ${error.message}`);
  }
}

function getStatusIcon(status) {
  switch (status) {
    case "NEW":
      return "✨";
    case "MODIFIED":
      return "📝";
    case "UNCHANGED":
      return "🔄";
    case "INCLUDED":
      return "📋";
    default:
      return "📄";
  }
}

function getStatusColor(status) {
  switch (status) {
    case "NEW":
      return chalk.green;
    case "MODIFIED":
      return chalk.yellow;
    case "UNCHANGED":
      return chalk.gray;
    case "INCLUDED":
      return chalk.blue;
    default:
      return chalk.white;
  }
}

function formatFileSize(size) {
  if (size.includes("kB")) return chalk.cyan(size);
  if (size.includes("MB")) return chalk.yellow(size);
  if (size.includes("GB")) return chalk.red(size);
  return chalk.gray(size);
}

function formatAsTable(files) {
  if (files.length === 0) return [];

  // Calculate column widths
  const maxStatusWidth = Math.max(12, ...files.map(f => `${getStatusIcon(f.status)} ${f.status}`.length));
  const maxFileWidth = Math.max(20, ...files.map(f => `${f.icon} ${f.path}`.length));

  return files.map(file => {
    const statusIcon = getStatusIcon(file.status);
    const statusColor = getStatusColor(file.status);
    const statusText = statusColor(`${statusIcon} ${file.status}`);
    const fileName = `${file.icon} ${file.path}`;
    const fileSize = `(${formatFileSize(file.size)})`;

    // Format with proper spacing
    const paddedStatus = statusText.padEnd(maxStatusWidth + 10); // +10 for ANSI color codes
    const paddedFileName = fileName.padEnd(maxFileWidth);

    return `${paddedStatus} | ${paddedFileName} | ${fileSize}`;
  });
}

function getFileIcon(filepath) {
  if (filepath.endsWith(".d.ts")) return "📝";
  if (filepath.endsWith(".js") || filepath.endsWith(".mjs")) return "⚡";
  if (filepath.endsWith(".json")) return "📋";
  if (filepath.endsWith(".md")) return "📖";
  if (filepath.startsWith("dist/")) return "📦";
  if (filepath.startsWith("src/")) return "⚠️";
  if (filepath.startsWith("test/") || filepath.startsWith("__tests__/")) return "🧪";
  return "📄";
}

function shouldFilterFile(filepath) {
  // Filter out warning files unless --show-warnings is specified
  if (showWarnings) {
    return false; // Don't filter anything if showing warnings
  }

  const warningPatterns = [/^src\//, /^test\//, /^__tests__\//, /\.test\./, /\.spec\./];

  return warningPatterns.some(pattern => pattern.test(filepath));
}

async function displayPackagePreview() {
  const s = spinner();
  s.start("Analyzing package contents...");

  try {
    const allFiles = await getPackageFileStatus();
    s.stop("Package analysis: ✓");

    // Filter files based on --show-warnings flag
    const filesToDisplay = allFiles.filter(file => !shouldFilterFile(file.path));
    const filteredCount = allFiles.length - filesToDisplay.length;

    // Calculate total size and warnings
    let totalSize = 0;
    const warnings = [];

    allFiles.forEach(file => {
      // Approximate total size calculation
      const numericSize = parseFloat(file.size);
      if (file.size.includes("kB")) totalSize += numericSize;
      else if (file.size.includes("MB")) totalSize += numericSize * 1024;

      if (file.icon === "⚠️") {
        warnings.push(file.path);
      }
    });

    // Display header
    const headerText =
      filteredCount > 0
        ? `📦 Files to be published (${filesToDisplay.length} of ${allFiles.length} files shown, ~${totalSize.toFixed(1)}kB):`
        : `📦 Files to be published (${filesToDisplay.length} files, ~${totalSize.toFixed(1)}kB):`;

    log.info(chalk.bold(`\n${headerText}`));

    if (filteredCount > 0) {
      log.info(chalk.gray(`   ${filteredCount} source files hidden. Use --show-warnings to see all files.`));
    }

    log.info(""); // Empty line for spacing

    // Display table
    const tableRows = formatAsTable(filesToDisplay);
    tableRows.forEach(row => {
      log.info(`${row}`);
    });

    // Show warnings summary if any warning files are being published
    const publishedWarnings = warnings.filter(path => !shouldFilterFile(path));
    if (publishedWarnings.length > 0) {
      log.info(""); // Empty line
      log.warn(chalk.yellow(`⚠️  ${publishedWarnings.length} potentially unnecessary files included`));
      log.warn(chalk.gray("Consider adding them to .npmignore or files array in package.json"));
    }

    return { filesWithStatus: allFiles, warnings: publishedWarnings };
  } catch (error) {
    s.stop("Package analysis: ✗");
    throw error;
  }
}

async function main() {
  console.clear();

  intro(chalk.blue(`🎵 Waveform Renderer Release${isDryRun ? chalk.yellow(" [DRY RUN]") : ""}`));

  if (isDryRun) {
    log.info(chalk.yellow("🔍 Running in dry-run mode - no changes will be made"));
  }

  if (!showWarnings) {
    log.info(chalk.gray("💡 Source files are hidden by default. Use --show-warnings to see all files."));
  }

  try {
    // Check if we're in the right directory
    if (!existsSync(PACKAGE_PATH)) {
      throw new Error("Could not find waveform-renderer package. Make sure you're in the monorepo root.");
    }

    // Read current package.json
    const packageJson = JSON.parse(readFileSync(PACKAGE_PATH, "utf8"));
    const currentVersion = packageJson.version;

    // Step 1: Repository checks
    const s = spinner();
    s.start("Checking repository status...");

    try {
      // Check if working directory is clean
      const { stdout: gitStatus } = await execaOrLog("Check git status", "git", ["status", "--porcelain"]);
      if (!isDryRun && gitStatus.trim()) {
        throw new Error("Working directory is not clean. Please commit or stash your changes.");
      }

      // Check current branch
      const { stdout: currentBranch } = await execaOrLog("Get current branch", "git", ["branch", "--show-current"]);
      if (!isDryRun && !["main", "master"].includes(currentBranch.trim())) {
        const shouldContinue = await confirm({
          message: `You're on branch '${currentBranch}'. Continue anyway?`,
          initialValue: false,
        });

        if (isCancel(shouldContinue) || !shouldContinue) {
          cancel("Release cancelled.");
          process.exit(0);
        }
      }

      s.stop("Repository status: ✓");
    } catch (error) {
      s.stop("Repository status: ✗");
      throw error;
    }

    // Step 2: Run tests and linting
    s.start("Running tests and linting...");

    try {
      if (isDryRun) {
        logCommand("Run tests", "pnpm", ["test"]);
        logCommand("Run lint", "pnpm", ["lint"]);
        logCommand("Run type-check", "pnpm", ["type-check"]);
      } else {
        await Promise.all([
          execa("pnpm", ["test"], { stdio: "pipe" }),
          execa("pnpm", ["lint"], { stdio: "pipe" }),
          execa("pnpm", ["type-check"], { stdio: "pipe" }),
        ]);
      }

      s.stop("Tests and linting: ✓");
    } catch (_error) {
      s.stop("Tests and linting: ✗");
      throw new Error("Tests or linting failed. Please fix the issues before releasing.");
    }

    // Step 3: Build the package
    s.start("Building package...");

    try {
      await execaOrLog("Build library", "pnpm", ["build:lib"], { stdio: "pipe" });
      s.stop("Build: ✓");
    } catch (_error) {
      s.stop("Build: ✗");
      if (!isDryRun) {
        throw new Error("Build failed. Please fix the build issues before releasing.");
      }
    }

    // Step 4: Package preview
    const packageInfo = await displayPackagePreview();

    const shouldContinueWithPackage = await confirm({
      message: "Continue with these files?",
      initialValue: packageInfo.warnings.length === 0,
    });

    if (isCancel(shouldContinueWithPackage) || !shouldContinueWithPackage) {
      cancel("Release cancelled.");
      process.exit(0);
    }

    // Step 5: Version selection
    const versionChoices = [
      { value: "patch", label: `Patch (${currentVersion} → ${semver.inc(currentVersion, "patch")})` },
      { value: "minor", label: `Minor (${currentVersion} → ${semver.inc(currentVersion, "minor")})` },
      { value: "major", label: `Major (${currentVersion} → ${semver.inc(currentVersion, "major")})` },
      { value: "prerelease", label: `Prerelease (${currentVersion} → ${semver.inc(currentVersion, "prerelease")})` },
      { value: "custom", label: "Custom version..." },
    ];

    const versionType = await select({
      message: "Select version bump:",
      options: versionChoices,
    });

    if (isCancel(versionType)) {
      cancel("Release cancelled.");
      process.exit(0);
    }

    let newVersion;

    if (versionType === "custom") {
      const customVersion = await text({
        message: "Enter custom version:",
        placeholder: "1.0.0",
        validate: value => {
          if (!semver.valid(value)) {
            return "Please enter a valid semantic version (e.g., 1.0.0)";
          }
          if (!semver.gt(value, currentVersion)) {
            return `Version must be greater than current version (${currentVersion})`;
          }
        },
      });

      if (isCancel(customVersion)) {
        cancel("Release cancelled.");
        process.exit(0);
      }

      newVersion = customVersion;
    } else {
      newVersion = semver.inc(currentVersion, versionType);
    }

    // Step 6: Final confirmation
    const shouldProceed = await confirm({
      message: `Release version ${chalk.green(newVersion)}?`,
      initialValue: true,
    });

    if (isCancel(shouldProceed) || !shouldProceed) {
      cancel("Release cancelled.");
      process.exit(0);
    }

    // Step 7: Update package.json
    s.start("Updating package.json...");

    if (isDryRun) {
      log.info(chalk.blue(`🔄 [DRY RUN] Update package.json version`));
      log.info(chalk.gray(`   ${currentVersion} → ${newVersion}`));
      log.info(chalk.gray(`   File: ${PACKAGE_PATH}`));
    } else {
      packageJson.version = newVersion;
      writeFileSync(PACKAGE_PATH, JSON.stringify(packageJson, null, 2) + "\n");
    }

    s.stop(`Updated to version ${newVersion}: ✓`);

    // Step 8: Git commit and tag
    s.start("Creating git commit and tag...");

    try {
      await execaOrLog("Add files to git", "git", ["add", PACKAGE_PATH]);
      await execaOrLog("Create commit", "git", ["commit", "-m", `chore(release): v${newVersion}`]);
      await execaOrLog("Create git tag", "git", ["tag", `v${newVersion}`]);
      s.stop("Git commit and tag: ✓");
    } catch (_error) {
      s.stop("Git commit and tag: ✗");
      if (!isDryRun) {
        throw new Error("Failed to create git commit and tag.");
      }
    }

    // Step 9: Publish to npm
    s.start("Publishing to npm...");

    try {
      await execaOrLog("Publish to npm", "pnpm", ["--filter", "waveform-renderer", "publish", "--access", "public"], {
        cwd: process.cwd(),
        stdio: "pipe",
      });
      s.stop("Published to npm: ✓");
    } catch (_error) {
      s.stop("Publishing failed: ✗");

      if (!isDryRun) {
        // Rollback: remove tag and reset commit
        try {
          await execaOrLog("Rollback: remove tag", "git", ["tag", "-d", `v${newVersion}`]);
          await execaOrLog("Rollback: reset commit", "git", ["reset", "--hard", "HEAD~1"]);
        } catch (_rollbackError) {
          console.error(chalk.red("Failed to rollback changes. Please manually clean up."));
        }

        throw new Error("Publishing failed. Changes have been rolled back.");
      }
    }

    // Step 10: Push to GitHub
    s.start("Pushing to GitHub...");

    try {
      await execaOrLog("Push commits to GitHub", "git", ["push"]);
      await execaOrLog("Push tags to GitHub", "git", ["push", "--tags"]);
      s.stop("Pushed to GitHub: ✓");
    } catch (_error) {
      s.stop("Push to GitHub: ✗");
      if (!isDryRun) {
        console.warn(chalk.yellow("⚠️ Package was published but push to GitHub failed. Please push manually:"));
        console.warn(chalk.yellow("  git push && git push --tags"));
      }
    }

    // Step 11: Optional GitHub Release
    if (!isDryRun) {
      const shouldOpenRelease = await confirm({
        message: "Open GitHub to create release notes?",
        initialValue: true,
      });

      if (!isCancel(shouldOpenRelease) && shouldOpenRelease) {
        const repoUrl = packageJson.repository?.url?.replace("git+", "").replace(".git", "");
        if (repoUrl) {
          const releaseUrl = `${repoUrl}/releases/new?tag=v${newVersion}`;
          try {
            await execa("open", [releaseUrl]); // macOS
          } catch {
            try {
              await execa("xdg-open", [releaseUrl]); // Linux
            } catch {
              console.log(chalk.blue(`\n📝 Create release notes: ${releaseUrl}`));
            }
          }
        }
      }
    } else {
      log.info(chalk.blue(`🔄 [DRY RUN] Would open GitHub release page`));
      const repoUrl = packageJson.repository?.url?.replace("git+", "").replace(".git", "");
      if (repoUrl) {
        const releaseUrl = `${repoUrl}/releases/new?tag=v${newVersion}`;
        log.info(chalk.gray(`   URL: ${releaseUrl}`));
      }
    }

    if (isDryRun) {
      outro(chalk.blue(`🔍 Dry run completed! Release v${newVersion} would be published.`));
      log.info(chalk.yellow("\n💡 To perform the actual release, run without --dry-run flag:"));
      log.info(chalk.gray("   pnpm release:lib"));
    } else {
      outro(chalk.green(`✨ Successfully released waveform-renderer v${newVersion}!`));
    }
  } catch (error) {
    outro(chalk.red(`❌ Release failed: ${error.message}`));
    process.exit(1);
  }
}

main().catch(error => {
  console.error(chalk.red("Unexpected error:"), error);
  process.exit(1);
});
