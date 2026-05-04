import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionKey } from "../data/terminalSessions";
import { terminalSessions } from "../data/terminalSessions";

interface TerminalProps {
  activeSession: SessionKey;
  onSessionChange: (session: SessionKey) => void;
}

type OutputType = "output" | "input" | "prompt" | "banner" | "error" | "success" | "dim";

interface OutputLine {
  type: OutputType;
  text: string;
}

type BackendState = "connecting" | "online" | "offline";
type LiveCommand = "boot" | "status" | "regs" | "step" | "mem";

interface BackendStatus {
  available: boolean;
  mode: string;
  message: string;
  tools: Record<string, boolean>;
}

type BackendMessage =
  | { type: "hello"; status: BackendStatus }
  | { type: "busy"; activeCommand: string }
  | { type: "command-start"; command: LiveCommand; lines: string[] }
  | { type: "command-stream"; command: LiveCommand; stream: "stdout" | "stderr"; text: string }
  | { type: "command-error"; command: string; lines: string[] }
  | { type: "command-result"; command: "status"; status: BackendStatus; lines: string[] }
  | { type: "command-result"; command: "boot"; exitCode: number; lines: string[] }
  | {
      type: "command-result";
      command: "regs";
      toolchain: BackendStatus;
      rebuilt: boolean;
      registers: Array<{ name: string; value: string }>;
    }
  | {
      type: "command-result";
      command: "step";
      toolchain: BackendStatus;
      rebuilt: boolean;
      instructions: string[];
    }
  | {
      type: "command-result";
      command: "mem";
      toolchain: BackendStatus;
      rebuilt: boolean;
      memory: string[];
    };

const sessionTabs: Array<{ key: SessionKey; label: string }> = [
  { key: "boot", label: "Boot" },
  { key: "help", label: "Help" },
  { key: "hexdump", label: "Hex Dump" },
  { key: "elf_load", label: "ELF Load" },
  { key: "trap", label: "Trap" },
  { key: "regs", label: "Regs" },
  { key: "pmp", label: "PMP" },
];

const liveCommandAliases: Partial<Record<string, LiveCommand>> = {
  boot: "boot",
  status: "status",
  regs: "regs",
  r: "regs",
  step: "step",
  mem: "mem",
};

const liveCommandHelp = "boot, status, regs, step, mem";

function lineClass(type: OutputType): string {
  switch (type) {
    case "banner":
      return "text-emerald-400 font-bold";
    case "success":
      return "text-emerald-300";
    case "error":
      return "text-red-400";
    case "prompt":
      return "text-cyan-300 font-semibold";
    case "dim":
      return "text-gray-500";
    default:
      return "text-gray-200";
  }
}

function backendUrl() {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.hostname || "localhost";
  const port = import.meta.env.VITE_RISCV_WS_PORT ?? "8080";
  return `${protocol}://${host}:${port}`;
}

