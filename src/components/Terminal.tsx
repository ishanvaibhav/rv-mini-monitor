import { useState, useEffect, useRef, useCallback } from "react";
import type { SessionKey } from "../data/terminalSessions";
import { terminalSessions } from "../data/terminalSessions";

interface TerminalProps {
  activeSession: SessionKey;
  onSessionChange: (s: SessionKey) => void;
}

const sessionTabs: { key: SessionKey; label: string }[] = [
  { key: "boot", label: "Boot" },
  { key: "help", label: "Help" },
  { key: "hexdump", label: "Hex Dump" },
  { key: "elf_load", label: "ELF Load" },
  { key: "trap", label: "Trap" },
  { key: "regs", label: "Regs" },
  { key: "pmp", label: "PMP" },
];

function lineClass(type: string): string {
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

export default function Terminal({
  activeSession,
  onSessionChange,
}: TerminalProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [userInput, setUserInput] = useState("");
  const [commandOutput, setCommandOutput] = useState<string[]>([]);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const session = terminalSessions[activeSession];
  const lines = session.lines;

  const clearTimers = useCallback(() => {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
  }, []);

  const startPlayback = useCallback(() => {
    clearTimers();
    setVisibleCount(0);
    setIsPlaying(true);

    lines.forEach((line, i) => {
      const timer = setTimeout(() => {
        setVisibleCount(i + 1);
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
  }, [lines, clearTimers]);

  useEffect(() => {
    startPlayback();
    return clearTimers;
  }, [activeSession, startPlayback, clearTimers]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleCount, commandOutput]);

  const handleSessionChange = (key: SessionKey) => {
    clearTimers();
    setVisibleCount(0);
    setIsPlaying(false);
    setUserInput("");
    setCommandOutput([]);
    onSessionChange(key);
  };

  const runCommand = (cmd: string) => {
    const clean = cmd.toLowerCase().trim();
    let output: string[] = [];

    if (clean === "clear") {
      setCommandOutput([]);
      return;
    }

    switch (clean) {
      case "help":
      case "h":
        output = [
          "Commands:",
          "help / h",
          "regs / r",
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
          "status",
          "sudo",
          "ping google.com",
          "top",
          "neofetch",
          "matrix",
        ];
        break;

      case "regs":
      case "r":
        output = [
          "x0 = 0x00000000",
          "x1 = 0x80001000",
          "x2 = 0x8000FFF0",
          "mepc = 0x80000000",
          "mcause = 0x00000000",
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

      case "status":
        output = [
          "UART   : connected",
          "Memory : healthy",
          "PMP    : enabled",
          "Harts  : 8",
        ];
        break;

      case "sudo":
        output = ["Permission denied.", "Nice try 😎"];
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
        output = ["Unknown command: " + cmd];
        break;
    }

    setCommandOutput((prev) => [
      ...prev,
      "rv-monitor> " + cmd,
      ...output,
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && userInput.trim()) {
      const cmd = userInput.trim();

      setInputHistory((prev) => [cmd, ...prev.slice(0, 49)]);
      setHistoryIdx(-1);

      runCommand(cmd);
      setUserInput("");
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const idx = historyIdx + 1;

      if (idx < inputHistory.length) {
        setHistoryIdx(idx);
        setUserInput(inputHistory[idx]);
      }
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const idx = historyIdx - 1;

      if (idx < 0) {
        setHistoryIdx(-1);
        setUserInput("");
      } else {
        setHistoryIdx(idx);
        setUserInput(inputHistory[idx]);
      }
    }
  };

  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden border border-gray-700 shadow-2xl shadow-black/60">
      {/* Title Bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 border-b border-gray-700">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <div className="w-3 h-3 rounded-full bg-green-500" />

        <span className="ml-3 text-xs text-gray-400 font-mono">
          qemu-system-riscv64 -machine virt -m 128M -nographic
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 overflow-x-auto bg-gray-950 border-b border-gray-700 px-2 pt-2">
        {sessionTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleSessionChange(tab.key)}
            className={`px-3 py-1.5 text-xs font-mono rounded-t whitespace-nowrap transition-colors ${
              activeSession === tab.key
                ? "bg-gray-800 text-emerald-400 border border-b-0 border-gray-600"
                : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
            }`}
          >
            {tab.label}
          </button>
        ))}

        <div className="ml-auto pb-1 px-2">
          <button
            onClick={startPlayback}
            className="text-xs text-gray-500 hover:text-emerald-400 font-mono"
          >
            ↺ replay
          </button>
        </div>
      </div>

      {/* Terminal */}
      <div
        className="flex-1 overflow-y-auto bg-gray-950 p-4 font-mono text-xs leading-relaxed min-h-0"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.slice(0, visibleCount).map((line, i) => (
          <div
            key={`${activeSession}-${i}`}
            className={`${lineClass(line.type)} whitespace-pre`}
          >
            {line.text}
          </div>
        ))}

        {commandOutput.map((line, i) => (
          <div key={i} className="text-cyan-300 whitespace-pre">
            {line}
          </div>
        ))}

        {!isPlaying && (
          <div className="flex items-center mt-1">
            <span className="text-emerald-400">rv-monitor</span>
            <span className="text-gray-500">:</span>
            <span className="text-cyan-300">~</span>
            <span className="text-gray-500">$ </span>

            <input
              ref={inputRef}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="bg-transparent text-white outline-none flex-1 text-xs caret-emerald-400"
              spellCheck={false}
              autoComplete="off"
            />

            <span className="animate-pulse text-emerald-400 ml-1">█</span>
          </div>
        )}

        {isPlaying && (
          <span className="inline-block animate-pulse text-emerald-400">
            ▋
          </span>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-gray-900 border-t border-gray-700 text-xs font-mono text-gray-500">
        <span className="text-emerald-500">● CONNECTED</span>
        <span>115200 baud · 8N1 · QEMU virt</span>
        <span className={isPlaying ? "text-yellow-400" : "text-gray-600"}>
          {isPlaying ? "● RX" : "○ RX"}
        </span>
      </div>
    </div>
  );
}