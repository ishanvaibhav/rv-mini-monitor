export interface Feature {
  id: string;
  label: string;
  done: boolean;
  tier: 1 | 2 | 3 | 4;
  category: string;
  description: string;
}

export const features: Feature[] = [
  // Tier 1 — Bare Metal Foundation
  { id: "uart_tx",       label: "UART TX (polling)",                  done: true,  tier: 1, category: "Core Infrastructure", description: "Memory-mapped write to 16550 THR with LSR THRE polling" },
  { id: "uart_rx",       label: "UART RX (polling + timeout)",        done: true,  tier: 1, category: "Core Infrastructure", description: "Non-blocking receive using mtime CSR for deadline timeout" },
  { id: "mtvec",         label: "Trap vector setup (mtvec)",          done: true,  tier: 1, category: "RISC-V Specifics",    description: "Direct-mode trap vector installed from boot.S" },
  { id: "trap_basic",    label: "Basic trap handler",                  done: true,  tier: 1, category: "RISC-V Specifics",    description: "Handles illegal instruction (mcause=2) and prints mepc" },
  { id: "stack",         label: "Stack setup",                         done: true,  tier: 1, category: "Core Infrastructure", description: "sp initialised to _stack_top from linker script" },
  { id: "bss_clear",     label: "BSS zero-initialisation",            done: true,  tier: 1, category: "Core Infrastructure", description: "boot.S loops from __bss_start to __bss_end" },

  // Tier 2 — Essential Monitor
  { id: "printf",        label: "printf (%x, %s, %p, %d)",           done: true,  tier: 2, category: "Core Infrastructure", description: "Lightweight format-string printer over UART" },
  { id: "cli",           label: "CLI parser (space-delimited)",       done: true,  tier: 2, category: "Core Infrastructure", description: "Read-eval-print loop with echo and backspace support" },
  { id: "cmd_help",      label: "'h' help command",                   done: true,  tier: 2, category: "Core Infrastructure", description: "Lists all available commands with usage examples" },
  { id: "cmd_x",         label: "'x <addr> [len]' hex dump",         done: true,  tier: 2, category: "Core Infrastructure", description: "16-byte rows with ASCII sidebar, like xxd output" },
  { id: "cmd_w",         label: "'w <addr> <val>' memory write",      done: true,  tier: 2, category: "Core Infrastructure", description: "32-bit aligned write; rejects monitor region addresses" },
  { id: "cmd_j",         label: "'j <addr>' jump to address",         done: true,  tier: 2, category: "Execution Control",   description: "Clears MIE, sets a0=hartid, a1=DTB, jumps bare" },
  { id: "cmd_r",         label: "'r' register dump (x0–x31)",        done: true,  tier: 2, category: "RISC-V Specifics",    description: "Prints all 32 GPRs from saved trap frame" },
  { id: "cmd_reboot",    label: "'reboot' soft reset",                done: true,  tier: 2, category: "Execution Control",   description: "Jumps to _start reset vector via mret" },
  { id: "cmd_mcpy",      label: "'mcpy <src> <dst> <len>' copy",      done: false, tier: 2, category: "Core Infrastructure", description: "Relocate image regions; useful before patching" },
  { id: "elf_loader",    label: "ELF64 loader (PT_LOAD + .bss)",     done: true,  tier: 2, category: "Execution Control",   description: "Validates magic, checks EM_RISCV=243, zeroes .bss" },
  { id: "xmodem",        label: "XMODEM-1K receive protocol",         done: true,  tier: 2, category: "Execution Control",   description: "CRC-16/CCITT error detection, 1024-byte blocks" },
  { id: "crc32",         label: "CRC32 checksum on loaded images",    done: false, tier: 2, category: "Execution Control",   description: "Post-load integrity check before jumping" },

  // Tier 3 — Advanced Debugging
  { id: "pmp",           label: "PMP: lock monitor memory",           done: true,  tier: 3, category: "RISC-V Specifics",    description: "Region 0 = R+X only; payload region = R+W+X" },
  { id: "trap_full",     label: "Full trap handler (GPR + decode)",   done: true,  tier: 3, category: "RISC-V Specifics",    description: "Symbolic cause names, mepc/mtval/mstatus dump" },
  { id: "smp",           label: "Secondary hart park + wake-up",      done: false, tier: 3, category: "RISC-V Specifics",    description: "WFI spin loop; CLINT MSIP IPI to wake per-hart" },
  { id: "smode",         label: "S-mode delegation via mret",         done: false, tier: 3, category: "RISC-V Specifics",    description: "Set mstatus.MPP=01 + medeleg/mideleg, then mret" },
  { id: "singlestep",    label: "Single-step debugging",              done: false, tier: 3, category: "RISC-V Specifics",    description: "mstatus.MSTEP trap after every instruction" },
  { id: "disasm",        label: "Basic RV64I disassembler",           done: false, tier: 3, category: "RISC-V Specifics",    description: "Decodes opcode fields and prints mnemonic + operands" },
  { id: "breakpoints",   label: "Hardware breakpoints (tselect)",     done: false, tier: 3, category: "RISC-V Specifics",    description: "Programs trigger CSRs: tselect/tdata1/tdata2" },

  // Tier 4 — Production Features
  { id: "hal",           label: "HAL: QEMU ↔ VisionFive 2 detect",  done: false, tier: 4, category: "Hardware Port",        description: "Runtime probe of UART scratch register to select board" },
  { id: "vf2_clk",       label: "VisionFive 2: PLL clock init",      done: false, tier: 4, category: "Hardware Port",        description: "JH7110 PLL0 → 1.5GHz CPU, PLL2 → 24MHz UART" },
  { id: "vf2_ddr",       label: "VisionFive 2: DDR size detection",  done: false, tier: 4, category: "Hardware Port",        description: "Read DDR controller registers to probe DRAM size" },
  { id: "sd_card",       label: "SD/MMC block read driver",          done: false, tier: 4, category: "Hardware Port",        description: "LBA sector reads; parse flat binary from partition 1" },
  { id: "dtb",           label: "DTB parse + modify for payload",    done: false, tier: 4, category: "Hardware Port",        description: "FDT compatible-string search; excise monitor region" },
  { id: "gdb_rsp",       label: "GDB RSP stub (optional)",           done: false, tier: 4, category: "Developer Experience", description: "Answers qSupported, g, G, m, M, c packets over UART" },
  { id: "circular_log",  label: "Circular log buffer",               done: false, tier: 4, category: "Developer Experience", description: "Ring buffer in SRAM; dump with 'log' command" },
  { id: "perf_counters", label: "Performance counters (cycle/instret)", done: false, tier: 4, category: "Developer Experience", description: "Read mcycle + minstret CSRs; show IPC estimate" },
];

export const categories = [
  "Core Infrastructure",
  "Execution Control",
  "RISC-V Specifics",
  "Hardware Port",
  "Developer Experience",
];

export const tierInfo = {
  1: { label: "Tier 1", subtitle: "Bare Metal Foundation",        color: "emerald", icon: "🏆", weekGoal: "Get this running first" },
  2: { label: "Tier 2", subtitle: "Essential Monitor Features",   color: "blue",    icon: "🔥", weekGoal: "Week 1 goal" },
  3: { label: "Tier 3", subtitle: "Advanced Debugging",           color: "violet",  icon: "⚡", weekGoal: "Week 2 goal" },
  4: { label: "Tier 4", subtitle: "Production Features",          color: "amber",   icon: "🎯", weekGoal: "Week 3+ goal" },
} as const;
