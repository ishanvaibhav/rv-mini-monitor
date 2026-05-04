import { existsSync, mkdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const SOURCE_PATH = path.join(ROOT_DIR, "server", "riscv", "hello.c");
const BUILD_DIR = path.join(ROOT_DIR, "server", "riscv-build");
const BINARY_PATH = path.join(BUILD_DIR, "hello");
const PORT = Number(process.env.RISCV_WS_PORT ?? 8080);
const GPR_ORDER = [
  "zero", "ra", "sp", "gp", "tp",
  "t0", "t1", "t2",
  "s0", "s1",
  "a0", "a1", "a2", "a3", "a4", "a5", "a6", "a7",
  "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10", "s11",
  "t3", "t4", "t5", "t6",
  "pc",
];

mkdirSync(BUILD_DIR, { recursive: true });

function quoteBash(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function sendMessage(ws, payload) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(payload));
  }
}

function capture(command, args = [], options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      resolve({
        code: -1,
        stdout,
        stderr: `${stderr}${stderr ? "\n" : ""}${error.message}`,
      });
    });

    child.on("close", (code) => {
      resolve({
        code: code ?? -1,
        stdout,
        stderr,
      });
    });
  });
}

async function toWslPath(windowsPath) {
  const result = await capture("wsl.exe", ["wslpath", "-a", windowsPath]);

  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || "Unable to convert Windows path to WSL path.");
  }

  return result.stdout.trim();
}

async function runViaWsl(command, args = [], cwd = ROOT_DIR) {
  const linuxCwd = await toWslPath(cwd);
  const shellCommand = `cd ${quoteBash(linuxCwd)} && exec ${[command, ...args].map(quoteBash).join(" ")}`;

  return capture("wsl.exe", ["bash", "-lc", shellCommand]);
}

