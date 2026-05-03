import { useState } from "react";
import Terminal from "./components/Terminal";
import MemoryMap from "./components/MemoryMap";
import FeatureChecklist from "./components/FeatureChecklist";
import CodeViewer from "./components/CodeViewer";
import RoadmapPhases from "./components/RoadmapPhases";
import CommandRef from "./components/CommandRef";
import CSRReference from "./components/CSRReference";
import type { SessionKey } from "./data/terminalSessions";
import type { Feature } from "./data/features";
import { features } from "./data/features";

type Tab = "terminal" | "roadmap" | "checklist" | "code" | "memory" | "commands" | "csrs";

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: "terminal",  label: "Terminal",   icon: "⬛" },
  { key: "roadmap",   label: "Roadmap",    icon: "🗺" },
  { key: "checklist", label: "Features",   icon: "✅" },
  { key: "code",      label: "Source",     icon: "📄" },
  { key: "memory",    label: "Memory Map", icon: "🗂" },
  { key: "commands",  label: "Commands",   icon: "⌨" },
  { key: "csrs",      label: "CSRs",       icon: "🔧" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("terminal");
  const [termSession, setTermSession] = useState<SessionKey>("boot");
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);

  const done  = features.filter(f => f.done).length;
  const total = features.length;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-900/50 shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-1 14H5V7h14v11zm-7-1l-4-4 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z"/>
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold font-mono text-white leading-none">RV-Mini-Monitor</div>
              <div className="text-xs text-gray-500 font-mono leading-none mt-0.5">RISC-V M-Mode Bare-Metal Monitor</div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-400 border border-emerald-800">
              QEMU virt
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-violet-900/60 text-violet-400 border border-violet-800">
              VisionFive 2
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-400 border border-blue-800">
              RV64IMAC
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-400 border border-amber-800">
              M-Mode
            </span>
          </div>

          {/* Progress pill */}
          <div className="ml-auto flex items-center gap-2 text-xs font-mono">
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-gray-500">Progress:</span>
              <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                  style={{ width: `${Math.round(done / total * 100)}%` }}
                />
              </div>
              <span className="text-emerald-400">{done}/{total}</span>
            </div>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-gray-300 hover:text-white border border-gray-700"
            >
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              GitHub
            </a>
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-screen-xl mx-auto px-4 flex gap-0 overflow-x-auto border-t border-gray-800/50">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-mono whitespace-nowrap border-b-2 transition-colors ${
                activeTab === t.key
                  ? "border-emerald-500 text-emerald-400 bg-gray-800/40"
                  : "border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600"
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────── */}
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 py-6">

        {/* TERMINAL TAB */}
        {activeTab === "terminal" && (
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 h-[calc(100vh-180px)]">
            {/* Terminal (3/5) */}
            <div className="xl:col-span-3 h-full min-h-[500px]">
              <Terminal activeSession={termSession} onSessionChange={setTermSession} />
            </div>

            {/* Right sidebar */}
            <div className="xl:col-span-2 flex flex-col gap-4 overflow-y-auto">
              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "UART Base",   value: "0x10000000", sub: "16550-compat" },
                  { label: "Monitor",     value: "0x80000000", sub: "1 MB R+X" },
                  { label: "Payload",     value: "0x80100000", sub: "127 MB R+W+X" },
                  { label: "CLINT",       value: "0x02000000", sub: "mtime + IPI" },
                ].map(s => (
                  <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5">
                    <div className="text-xs text-gray-500 font-mono">{s.label}</div>
                    <div className="text-sm font-mono text-emerald-400 font-bold">{s.value}</div>
                    <div className="text-xs text-gray-600 font-mono">{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Session info box */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                <div className="text-xs font-mono text-gray-400 font-bold uppercase tracking-widest">
                  Session Info
                </div>
                {termSession === "boot" && (
                  <div className="text-xs font-mono text-gray-400 space-y-1.5">
                    <p>The boot sequence starts at <code className="text-emerald-300">_start</code> in <code className="text-emerald-300">boot.S</code>.</p>
                    <p>Hart 0 sets up the stack, clears BSS, installs the trap vector at <code className="text-emerald-300">mtvec</code>, then calls <code className="text-emerald-300">monitor_main()</code>.</p>
                    <p>Secondary harts 1–7 enable <code className="text-emerald-300">MSIE</code> and spin in <code className="text-emerald-300">wfi</code>.</p>
                  </div>
                )}
                {termSession === "help" && (
                  <div className="text-xs font-mono text-gray-400 space-y-1.5">
                    <p>The CLI uses a blocking read loop. Each character is echoed immediately.</p>
                    <p>Backspace (<code className="text-amber-300">0x7F</code>) is handled by sending <code className="text-amber-300">\b \b</code> to erase the character on the terminal.</p>
                  </div>
                )}
                {termSession === "hexdump" && (
                  <div className="text-xs font-mono text-gray-400 space-y-1.5">
                    <p>The <code className="text-cyan-300">x</code> command reads memory byte-by-byte and formats in 16-column rows with ASCII sidebar.</p>
                    <p>Writing <code className="text-amber-300">0x41</code> to UART THR (<code className="text-amber-300">0x10000000</code>) prints <code className="text-emerald-300">'A'</code>.</p>
                  </div>
                )}
                {termSession === "elf_load" && (
                  <div className="text-xs font-mono text-gray-400 space-y-1.5">
                    <p>XMODEM-1K sends 1024-byte blocks with CRC-16/CCITT error detection.</p>
                    <p>After transfer, the ELF header is parsed: magic checked, <code className="text-violet-300">EM_RISCV=243</code> verified, <code className="text-blue-300">PT_LOAD</code> segments copied, <code className="text-amber-300">.bss</code> zeroed.</p>
                  </div>
                )}
                {termSession === "trap" && (
                  <div className="text-xs font-mono text-gray-400 space-y-1.5">
                    <p>All 32 GPRs are saved to a <code className="text-violet-300">trap_frame_t</code> on the stack before calling <code className="text-yellow-300">trap_handler()</code>.</p>
                    <p>After printing the diagnostic, the monitor returns to the prompt via <code className="text-emerald-300">mret</code> — no reboot needed.</p>
                  </div>
                )}
                {termSession === "regs" && (
                  <div className="text-xs font-mono text-gray-400 space-y-1.5">
                    <p>GPRs are read from the live trap frame. CSRs are read with <code className="text-violet-300">csrr</code> instructions inline.</p>
                    <p><code className="text-amber-300">minstret/mcycle</code> give IPC: <span className="text-emerald-300">0.93</span> for this session (typical M-mode overhead).</p>
                  </div>
                )}
                {termSession === "pmp" && (
                  <div className="text-xs font-mono text-gray-400 space-y-1.5">
                    <p>PMP uses NAPOT (Naturally Aligned Power Of Two) encoding.</p>
                    <p>The <code className="text-violet-300">L</code> (Lock) bit means even M-mode cannot write to the monitor region — protects the trap vector from buggy payloads.</p>
                  </div>
                )}
                {termSession === "xmodem" && (
                  <div className="text-xs font-mono text-gray-400 space-y-1.5">
                    <p>XMODEM-1K uses <code className="text-cyan-300">STX</code> (0x02) to start 1 KB blocks instead of <code className="text-cyan-300">SOH</code> (0x01) for 128-byte blocks.</p>
                    <p>Error detection uses CRC-16/CCITT (poly 0x1021). Up to 10 retries per block before cancelling.</p>
                  </div>
                )}
              </div>

              {/* Keyboard shortcut hint */}
              <div className="text-xs font-mono text-gray-600 text-center">
                Click a session tab above the terminal • Type in the terminal after replay finishes
              </div>
            </div>
          </div>
        )}

        {/* ROADMAP TAB */}
        {activeTab === "roadmap" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="mb-4">
                <h2 className="text-lg font-bold font-mono text-white">Implementation Roadmap</h2>
                <p className="text-sm text-gray-500 font-mono mt-1">Three phases from proof-of-concept to hardware-ported bootloader</p>
              </div>
              <RoadmapPhases />
            </div>
            <div className="space-y-4">
              {/* Milestone checklist */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="text-xs font-mono text-gray-400 font-bold uppercase tracking-widest mb-4">
                  Week-by-Week Goals
                </div>
                <div className="space-y-4">
                  {[
                    {
                      week: "Week 1",
                      color: "emerald",
                      items: [
                        "Tier 1 boots, illegal inst trap caught",
                        "UART RX works (echo characters)",
                        "ELF loader jumps to test binary",
                        "Shell: h, x, w, j, r, reboot",
                        "Memory dump command",
                        "GitHub repo + README + QEMU screenshot",
                      ],
                      done: true,
                    },
                    {
                      week: "Week 2",
                      color: "blue",
                      items: [
                        "Single-step debugging via mstatus",
                        "Symbolic trap cause decode",
                        "XMODEM-1K transfer works",
                        "PMP: monitor region locked",
                        "Secondary hart WFI + IPI wake",
                      ],
                      done: false,
                    },
                    {
                      week: "Week 3+",
                      color: "violet",
                      items: [
                        "GDB RSP stub (qSupported, g, m)",
                        "VisionFive 2: UART at 0x10010000",
                        "JH7110 PLL init code",
                        "SD card block read",
                        "DTB parse for UART/memory nodes",
                      ],
                      done: false,
                    },
                  ].map(w => (
                    <div key={w.week} className="space-y-2">
                      <div className={`text-xs font-mono font-bold text-${w.color}-400`}>{w.week}</div>
                      {w.items.map(item => (
                        <div key={item} className="flex items-start gap-2 text-xs font-mono">
                          <span className={w.done ? "text-emerald-400" : "text-gray-600"}>
                            {w.done ? "✓" : "○"}
                          </span>
                          <span className={w.done ? "text-gray-300" : "text-gray-500"}>{item}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Mentorship metrics */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="text-xs font-mono text-gray-400 font-bold uppercase tracking-widest mb-4">
                  Mentorship Metrics
                </div>
                <div className="space-y-3">
                  {[
                    { label: "QEMU virt",          value: "100%",        color: "text-emerald-400" },
                    { label: "VisionFive 2",        value: "UART shell",  color: "text-blue-400" },
                    { label: "GitHub potential",    value: "500+ ⭐",     color: "text-yellow-400" },
                    { label: "GDB integration",     value: "RSP stub",    color: "text-violet-400" },
                    { label: "ELF loader",          value: "Linux hello", color: "text-cyan-400" },
                  ].map(m => (
                    <div key={m.label} className="flex justify-between items-center text-xs font-mono">
                      <span className="text-gray-500">{m.label}</span>
                      <span className={m.color}>{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FEATURES TAB */}
        {activeTab === "checklist" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-180px)]">
            <div className="lg:col-span-2 h-full flex flex-col">
              <div className="mb-4">
                <h2 className="text-lg font-bold font-mono text-white">Feature Checklist</h2>
                <p className="text-sm text-gray-500 font-mono mt-1">Click a feature to see implementation details</p>
              </div>
              <div className="flex-1 min-h-0">
                <FeatureChecklist
                  onFeatureSelect={setSelectedFeature}
                  selectedFeatureId={selectedFeature?.id ?? null}
                />
              </div>
            </div>
            <div>
              {selectedFeature ? (
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-4 sticky top-24">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded font-mono ${
                      selectedFeature.tier === 1 ? "bg-emerald-900/60 text-emerald-400" :
                      selectedFeature.tier === 2 ? "bg-blue-900/60 text-blue-400" :
                      selectedFeature.tier === 3 ? "bg-violet-900/60 text-violet-400" :
                      "bg-amber-900/60 text-amber-400"
                    }`}>
                      Tier {selectedFeature.tier}
                    </span>
                    <span className={`text-xs font-mono ${selectedFeature.done ? "text-emerald-400" : "text-gray-500"}`}>
                      {selectedFeature.done ? "✓ Implemented" : "○ Pending"}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-mono font-bold text-white">{selectedFeature.label}</div>
                    <div className="text-xs text-gray-500 font-mono mt-1">{selectedFeature.category}</div>
                  </div>
                  <p className="text-xs text-gray-400 font-mono leading-relaxed">{selectedFeature.description}</p>
                  <div className="text-xs text-gray-600 font-mono">
                    ID: <code className="text-gray-500">{selectedFeature.id}</code>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900/50 border border-gray-800 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3 sticky top-24">
                  <div className="text-3xl">👆</div>
                  <div className="text-sm font-mono text-gray-500">Select a feature to see details</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CODE TAB */}
        {activeTab === "code" && (
          <div className="h-[calc(100vh-180px)] flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold font-mono text-white">Source Code</h2>
                <p className="text-sm text-gray-500 font-mono mt-1">Key implementation files with syntax highlighting</p>
              </div>
              <div className="text-xs font-mono text-gray-600">
                riscv64-unknown-elf-gcc · -nostdlib · -mcmodel=medany
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <CodeViewer />
            </div>
          </div>
        )}

        {/* MEMORY MAP TAB */}
        {activeTab === "memory" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3">
              <div className="mb-4">
                <h2 className="text-lg font-bold font-mono text-white">Physical Memory Map</h2>
                <p className="text-sm text-gray-500 font-mono mt-1">QEMU virt — 128 MB DRAM + MMIO regions</p>
              </div>
              <MemoryMap />
            </div>
            <div className="lg:col-span-2 space-y-4">
              {/* Linker script */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-800 text-xs font-mono text-gray-300 font-bold">
                  link.ld — Linker Script
                </div>
                <div className="p-4 font-mono text-xs space-y-0 bg-gray-950">
                  {`MEMORY {
  /* Monitor lives in first 1MB */
  RAM (rwx) : ORIGIN = 0x80000000,
              LENGTH = 1M

  /* Payload loads here, after monitor */
  PAYLOAD (rwx) : ORIGIN = 0x80100000,
                  LENGTH = 127M
}

ENTRY(_start)

SECTIONS {
  .text : {
    *(.text.boot)   /* boot.S entry first */
    *(.text*)
  } > RAM

  .rodata : { *(.rodata*) } > RAM
  .data   : { *(.data*)   } > RAM

  .bss (NOLOAD) : {
    __bss_start = .;
    *(.bss*)
    *(COMMON)
    __bss_end = .;
  } > RAM

  _stack_top = ORIGIN(RAM) + LENGTH(RAM);
}`.split("\n").map((line, i) => {
                    const isComment = line.trim().startsWith("/*");
                    const isKeyword = /^(MEMORY|ENTRY|SECTIONS)\b/.test(line.trim());
                    return (
                      <div key={i} className="flex leading-5">
                        <span className="select-none w-6 text-right pr-2 text-gray-700 text-xs">{i + 1}</span>
                        <span className={
                          isComment ? "text-gray-500 italic" :
                          isKeyword ? "text-violet-400 font-bold" :
                          "text-gray-300"
                        }>{line || " "}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* PMP layout */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                <div className="text-xs font-mono text-gray-400 font-bold uppercase tracking-widest">
                  PMP Layout
                </div>
                <div className="space-y-2 font-mono text-xs">
                  {[
                    {
                      idx: "0",
                      range: "0x80000000 – 0x800FFFFF",
                      perms: "R+X",
                      label: "Monitor (LOCKED)",
                      color: "text-emerald-400",
                      bg: "bg-emerald-950/40",
                    },
                    {
                      idx: "1",
                      range: "0x80100000 – 0x87FFFFFF",
                      perms: "R+W+X",
                      label: "Payload",
                      color: "text-blue-400",
                      bg: "bg-blue-950/40",
                    },
                  ].map(p => (
                    <div key={p.idx} className={`${p.bg} rounded-lg px-3 py-2.5 border border-gray-800`}>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">#{p.idx}</span>
                        <span className={`font-bold ${p.color}`}>{p.label}</span>
                        <span className="ml-auto text-gray-500">{p.perms}</span>
                      </div>
                      <div className="text-gray-500 text-xs mt-1">{p.range}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* QEMU run command */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
                <div className="text-xs font-mono text-gray-400 font-bold uppercase tracking-widest">
                  Run on QEMU
                </div>
                <div className="bg-gray-950 rounded-lg p-3 font-mono text-xs text-emerald-300 break-all">
                  qemu-system-riscv64 \<br />
                  {"  "}-machine virt \<br />
                  {"  "}-m 128M \<br />
                  {"  "}-nographic \<br />
                  {"  "}-bios none \<br />
                  {"  "}-kernel mini_monitor.elf
                </div>
              </div>
            </div>
          </div>
        )}

        {/* COMMANDS TAB */}
        {activeTab === "commands" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-bold font-mono text-white">Command Reference</h2>
                <p className="text-sm text-gray-500 font-mono mt-1">Click any command to expand usage details</p>
              </div>
              <CommandRef />
            </div>
            <div className="space-y-4">
              {/* Quick-start guide */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="text-xs font-mono text-gray-400 font-bold uppercase tracking-widest mb-4">
                  Quick-Start Session
                </div>
                <div className="font-mono text-xs space-y-1 bg-gray-950 rounded-lg p-4">
                  {[
                    { prompt: true,  text: "h",                         comment: "# list commands" },
                    { prompt: false, text: "RV-Mini-Monitor v1.0 ...",  comment: "" },
                    { prompt: true,  text: "x 80000000 32",             comment: "# dump boot code" },
                    { prompt: false, text: "80000000: 13 04 ...",       comment: "" },
                    { prompt: true,  text: "r",                         comment: "# register dump" },
                    { prompt: false, text: "zero(x0): 0x000...",        comment: "" },
                    { prompt: true,  text: "load xmodem",               comment: "# receive ELF" },
                    { prompt: false, text: "XMODEM-1K ready...",        comment: "" },
                    { prompt: true,  text: "j 80200000",                comment: "# jump to payload" },
                    { prompt: false, text: "Hello from userland! 🎉",   comment: "" },
                  ].map((l, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {l.prompt ? (
                        <>
                          <span className="text-emerald-400">$</span>
                          <span className="text-cyan-300">{l.text}</span>
                          {l.comment && <span className="text-gray-600">{l.comment}</span>}
                        </>
                      ) : (
                        <span className="text-gray-400 pl-4">{l.text}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Build commands */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="text-xs font-mono text-gray-400 font-bold uppercase tracking-widest mb-4">
                  Makefile Targets
                </div>
                <div className="space-y-2">
                  {[
                    { cmd: "make qemu",        desc: "Build + run in QEMU virt" },
                    { cmd: "make vf2",         desc: "Build for VisionFive 2 (UART=0x10010000)" },
                    { cmd: "make clean",       desc: "Remove all build artifacts" },
                    { cmd: "make gdb",         desc: "Launch QEMU + GDB stub, wait on :1234" },
                    { cmd: "make flash",       desc: "Flash to VisionFive 2 via USB-UART" },
                  ].map(m => (
                    <div key={m.cmd} className="flex items-center gap-3 font-mono text-xs">
                      <code className="text-amber-300 min-w-36">{m.cmd}</code>
                      <span className="text-gray-500">{m.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Host tools */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="text-xs font-mono text-gray-400 font-bold uppercase tracking-widest mb-4">
                  Host Prerequisites
                </div>
                <div className="space-y-1.5 font-mono text-xs">
                  {[
                    "riscv64-unknown-elf-gcc   (cross-compiler)",
                    "qemu-system-riscv64       (emulator)",
                    "sx / lrzsz                (XMODEM sender)",
                    "riscv64-unknown-elf-gdb   (debugger)",
                    "minicom / picocom         (serial terminal)",
                  ].map(t => (
                    <div key={t} className="text-gray-400">• {t}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CSR TAB */}
        {activeTab === "csrs" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="mb-4">
                <h2 className="text-lg font-bold font-mono text-white">CSR Reference</h2>
                <p className="text-sm text-gray-500 font-mono mt-1">Control and Status Registers used by RV-Mini-Monitor</p>
              </div>
              <CSRReference />
            </div>
            <div className="space-y-4">
              {/* CSR access macros */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-800 text-xs font-mono text-gray-300 font-bold">
                  csr.h — Access Macros
                </div>
                <div className="p-4 font-mono text-xs bg-gray-950 space-y-0">
                  {`// Read CSR → variable
#define read_csr(reg) ({         \\
    uintptr_t _v;                \\
    asm volatile(                \\
        "csrr %0, " #reg         \\
        : "=r"(_v)               \\
    );                           \\
    _v;                          \\
})

// Write variable → CSR
#define write_csr(reg, val)      \\
    asm volatile(                \\
        "csrw " #reg ", %0"      \\
        :: "rK"((uintptr_t)(val))\\
    )

// Set bits in CSR (OR)
#define set_csr(reg, bits)       \\
    asm volatile(                \\
        "csrs " #reg ", %0"      \\
        :: "rK"((uintptr_t)(bits))\\
    )

// Clear bits in CSR (AND ~)
#define clear_csr(reg, bits)     \\
    asm volatile(                \\
        "csrc " #reg ", %0"      \\
        :: "rK"((uintptr_t)(bits))\\
    )`.split("\n").map((line, i) => (
                    <div key={i} className="flex leading-5">
                      <span className="select-none w-6 text-right pr-2 text-gray-700 text-xs">{i + 1}</span>
                      <span className={line.trim().startsWith("//") ? "text-gray-500 italic" : "text-gray-300"}>
                        {line || " "}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trap cause table */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-xs font-mono text-gray-400 font-bold uppercase tracking-widest mb-3">
                  Exception Codes (mcause[62:0])
                </div>
                <div className="space-y-1 font-mono text-xs">
                  {[
                    ["0",  "Instruction Address Misaligned"],
                    ["1",  "Instruction Access Fault"],
                    ["2",  "Illegal Instruction"],
                    ["3",  "Breakpoint (ebreak)"],
                    ["4",  "Load Address Misaligned"],
                    ["5",  "Load Access Fault"],
                    ["6",  "Store/AMO Misaligned"],
                    ["7",  "Store/AMO Access Fault"],
                    ["8",  "Ecall from U-mode"],
                    ["9",  "Ecall from S-mode"],
                    ["11", "Ecall from M-mode"],
                    ["12", "Instruction Page Fault"],
                    ["13", "Load Page Fault"],
                    ["15", "Store/AMO Page Fault"],
                  ].map(([code, name]) => (
                    <div key={code} className="flex items-center gap-3">
                      <code className="text-amber-300 w-5 text-right">{code}</code>
                      <span className="text-gray-400">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-gray-800 bg-gray-900/60 mt-6">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs font-mono text-gray-600">
            RV-Mini-Monitor · RISC-V M-Mode Bare-Metal Monitor · QEMU virt + VisionFive 2
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-gray-600">
            <span>rv64imac · mabi=lp64d · mcmodel=medany</span>
            <span>·</span>
            <span>Phase 1 Complete · Phase 2 In Progress</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
