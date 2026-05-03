interface Region {
  start: string;
  end: string;
  label: string;
  sub?: string;
  color: string;
  textColor: string;
  heightPct: number; // relative visual height
  note?: string;
}

const regions: Region[] = [
  {
    start: "0x0000_0000",
    end:   "0x01FF_FFFF",
    label: "ROM / Boot",
    sub:   "QEMU BootROM",
    color: "bg-gray-700",
    textColor: "text-gray-300",
    heightPct: 3,
    note: "Read-only; QEMU jumps here first",
  },
  {
    start: "0x0200_0000",
    end:   "0x0200_FFFF",
    label: "CLINT",
    sub:   "Core Local Interruptor",
    color: "bg-purple-900/60",
    textColor: "text-purple-300",
    heightPct: 2,
    note: "mtime, mtimecmp, msip — used for IPI",
  },
  {
    start: "0x0C00_0000",
    end:   "0x0FFF_FFFF",
    label: "PLIC",
    sub:   "Platform-Level Interrupt Controller",
    color: "bg-indigo-900/60",
    textColor: "text-indigo-300",
    heightPct: 2,
    note: "External interrupt routing",
  },
  {
    start: "0x1000_0000",
    end:   "0x1000_00FF",
    label: "UART0",
    sub:   "16550-compatible",
    color: "bg-amber-900/60",
    textColor: "text-amber-300",
    heightPct: 2,
    note: "THR/RBR at +0x00, LSR at +0x05",
  },
  {
    start: "0x8000_0000",
    end:   "0x800F_FFFF",
    label: "Monitor",
    sub:   "M-Mode monitor code+data",
    color: "bg-emerald-900/80",
    textColor: "text-emerald-300",
    heightPct: 10,
    note: "PMP locked R+X only. Stack at top.",
  },
  {
    start: "0x8010_0000",
    end:   "0x87EF_FFFF",
    label: "Payload Area",
    sub:   "ELF/XMODEM staging",
    color: "bg-blue-900/60",
    textColor: "text-blue-300",
    heightPct: 28,
    note: "PMP: R+W+X. ELF loads here.",
  },
  {
    start: "0x87F0_0000",
    end:   "0x87FF_FFFF",
    label: "DTB",
    sub:   "Device Tree Blob (QEMU)",
    color: "bg-violet-900/60",
    textColor: "text-violet-300",
    heightPct: 3,
    note: "Passed in a1 by QEMU/BootROM",
  },
  {
    start: "0x8800_0000",
    end:   "0x8FFF_FFFF",
    label: "Free DRAM",
    sub:   "Available to OS / payload",
    color: "bg-gray-800/40",
    textColor: "text-gray-500",
    heightPct: 14,
    note: "Unused by monitor",
  },
];

export default function MemoryMap() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-4">
        {/* Address column */}
        <div className="flex flex-col text-xs font-mono text-gray-500 w-28 shrink-0 select-none">
          {regions.map(r => (
            <div
              key={r.label}
              className="flex items-start"
              style={{ height: `${r.heightPct * 18}px` }}
            >
              <div className="pt-0.5">{r.start}</div>
            </div>
          ))}
          <div className="text-xs font-mono text-gray-500">0x9000_0000+</div>
        </div>

        {/* Bar column */}
        <div className="flex flex-col flex-1 min-w-0 rounded overflow-hidden border border-gray-700">
          {regions.map(r => (
            <div
              key={r.label}
              className={`${r.color} border-b border-gray-700/50 px-3 py-1 group relative cursor-default`}
              style={{ height: `${r.heightPct * 18}px` }}
            >
              <div className="flex items-center justify-between h-full">
                <div className="min-w-0">
                  <div className={`text-xs font-bold font-mono truncate ${r.textColor}`}>
                    {r.label}
                  </div>
                  {r.heightPct > 3 && (
                    <div className="text-xs text-gray-500 truncate">{r.sub}</div>
                  )}
                </div>
                {r.note && r.heightPct > 5 && (
                  <div className="hidden group-hover:block absolute right-2 top-1/2 -translate-y-1/2 z-10
                    bg-gray-900 border border-gray-600 text-gray-300 text-xs px-2 py-1 rounded
                    max-w-48 shadow-xl pointer-events-none">
                    {r.note}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        {[
          { color: "bg-emerald-900/80",  label: "Monitor (PMP: R+X locked)" },
          { color: "bg-blue-900/60",     label: "Payload (PMP: R+W+X)" },
          { color: "bg-amber-900/60",    label: "MMIO Peripherals" },
          { color: "bg-purple-900/60",   label: "CLINT / PLIC" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-sm ${l.color} border border-gray-600 shrink-0`} />
            <span className="text-gray-400">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
