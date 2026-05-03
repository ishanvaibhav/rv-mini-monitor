interface Phase {
  id: number;
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  borderColor: string;
  bgColor: string;
  features: string[];
  milestone: string;
  status: "complete" | "in-progress" | "planned";
}

const phases: Phase[] = [
  {
    id: 1,
    icon: "🏆",
    title: "Phase 1",
    subtitle: "MVP — Bare-Metal Competence",
    color: "text-emerald-400",
    borderColor: "border-emerald-700",
    bgColor: "bg-emerald-950/40",
    status: "complete",
    milestone: "See 'Survived the trap!' printed on UART",
    features: [
      "Bidirectional UART driver (polling + timeout)",
      "Interactive CLI with h, x, w, j, r, reboot",
      "XMODEM-1K binary loader over UART",
      "ELF64 parser (magic, EM_RISCV, PT_LOAD, .bss zero)",
      "Stack frame for payloads (a0=hartid, a1=DTB)",
      "Boot sequence from M-Mode entry at 0x80000000",
    ],
  },
  {
    id: 2,
    icon: "🔥",
    title: "Phase 2",
    subtitle: "Robust Monitor — Mentorship Quality",
    color: "text-blue-400",
    borderColor: "border-blue-700",
    bgColor: "bg-blue-950/40",
    status: "in-progress",
    milestone: "ELF-load a 'Hello World' independently compiled payload",
    features: [
      "ELF64 parser (p_vaddr vs p_paddr distinction)",
      "PMP: lock monitor R+X, payload R+W+X",
      "Trap handler: symbolic decode + full GPR dump",
      "Multi-hart bring-up via CLINT MSIP IPI",
      "Single-step debugging (mstatus.MSTEP)",
      "CRC32 post-load integrity check",
    ],
  },
  {
    id: 3,
    icon: "🚀",
    title: "Phase 3",
    subtitle: "VisionFive 2 Hardware Port",
    color: "text-violet-400",
    borderColor: "border-violet-700",
    bgColor: "bg-violet-950/40",
    status: "planned",
    milestone: "Boot on real RISC-V silicon — VisionFive 2",
    features: [
      "HAL struct: QEMU virt ↔ VisionFive 2 (JH7110)",
      "JH7110 PLL init: 1.5 GHz CPU, 24 MHz UART",
      "DDR size detection via memory controller CSRs",
      "SD/MMC block-read driver (SDIO or SPI)",
      "DTB parse & modify (excise monitor region)",
      "GDB RSP stub — target remote /dev/ttyUSB0",
    ],
  },
];

const statusStyles = {
  "complete":    "bg-emerald-500/20 text-emerald-400 border-emerald-600",
  "in-progress": "bg-blue-500/20 text-blue-400 border-blue-600",
  "planned":     "bg-gray-700/40 text-gray-400 border-gray-600",
};

const statusLabels = {
  "complete":    "✓ Complete",
  "in-progress": "⚡ In Progress",
  "planned":     "○ Planned",
};

export default function RoadmapPhases() {
  return (
    <div className="space-y-6">
      {phases.map((phase, idx) => (
        <div key={phase.id} className="relative">
          {/* Connector line */}
          {idx < phases.length - 1 && (
            <div className="absolute left-6 top-full w-0.5 h-6 bg-gradient-to-b from-gray-600 to-transparent z-0" />
          )}

          <div className={`rounded-xl border ${phase.borderColor} ${phase.bgColor} overflow-hidden`}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{phase.icon}</span>
                <div>
                  <div className={`text-sm font-bold ${phase.color}`}>{phase.title}</div>
                  <div className="text-xs text-gray-400">{phase.subtitle}</div>
                </div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full border font-mono ${statusStyles[phase.status]}`}>
                {statusLabels[phase.status]}
              </span>
            </div>

            {/* Feature list */}
            <div className="px-5 py-4 grid gap-2">
              {phase.features.map(f => (
                <div key={f} className="flex items-start gap-2 text-xs">
                  <span className={`mt-0.5 shrink-0 ${
                    phase.status === "complete" ? "text-emerald-400" :
                    phase.status === "in-progress" ? "text-blue-400" : "text-gray-600"
                  }`}>
                    {phase.status === "complete" ? "✓" : phase.status === "in-progress" ? "◌" : "·"}
                  </span>
                  <span className={`font-mono ${
                    phase.status === "complete" ? "text-gray-300" : "text-gray-400"
                  }`}>{f}</span>
                </div>
              ))}
            </div>

            {/* Milestone */}
            <div className="px-5 pb-4">
              <div className={`text-xs font-mono rounded px-3 py-2 border ${
                phase.status === "complete"
                  ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                  : "bg-gray-900/60 border-gray-700 text-gray-400"
              }`}>
                <span className="text-gray-500">Milestone: </span>{phase.milestone}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
