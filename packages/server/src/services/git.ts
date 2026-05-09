import { spawn } from "node:child_process";

function run(args: string[], cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("git", args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
    proc.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));

    proc.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || `git exited with code ${code}`));
    });

    proc.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") {
        reject(new Error("git not found — make sure Git is installed and available in PATH"));
      } else {
        reject(err);
      }
    });
  });
}

export async function cloneRepo(
  url: string,
  dest: string,
  branch?: string,
  token?: string,
): Promise<void> {
  const cloneUrl = token ? injectToken(url, token) : url;
  const args = ["clone", cloneUrl, dest, "--single-branch"];
  if (branch) args.push("--branch", branch);
  await run(args);
}

function injectToken(url: string, token: string): string {
  const parsed = new URL(url);
  parsed.username = "oauth2";
  parsed.password = token;
  return parsed.toString();
}

export async function pullRepo(repoPath: string): Promise<void> {
  await run(["pull", "--ff-only"], repoPath);
}

export async function getHeadCommit(repoPath: string): Promise<string> {
  return run(["rev-parse", "HEAD"], repoPath);
}

export async function getDefaultBranch(repoPath: string): Promise<string> {
  try {
    return await run(["symbolic-ref", "--short", "HEAD"], repoPath);
  } catch {
    return "main";
  }
}
