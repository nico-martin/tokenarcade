import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SPACE_REPOSITORY = "git@hf.co:spaces/nico-martin/tokenarcade";
const SPACE_URL = "https://huggingface.co/spaces/nico-martin/tokenarcade";
const GITHUB_URL = "https://github.com/nico-martin/tokenarcade";
const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = join(projectDirectory, "dist");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectDirectory,
    stdio: "inherit",
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited with status ${result.status}`);
  }
}

run("pnpm", ["run", "build"]);
if (!existsSync(join(distDirectory, "index.html"))) {
  throw new Error("The production build did not produce dist/index.html.");
}

const temporaryDirectory = mkdtempSync(join(tmpdir(), "tokenarcade-deploy-"));
const spaceDirectory = join(temporaryDirectory, "space");

try {
  run("git", ["clone", "--depth", "1", SPACE_REPOSITORY, spaceDirectory]);
  run("git", ["xet", "install", "--local"], { cwd: spaceDirectory });
  run("git", ["lfs", "track", "*.wasm"], { cwd: spaceDirectory });

  // Remove stale deployment assets only inside this fresh temporary clone.
  for (const entry of readdirSync(spaceDirectory)) {
    if ([".git", ".gitattributes", "README.md"].includes(entry)) continue;
    rmSync(join(spaceDirectory, entry), { recursive: true, force: true });
  }
  for (const entry of readdirSync(distDirectory)) {
    cpSync(join(distDirectory, entry), join(spaceDirectory, entry), { recursive: true });
  }

  const readmePath = join(spaceDirectory, "README.md");
  let readme = existsSync(readmePath) ? readFileSync(readmePath, "utf8") : "";
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
  const existing = frontmatter.exec(readme);
  let metadata = existing?.[1].replaceAll("\r\n", "\n") ?? "pinned: false";
  for (const [key, value] of Object.entries({
    title: "Token Arcade",
    sdk: "static",
    app_file: "index.html",
  })) {
    const field = new RegExp(`^${key}:[^\\r\\n]*$`, "m");
    metadata = field.test(metadata)
      ? metadata.replace(field, `${key}: ${value}`)
      : `${metadata.trimEnd()}\n${key}: ${value}`;
  }
  readme = `---\n${metadata.trim()}\n---\n${existing ? readme.slice(existing[0].length) : readme}`;
  readme = readme.replace(
    /^Check out the configuration reference at https:\/\/huggingface\.co\/docs\/hub\/spaces-config-reference[^\r\n]*\r?\n?/gm,
    ""
  );

  const githubContext =
    "Play the next token! Token Arcade is a browser-only game explaining structured output and constrained decoding with Transformers.js. Flip token cards, build a response that satisfies JSON Schema or regex constraints, and share your score. Gameplay and explanations run locally on WebGPU with Gemma 4 E2B.\n\n" +
    `Explore the implementation and run the game yourself in the [GitHub repository](${GITHUB_URL}).`;
  const contextBlock = `<!-- tokenarcade:about:start -->\n${githubContext}\n<!-- tokenarcade:about:end -->`;
  const existingContext = /<!-- tokenarcade:about:start -->[\s\S]*?<!-- tokenarcade:about:end -->/;
  if (existingContext.test(readme)) readme = readme.replace(existingContext, contextBlock);
  else readme = `${readme.trimEnd()}\n\n${contextBlock}\n`;
  writeFileSync(readmePath, `${readme.trimEnd()}\n`);

  run("git", ["add", "--all"], { cwd: spaceDirectory });
  const diff = spawnSync("git", ["diff", "--cached", "--quiet"], {
    cwd: spaceDirectory,
    stdio: "inherit",
  });
  if (diff.error) throw diff.error;
  if (diff.status === 0) {
    console.log("The Space is already up to date.");
  } else if (diff.status === 1) {
    run("git", ["commit", "-m", "Deploy Token Arcade production build"], { cwd: spaceDirectory });
    run("git", ["push", "origin", "HEAD:main"], { cwd: spaceDirectory });
    console.log(`Deployed to ${SPACE_URL}`);
  } else {
    throw new Error(`git diff exited with status ${diff.status}`);
  }
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
