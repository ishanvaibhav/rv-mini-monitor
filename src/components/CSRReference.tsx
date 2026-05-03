interface CSR {
  name: string;
  addr: string;
  rw: "RW" | "RO" | "WARL";
  desc: string;
  bits: { range: string; name: string; note: string }[];
}

const csrs: CSR[] = [
  {
    name: "mstatus",
    addr: "0x300",
    rw: "RW",
    desc: "Machine Status Register — global privilege mode, interrupt enables, previous state",
    bits: [
      { range: "[12:11]", name: "MPP",  note: "Previous privilege mode: 11=M, 01=S, 00=U" },
      { range: "[7]",     name: "MPIE", note: "M-mode Interrupt Enable before trap" },
      { range: "[3]",     name: "MIE",  note: "M-mode Global Interrupt Enable (clear before jump)" },
    ],
  },
  {
    name: "mtvec",
    addr: "0x305",
    rw: "WARL",
    desc: "Machine Trap-Vector Base — trap handler address + mode (0=direct, 1=vectored)",
    bits: [
      { range: "[63:2]", name: "BASE",  note: "4-byte aligned trap handler address >> 2" },
      { range: "[1:0]",  name: "MODE",  note: "0=Direct (all traps → BASE), 1=Vectored" },
    ],
  },
  {
    name: "mepc",
    addr: "0x341",
    rw: "RW",
    desc: "Machine Exception Program Counter — PC at time of trap; mret jumps here",
    bits: [
      { range: "[63:0]", name: "EPC", note: "Set by hardware on trap; modify to resume at different PC" },
    ],
  },
  {
    name: "mcause",
    addr: "0x342",
    rw: "RW",
    desc: "Machine Cause Register — identifies the trap source",
    bits: [
      { range: "[63]",    name: "Interrupt", note: "1 = interrupt, 0 = exception" },
      { range: "[62:0]",  name: "Code",      note: "2=Illegal Inst, 5=Load Fault, 8=Ecall-U…" },
    ],
  },
  {
    name: "mtval",
    addr: "0x343",
    rw: "RW",
    desc: "Machine Trap Value — bad address (faults) or instruction bits (illegal inst)",
    bits: [
      { range: "[63:0]", name: "Value", note: "Faulting virtual address or instruction encoding" },
    ],
  },
  {
    name: "mhartid",
    addr: "0xF14",
    rw: "RO",
    desc: "Hart ID — unique identifier per hardware thread (0 = primary)",
    bits: [
      { range: "[63:0]", name: "ID", note: "QEMU virt: 0–7 for 8-core config" },
    ],
  },
  {
    name: "pmpcfg0",
    addr: "0x3A0",
    rw: "WARL",
    desc: "PMP Config 0 — permissions for PMP entries 0–7 (1 byte each)",
    bits: [
      { range: "[7]",   name: "L",    note: "Lock: region applies to M-mode too; survives writes" },
      { range: "[4:3]", name: "A",    note: "0=OFF, 1=TOR, 2=NA4, 3=NAPOT" },
      { range: "[2]",   name: "X",    note: "Execute permission" },
      { range: "[1]",   name: "W",    note: "Write permission" },
      { range: "[0]",   name: "R",    note: "Read permission" },
    ],
  },
  {
    name: "mcycle",
    addr: "0xB00",
    rw: "RW",
    desc: "Machine Cycle Counter — clock cycles since reset (64-bit, wraps)",
    bits: [
      { range: "[63:0]", name: "Cycles", note: "Use for timeout: deadline = mcycle + (ms * freq/1000)" },
    ],
  },
  {
    name: "minstret",
    addr: "0xB02",
    rw: "RW",
    desc: "Machine Instructions Retired — instructions committed (IPC = minstret/mcycle)",
    bits: [
      { range: "[63:0]", name: "Instret", note: "Counts instructions, not cycles; pair with mcycle for IPC" },
    ],
  },
];

export default function CSRReference() {
  return (
    <div className="space-y-2">
      {csrs.map(csr => (
        <details key={csr.name} className="group rounded-lg border border-gray-800 bg-gray-900/60 overflow-hidden">
          <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-800/50 transition-colors list-none">
            <span className="text-xs text-gray-500 group-open:rotate-90 transition-transform">▶</span>
            <code className="font-mono text-sm text-violet-300 font-bold min-w-24">{csr.name}</code>
            <code className="font-mono text-xs text-gray-500">{csr.addr}</code>
            <span className={`text-xs px-1.5 py-0.5 rounded font-mono ml-1 ${
              csr.rw === "RO"   ? "bg-gray-700 text-gray-400" :
              csr.rw === "WARL" ? "bg-amber-900/50 text-amber-400" :
                                  "bg-blue-900/50 text-blue-400"
            }`}>{csr.rw}</span>
            <span className="text-xs text-gray-500 ml-auto hidden sm:block">{csr.desc.split(" — ")[0]}</span>
          </summary>
          <div className="px-4 pb-4 pt-2 border-t border-gray-800 space-y-3">
            <p className="text-xs text-gray-400 font-mono">{csr.desc}</p>
            <div className="space-y-1.5">
              {csr.bits.map(b => (
                <div key={b.name} className="flex items-start gap-3 text-xs font-mono">
                  <code className="text-amber-300 shrink-0 w-16 text-right">{b.range}</code>
                  <code className="text-cyan-300 shrink-0 w-12">{b.name}</code>
                  <span className="text-gray-500">{b.note}</span>
                </div>
              ))}
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}