export default function Terminal({ activeSession, onSessionChange }: TerminalProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [userInput, setUserInput] = useState("");
  const [commandOutput, setCommandOutput] = useState<OutputLine[]>([]);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [backendState, setBackendState] = useState<BackendState>("connecting");
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRefs = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number | null>(null);
  const shouldReconnectRef = useRef(true);

  const session = terminalSessions[activeSession];
  const lines = session.lines;

  const clearTimers = useCallback(() => {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
  }, []);

  const appendLines = useCallback((nextLines: OutputLine[]) => {
    setCommandOutput((previous) => [...previous, ...nextLines]);
  }, []);

  const appendTextLines = useCallback((texts: string[], type: OutputType = "output") => {
    appendLines(texts.map((text) => ({ type, text })));
  }, [appendLines]);

  const appendChunk = useCallback((text: string, type: OutputType = "output") => {
    const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const split = normalized.split("\n");

    if (split[split.length - 1] === "") {
      split.pop();
    }

    if (split.length > 0) {
      appendLines(split.map((line) => ({ type, text: line })));
    }
  }, [appendLines]);

  const renderRegisterDump = useCallback((registers: Array<{ name: string; value: string }>, rebuilt: boolean) => {
    const rows = [
      "[LIVE REGISTERS]",
      rebuilt ? "[build] sample ELF was rebuilt before capture." : "[build] sample ELF reused.",
      ...registers.map(({ name, value }) => `${name.padEnd(5, " ")} : ${value}`),
      "",
      "[note] This live path is QEMU user-mode, so CSR values remain part of the simulated monitor view.",
    ];

    appendTextLines(rows, "output");
  }, [appendTextLines]);

  const renderInstructionTrace = useCallback((instructions: string[], rebuilt: boolean) => {
    const rows = [
      "[INSTRUCTION TRACE]",
      rebuilt ? "[build] sample ELF was rebuilt before stepping." : "[build] sample ELF reused.",
      ...instructions,
    ];

    appendTextLines(rows, "output");
  }, [appendTextLines]);

  const renderMemoryDump = useCallback((memory: string[], rebuilt: boolean) => {
    const rows = [
      "[MEMORY DUMP]",
      rebuilt ? "[build] sample ELF was rebuilt before dump." : "[build] sample ELF reused.",
      ...memory,
    ];

    appendTextLines(rows, "output");
  }, [appendTextLines]);

  const handleBackendMessage = useCallback((message: BackendMessage) => {
    if (message.type === "hello") {
      setBackendStatus(message.status);
      setBackendState("online");
      return;
    }

    if (message.type === "busy") {
      appendTextLines(["[busy] A live command is already running. Wait for it to finish and try again."], "error");
      return;
    }

    if (message.type === "command-start") {
      appendTextLines(message.lines, "dim");
      return;
    }

    if (message.type === "command-stream") {
      appendChunk(message.text, message.stream === "stderr" ? "error" : "output");
      return;
    }

    if (message.type === "command-error") {
      appendTextLines(message.lines, "error");
      return;
    }

    if (message.command === "status") {
      setBackendStatus(message.status);
      appendTextLines(message.lines, message.status.available ? "dim" : "error");
      return;
    }

    if (message.command === "boot") {
      appendTextLines(message.lines, message.exitCode === 0 ? "success" : "error");
      return;
    }

    if (message.command === "regs") {
      renderRegisterDump(message.registers, message.rebuilt);
      return;
    }

    if (message.command === "step") {
      renderInstructionTrace(message.instructions, message.rebuilt);
      return;
    }

    renderMemoryDump(message.memory, message.rebuilt);
  }, [appendChunk, appendTextLines, renderInstructionTrace, renderMemoryDump, renderRegisterDump]);

  const connectSocket = useCallback(() => {
    if (
      socketRef.current &&
      (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    setBackendState("connecting");

    const socket = new WebSocket(backendUrl());

    socket.onopen = () => {
      setBackendState("online");
    };

    socket.onmessage = (event) => {
      try {
        handleBackendMessage(JSON.parse(event.data) as BackendMessage);
      } catch {
        appendTextLines(["[backend] Received a malformed message."], "error");
      }
    };

    socket.onerror = () => {
      setBackendState("offline");
    };

    socket.onclose = () => {
      setBackendState("offline");
      socketRef.current = null;

      if (!shouldReconnectRef.current) {
        return;
      }

      if (reconnectRef.current !== null) {
        window.clearTimeout(reconnectRef.current);
      }

      reconnectRef.current = window.setTimeout(() => {
        connectSocket();
      }, 2500);
    };

    socketRef.current = socket;
  }, [appendTextLines, handleBackendMessage]);

  useEffect(() => {
    shouldReconnectRef.current = true;
    connectSocket();

    return () => {
      shouldReconnectRef.current = false;

      if (reconnectRef.current !== null) {
        window.clearTimeout(reconnectRef.current);
      }

      socketRef.current?.close();
    };
  }, [connectSocket]);

  const dispatchLiveCommand = useCallback((command: LiveCommand) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      appendTextLines(
        [
          "[backend offline]",
          "Start the WebSocket backend with `npm run server` and make sure QEMU/GDB are installed.",
        ],
        "error",
      );
      return;
    }

    socketRef.current.send(JSON.stringify({ type: "command", command }));
  }, [appendTextLines]);

  const startPlayback = useCallback(() => {
    clearTimers();
    setVisibleCount(0);
    setIsPlaying(true);

    lines.forEach((line, index) => {
      const timer = setTimeout(() => {
        setVisibleCount(index + 1);
      }, (line.delay || 0) + 200);

      timerRefs.current.push(timer);
    });

    const doneTimer = setTimeout(() => {
      setIsPlaying(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }, (lines[lines.length - 1]?.delay || 0) + 600);

    timerRefs.current.push(doneTimer);
  }, [clearTimers, lines]);

  useEffect(() => {
    startPlayback();
    return clearTimers;
  }, [activeSession, clearTimers, startPlayback]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [commandOutput, visibleCount]);

  const handleSessionChange = (sessionKey: SessionKey) => {
    clearTimers();
    setVisibleCount(0);
    setIsPlaying(false);
    setUserInput("");
    setCommandOutput([]);
    onSessionChange(sessionKey);
  };

  const runCommand = (command: string) => {
    const clean = command.toLowerCase().trim();
    let output: string[] = [];

    if (clean === "clear") {
      setCommandOutput([]);
      return;
    }

    appendLines([{ type: "prompt", text: `rv-monitor> ${command}` }]);

    const liveCommand = liveCommandAliases[clean];

    if (liveCommand) {
      dispatchLiveCommand(liveCommand);
      return;
    }

    switch (clean) {
      case "help":
      case "h":
        output = [
          "Commands:",
          `Live: ${liveCommandHelp}`,
          "help / h",
          "regs / r (live)",
          "step (live)",
          "mem (live)",
          "status (live)",
          "boot (live)",
          "pmp",
          "hexdump",
          "version",
          "reboot",
          "clear",
          "whoami",
          "date",
          "ls /dev",
          "cat /proc/cpuinfo",
          "uptime",
          "sudo",
          "ping google.com",
          "top",
          "neofetch",
          "matrix",
        ];
        break;

      case "pmp":
        output = [
          "[PMP0] 0x80000000 - 0x80100000 R/X LOCKED",
          "[PMP1] 0x80100000 - 0x88000000 R/W/X",
        ];
        break;

      case "hexdump":
      case "x":
        output = [
          "80000000: 13 04 00 00 93 04 00 00",
          "80000008: 13 05 00 00 93 05 00 00",
          "Tip: use `mem` for the live GDB-backed stack dump.",
        ];
        break;

      case "version":
        output = ["RV-Mini-Monitor v1.0"];
        break;

      case "reboot":
        output = ["Rebooting hart 0...", "Boot sequence restarted."];
        break;

      case "whoami":
        output = ["root"];
        break;

      case "date":
        output = [new Date().toString()];
        break;

      case "ls /dev":
        output = ["ttyS0", "null", "zero", "mem", "uart0", "clint0"];
        break;

      case "cat /proc/cpuinfo":
        output = [
          "processor : 0",
          "arch      : riscv64",
          "hart      : 0",
          "isa       : rv64imac",
          "mode      : M-mode",
        ];
        break;

      case "uptime":
        output = ["up 00:12:41"];
        break;

      case "sudo":
        output = ["Permission denied.", "Nice try."];
        break;

      case "ping google.com":
        output = [
          "PING google.com (142.250.183.14): 56 data bytes",
          "64 bytes from 142.250.183.14: icmp_seq=0 ttl=117 time=14ms",
          "64 bytes from 142.250.183.14: icmp_seq=1 ttl=117 time=13ms",
          "64 bytes from 142.250.183.14: icmp_seq=2 ttl=117 time=15ms",
        ];
        break;

      case "top":
        output = [
          "PID USER   CPU MEM COMMAND",
          "1   root   2%  4%  rv-monitor",
          "2   root   1%  1%  uartd",
          "3   root   0%  1%  logger",
        ];
        break;

      case "neofetch":
        output = [
          "RV-Mini-Monitor",
          "OS: Bare Metal",
          "Kernel: rv64imac",
          "Shell: rvsh 1.0",
          "CPU: RISC-V 8 Hart",
          "Memory: 128 MB",
        ];
        break;

      case "matrix":
        output = [
          "010101010101010101",
          "101001010110101010",
          "010110101001010101",
          "101010101010101001",
        ];
        break;

      default:
        output = [`Unknown command: ${command}`];
        break;
    }

    appendTextLines(output, "output");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && userInput.trim()) {
      const command = userInput.trim();

      setInputHistory((previous) => [command, ...previous.slice(0, 49)]);
      setHistoryIndex(-1);
      runCommand(command);
      setUserInput("");
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex = historyIndex + 1;

      if (nextIndex < inputHistory.length) {
        setHistoryIndex(nextIndex);
        setUserInput(inputHistory[nextIndex]);
      }
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex = historyIndex - 1;

      if (nextIndex < 0) {
        setHistoryIndex(-1);
        setUserInput("");
      } else {
        setHistoryIndex(nextIndex);
        setUserInput(inputHistory[nextIndex]);
      }
    }
  };

  const backendBadgeClass =
    backendState === "online"
      ? "text-emerald-500"
      : backendState === "connecting"
        ? "text-yellow-400"
        : "text-red-400";

  const backendBadgeText =
    backendState === "online"
      ? "LIVE BACKEND"
      : backendState === "connecting"
        ? "CONNECTING"
        : "OFFLINE";

  const toolchainLabel =
    backendStatus?.mode === "wsl"
      ? "WSL toolchain"
      : backendStatus?.mode === "local"
        ? "Local toolchain"
        : "Simulation only";

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-700 shadow-2xl shadow-black/60">
      <div className="flex items-center gap-2 border-b border-gray-700 bg-gray-900 px-4 py-3">
        <div className="h-3 w-3 rounded-full bg-red-500" />
        <div className="h-3 w-3 rounded-full bg-yellow-500" />
        <div className="h-3 w-3 rounded-full bg-green-500" />

        <span className="ml-3 font-mono text-xs text-gray-400">
          scripted monitor + live qemu-riscv64 backend
        </span>
      </div>

      <div className="flex gap-0 overflow-x-auto border-b border-gray-700 bg-gray-950 px-2 pt-2">
        {sessionTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleSessionChange(tab.key)}
            className={`whitespace-nowrap rounded-t px-3 py-1.5 font-mono text-xs transition-colors ${
              activeSession === tab.key
                ? "border border-b-0 border-gray-600 bg-gray-800 text-emerald-400"
                : "text-gray-500 hover:bg-gray-800/50 hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}

        <div className="ml-auto px-2 pb-1">
          <button
            onClick={startPlayback}
            className="font-mono text-xs text-gray-500 hover:text-emerald-400"
          >
            replay
          </button>
        </div>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto bg-gray-950 p-4 font-mono text-xs leading-relaxed"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.slice(0, visibleCount).map((line, index) => (
          <div
            key={`${activeSession}-${index}`}
            className={`${lineClass(line.type)} whitespace-pre`}
          >
            {line.text}
          </div>
        ))}

        {commandOutput.map((line, index) => (
          <div key={index} className={`${lineClass(line.type)} whitespace-pre`}>
            {line.text}
          </div>
        ))}

        {!isPlaying && (
          <div className="mt-1 flex items-center">
            <span className="text-emerald-400">rv-monitor</span>
            <span className="text-gray-500">:</span>
            <span className="text-cyan-300">~</span>
            <span className="text-gray-500">$ </span>

            <input
              ref={inputRef}
              value={userInput}
              onChange={(event) => setUserInput(event.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-xs text-white caret-emerald-400 outline-none"
              spellCheck={false}
              autoComplete="off"
            />

            <span className="ml-1 animate-pulse text-emerald-400">#</span>
          </div>
        )}

        {isPlaying && (
          <span className="inline-block animate-pulse text-emerald-400">
            *
          </span>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="flex items-center justify-between border-t border-gray-700 bg-gray-900 px-4 py-1.5 font-mono text-xs text-gray-500">
        <span className={backendBadgeClass}>o {backendBadgeText}</span>
        <span>{toolchainLabel}</span>
        <span className={isPlaying ? "text-yellow-400" : "text-gray-600"}>
          {isPlaying ? "o RX" : `o RX | ${liveCommandHelp}`}
        </span>
      </div>
    </div>
  );
}