async function spawnViaWsl(command, args = [], cwd = ROOT_DIR) {
  const linuxCwd = await toWslPath(cwd);
  const shellCommand = `cd ${quoteBash(linuxCwd)} && exec ${[command, ...args].map(quoteBash).join(" ")}`;

  return spawn("wsl.exe", ["bash", "-lc", shellCommand], {
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function detectToolchain() {
  const localChecks = await Promise.all([
    capture("qemu-riscv64", ["--version"]),
    capture("riscv64-linux-gnu-gcc", ["--version"]),
    capture("gdb-multiarch", ["--version"]),
  ]);
  const localNames = ["qemu-riscv64", "riscv64-linux-gnu-gcc", "gdb-multiarch"];
  const localTools = Object.fromEntries(
    localNames.map((name, index) => [name, localChecks[index].code === 0]),
  );

  if (Object.values(localTools).every(Boolean)) {
    return {
      available: true,
      mode: "local",
      tools: localTools,
      message: "Using host-installed QEMU, cross-compiler, and GDB.",
    };
  }

  const wslProbe = await capture("wsl.exe", [
    "bash",
    "-lc",
    "command -v qemu-riscv64 >/dev/null && command -v riscv64-linux-gnu-gcc >/dev/null && command -v gdb-multiarch >/dev/null",
  ]);

  if (wslProbe.code === 0) {
    return {
      available: true,
      mode: "wsl",
      tools: {
        "qemu-riscv64": true,
        "riscv64-linux-gnu-gcc": true,
        "gdb-multiarch": true,
      },
      message: "Using the toolchain inside WSL.",
    };
  }

  return {
    available: false,
    mode: "unavailable",
    tools: {
      ...localTools,
      wsl: false,
    },
    message: wslProbe.stderr.trim() || "QEMU, the RISC-V cross-compiler, and GDB were not found.",
  };
}

async function runToolchain(mode, command, args = [], cwd = ROOT_DIR) {
  if (mode === "wsl") {
    return runViaWsl(command, args, cwd);
  }

  return capture(command, args, { cwd });
}

async function spawnToolchain(mode, command, args = [], cwd = ROOT_DIR) {
  if (mode === "wsl") {
    return spawnViaWsl(command, args, cwd);
  }

  return spawn(command, args, {
    cwd,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function buildStatusLines(status) {
  const lines = [
    "[LIVE STATUS]",
    `backend : ${status.available ? "ready" : "blocked"}`,
    `mode    : ${status.mode}`,
    `qemu    : ${status.tools["qemu-riscv64"] ? "found" : "missing"}`,
    `gcc     : ${status.tools["riscv64-linux-gnu-gcc"] ? "found" : "missing"}`,
    `gdb     : ${status.tools["gdb-multiarch"] ? "found" : "missing"}`,
    `sample  : ${path.relative(ROOT_DIR, SOURCE_PATH).replaceAll("\\", "/")}`,
  ];

  if (status.available) {
    lines.push("live    : boot, regs, step, and mem are backed by QEMU + GDB.");
    lines.push("note    : this pipeline is user-mode QEMU, so CSR state is still simulated.");
  } else {
    lines.push("install : sudo apt install qemu-user gcc-riscv64-linux-gnu gdb-multiarch");
    lines.push("hint    : run that in Ubuntu or WSL, then restart `npm run server`.");
  }

  lines.push(`detail  : ${status.message}`);

  return lines;
}

function needsRebuild() {
  if (!existsSync(BINARY_PATH)) {
    return true;
  }

  return statSync(BINARY_PATH).mtimeMs < statSync(SOURCE_PATH).mtimeMs;
}

async function ensureBinary(toolchain) {
  if (!toolchain.available) {
    const error = new Error("Toolchain unavailable.");
    error.lines = buildStatusLines(toolchain);
    throw error;
  }

  if (!needsRebuild()) {
    return { rebuilt: false, binaryPath: BINARY_PATH };
  }

  const binaryArg = toolchain.mode === "wsl" ? await toWslPath(BINARY_PATH) : BINARY_PATH;
  const sourceArg = toolchain.mode === "wsl" ? await toWslPath(SOURCE_PATH) : SOURCE_PATH;
  const build = await runToolchain(toolchain.mode, "riscv64-linux-gnu-gcc", [
    "-static",
    "-g",
    "-O0",
    "-o",
    binaryArg,
    sourceArg,
  ]);

  if (build.code !== 0) {
    const error = new Error("Failed to compile the RISC-V sample.");
    error.lines = [
      "[build failed]",
      build.stdout.trim(),
      build.stderr.trim(),
    ].filter(Boolean);
    throw error;
  }

  return { rebuilt: true, binaryPath: BINARY_PATH };
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not allocate a debug port."));
        return;
      }

      server.close(() => resolve(address.port));
    });

    server.on("error", reject);
  });
}

function writeGdbScript(name, content) {
  const scriptPath = path.join(BUILD_DIR, `${name}-${Date.now()}.gdb`);
  writeFileSync(scriptPath, content, "utf8");
  return scriptPath;
}

function parseRegisters(output) {
  const captures = new Map();
  const regex = /^\s*([a-z][a-z0-9]+)\s+0x([0-9a-f]+)/gim;
  let match = regex.exec(output);

  while (match) {
    captures.set(match[1], `0x${match[2].padStart(16, "0")}`);
    match = regex.exec(output);
  }

  return GPR_ORDER.filter((name) => captures.has(name)).map((name) => ({
    name,
    value: captures.get(name),
  }));
}

function parseInstructions(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^(=>\s*)?0x[0-9a-f]+/i.test(line));
}

function parseMemory(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^0x[0-9a-f]+.*:/i.test(line));
}

function makeCommandError(lines) {
  const error = new Error(lines[0] || "Command failed.");
  error.lines = lines;
  return error;
}

async function runBoot(ws) {
  const toolchain = await detectToolchain();
  const artifact = await ensureBinary(toolchain);
  const binaryArg = toolchain.mode === "wsl" ? await toWslPath(artifact.binaryPath) : artifact.binaryPath;
  const qemu = await spawnToolchain(toolchain.mode, "qemu-riscv64", [binaryArg]);

  sendMessage(ws, {
    type: "command-start",
    command: "boot",
    lines: [
      `[live] launching qemu-riscv64 (${toolchain.mode})`,
      artifact.rebuilt ? "[build] recompiled sample ELF before launch." : "[build] reusing existing sample ELF.",
    ],
  });

  qemu.stdout.on("data", (chunk) => {
    sendMessage(ws, {
      type: "command-stream",
      command: "boot",
      stream: "stdout",
      text: chunk.toString(),
    });
  });

  qemu.stderr.on("data", (chunk) => {
    sendMessage(ws, {
      type: "command-stream",
      command: "boot",
      stream: "stderr",
      text: chunk.toString(),
    });
  });

  await new Promise((resolve, reject) => {
    qemu.on("error", reject);
    qemu.on("close", (code) => {
      sendMessage(ws, {
        type: "command-result",
        command: "boot",
        exitCode: code ?? -1,
        lines: [`[process finished] exit=${code ?? -1}`],
      });
      resolve();
    });
  });
}

