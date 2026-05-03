interface Command {
  cmd: string;
  args: string;
  desc: string;
  example: string;
  detail: string;
}

const commands: Command[] = [
  {
    cmd: "h",
    args: "",
    desc: "Show help menu",
    example: "h",
    detail: "Lists all commands with brief descriptions. Always available as the first command to type.",
  },
  {
    cmd: "x",
    args: "<addr> [len]",
    desc: "Hex dump memory",
    example: "x 80010000 64",
    detail: "Dumps len bytes (default 64) starting at addr in xxd-style format: hex bytes + ASCII sidebar. Address is hex, no '0x' prefix needed.",
  },
  {
    cmd: "w",
    args: "<addr> <val>",
    desc: "Write 32-bit word",
    example: "w 10000000 0x41",
    detail: "Writes a 32-bit value to the given physical address. Writing to 0x10000000 (UART THR) prints the character. Validates address is not in locked monitor region.",
  },
  {
    cmd: "j",
    args: "<addr>",
    desc: "Jump to address (no return)",
    example: "j 80200000",
    detail: "Clears mstatus.MIE (interrupts off), sets a0=mhartid, a1=DTB address, then jumps. If the target faults, the trap handler catches it and returns to the monitor prompt.",
  },
  {
    cmd: "r",
    args: "",
    desc: "Dump all 32 GPRs + CSRs",
    example: "r",
    detail: "Prints x0–x31 with ABI names (zero, ra, sp, gp…) and key CSRs: mhartid, mstatus, mepc, mcause, mtvec, mcycle, minstret.",
  },
  {
    cmd: "load xmodem",
    args: "",
    desc: "Receive binary via XMODEM-1K",
    example: "load xmodem",
    detail: "Initiates XMODEM-1K CRC transfer. Use `sx -k payload.elf /dev/ttyUSB0` on host. Binary lands at 0x80200000. ELF headers parsed automatically.",
  },
  {
    cmd: "boot smp",
    args: "<addr>",
    desc: "Wake secondary harts via IPI",
    example: "boot smp 80200000",
    detail: "Writes addr to each hart's mailbox, then sends MSIP by writing 1 to CLINT+0x4*hartid. Secondary harts exit WFI and jump to addr with their hartid in a0.",
  },
  {
    cmd: "pmp",
    args: "",
    desc: "Display PMP region config",
    example: "pmp",
    detail: "Shows all configured PMP regions: base address, size, permissions (R/W/X), NAPOT encoding, and lock status.",
  },
  {
    cmd: "log",
    args: "[n]",
    desc: "Dump circular log buffer",
    example: "log 50",
    detail: "Prints the last n log entries (default: all) from the in-memory circular buffer. Useful after a crash to see what happened before the trap.",
  },
  {
    cmd: "reboot",
    args: "",
    desc: "Soft reset this hart",
    example: "reboot",
    detail: "Jumps back to _start at 0x80000000 via mret with mstatus.MPP=M. Re-initialises stack, BSS, trap vector, PMP, and UART.",
  },
];

export default function CommandRef() {
  return (
    <div className="space-y-2">
      {commands.map(c => (
        <details key={c.cmd} className="group rounded-lg border border-gray-800 bg-gray-900/60 overflow-hidden">
          <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-800/60 transition-colors list-none">
            <span className="text-xs text-gray-500 group-open:rotate-90 transition-transform">▶</span>
            <code className="text-sm font-mono text-cyan-300 font-bold min-w-32">{c.cmd}</code>
            {c.args && (
              <code className="text-xs font-mono text-amber-300/80">{c.args}</code>
            )}
            <span className="text-xs text-gray-400 ml-auto">{c.desc}</span>
          </summary>
          <div className="px-4 pb-4 pt-2 border-t border-gray-800 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-mono">Example:</span>
              <code className="text-xs font-mono bg-gray-800 text-emerald-300 px-2 py-0.5 rounded">
                rv-monitor&gt; {c.example}
              </code>
            </div>
            <p className="text-xs text-gray-400 font-mono leading-relaxed">{c.detail}</p>
          </div>
        </details>
      ))}
    </div>
  );
}