async function runDebugSnapshot(kind) {
  const toolchain = await detectToolchain();
  const artifact = await ensureBinary(toolchain);
  const port = await getFreePort();
  const binaryArg = toolchain.mode === "wsl" ? await toWslPath(artifact.binaryPath) : artifact.binaryPath;
  const qemu = await spawnToolchain(toolchain.mode, "qemu-riscv64", ["-g", String(port), binaryArg]);
  const scripts = {
    regs: [
      "set confirm off",
      "set pagination off",
      `target remote :${port}`,
      "break main",
      "continue",
      "info registers",
      "quit",
    ].join("\n"),
    step: [
      "set confirm off",
      "set pagination off",
      `target remote :${port}`,
      "break main",
      "continue",
      "x/i $pc",
      "stepi",
      "x/i $pc",
      "stepi",
      "x/i $pc",
      "stepi",
      "x/i $pc",
      "stepi",
      "x/i $pc",
      "quit",
    ].join("\n"),
    mem: [
      "set confirm off",
      "set pagination off",
      `target remote :${port}`,
      "break main",
      "continue",
      "info registers sp",
      "x/16gx $sp",
      "quit",
    ].join("\n"),
  };
  const scriptPath = writeGdbScript(kind, scripts[kind]);
  const scriptArg = toolchain.mode === "wsl" ? await toWslPath(scriptPath) : scriptPath;

  try {
    await delay(400);

    const gdb = await runToolchain(toolchain.mode, "gdb-multiarch", [
      binaryArg,
      "-q",
      "--batch",
      "-x",
      scriptArg,
    ]);

    if (gdb.code !== 0) {
      throw makeCommandError([
        `[${kind}] GDB query failed.`,
        gdb.stdout.trim(),
        gdb.stderr.trim(),
      ].filter(Boolean));
    }

    if (kind === "regs") {
      return {
        toolchain,
        rebuilt: artifact.rebuilt,
        registers: parseRegisters(gdb.stdout),
      };
    }

    if (kind === "step") {
      return {
        toolchain,
        rebuilt: artifact.rebuilt,
        instructions: parseInstructions(gdb.stdout),
      };
    }

    return {
      toolchain,
      rebuilt: artifact.rebuilt,
      memory: parseMemory(gdb.stdout),
    };
  } finally {
    try {
      qemu.kill();
    } catch {
      // Best effort cleanup.
    }

    try {
      unlinkSync(scriptPath);
    } catch {
      // Ignore cleanup failures.
    }
  }
}

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", async (ws) => {
  let busy = false;

  sendMessage(ws, {
    type: "hello",
    status: await detectToolchain(),
  });

  ws.on("message", async (raw) => {
    let payload;

    try {
      payload = JSON.parse(raw.toString());
    } catch {
      sendMessage(ws, {
        type: "command-error",
        command: "unknown",
        lines: ["Malformed request payload."],
      });
      return;
    }

    if (payload.type !== "command") {
      sendMessage(ws, {
        type: "command-error",
        command: "unknown",
        lines: ["Unsupported request type."],
      });
      return;
    }

    if (busy) {
      sendMessage(ws, {
        type: "busy",
        activeCommand: payload.command,
      });
      return;
    }

    busy = true;

    try {
      if (payload.command === "status") {
        const status = await detectToolchain();

        sendMessage(ws, {
          type: "command-result",
          command: "status",
          status,
          lines: buildStatusLines(status),
        });
        return;
      }

      if (payload.command === "boot") {
        await runBoot(ws);
        return;
      }

      if (payload.command === "regs" || payload.command === "step" || payload.command === "mem") {
        const snapshot = await runDebugSnapshot(payload.command);

        sendMessage(ws, {
          type: "command-result",
          command: payload.command,
          ...snapshot,
        });
        return;
      }

      sendMessage(ws, {
        type: "command-error",
        command: payload.command,
        lines: [`Unsupported live command: ${payload.command}`],
      });
    } catch (error) {
      sendMessage(ws, {
        type: "command-error",
        command: payload.command,
        lines: error.lines ?? [error.message ?? "Unknown backend error."],
      });
    } finally {
      busy = false;
    }
  });
});

console.log(`RV monitor backend listening on ws://localhost:${PORT}`);
