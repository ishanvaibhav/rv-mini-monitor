import { useState } from "react";
import { codeSnippets } from "../data/codeSnippets";

type SnippetKey = keyof typeof codeSnippets;

const snippetKeys: SnippetKey[] = [
  "boot_asm",
  "uart_driver",
  "shell",
  "elf_loader",
  "xmodem",
  "trap_handler",
  "pmp",
  "hal",
];

function highlight(code: string): React.ReactNode[] {
  const lines = code.split("\n");
  return lines.map((line, i) => {
    // Very lightweight syntax highlighting for C
    let parts: React.ReactNode[] = [];
    let rest = line;

    // Comments
    if (rest.includes("//")) {
      const idx = rest.indexOf("//");
      const before = rest.slice(0, idx);
      const comment = rest.slice(idx);
      parts = [
        ...tokenizeLine(before),
        <span key="comment" className="text-gray-500 italic">{comment}</span>,
      ];
    } else {
      parts = tokenizeLine(rest);
    }

    return (
      <div key={i} className="flex group">
        <span className="select-none w-8 shrink-0 text-right pr-3 text-gray-700 group-hover:text-gray-500 text-xs leading-5">
          {i + 1}
        </span>
        <span className="flex-1 leading-5 text-xs">{parts}</span>
      </div>
    );
  });
}

function tokenizeLine(line: string): React.ReactNode[] {
  const preprocessor = /^(#\w+)/;

  // Check preprocessor directive
  const ppMatch = line.match(preprocessor);
  if (ppMatch) {
    const rest = line.slice(ppMatch[1].length);
    return [
      <span key="pp" className="text-violet-400">{ppMatch[1]}</span>,
      <span key="rest" className="text-amber-300">{rest}</span>,
    ];
  }

  // Assembly instructions (lines starting with whitespace + mnemonic)
  const asmMatch = line.match(/^(\s+)(csrr|csrw|csrrs|csrrc|la|li|mv|addi|sd|ld|call|j|bnez|beq|blt|wfi|mret|jalr|auipc|lw|sw|sb|lb|add|sub|and|or|xor|sll|srl|sra)\b/);
  if (asmMatch) {
    return [
      <span key="indent">{asmMatch[1]}</span>,
      <span key="mnem" className="text-cyan-300 font-semibold">{asmMatch[2]}</span>,
      <span key="rest" className="text-amber-200">{line.slice(asmMatch[1].length + asmMatch[2].length)}</span>,
    ];
  }

  // Labels in assembly
  const labelMatch = line.match(/^(_\w+|[a-zA-Z]\w*):/);
  if (labelMatch) {
    return [
      <span key="label" className="text-yellow-400">{labelMatch[0]}</span>,
      <span key="rest" className="text-gray-300">{line.slice(labelMatch[0].length)}</span>,
    ];
  }

  // Regular C line — tokenize keywords, numbers, strings
  const result: React.ReactNode[] = [];
  let src = line;
  let key = 0;

  while (src.length) {
    // String literal
    const sm = src.match(/^"[^"]*"/);
    if (sm) {
      result.push(<span key={key++} className="text-orange-300">{sm[0]}</span>);
      src = src.slice(sm[0].length);
      continue;
    }

    // Keyword
    const km = src.match(/^(if|else|while|for|return|typedef|struct|void|int|char|bool|uint8_t|uint16_t|uint32_t|uint64_t|uintptr_t|size_t|const|static|true|false|NULL|break|continue|int64_t|volatile)\b/);
    if (km) {
      result.push(<span key={key++} className="text-pink-400">{km[0]}</span>);
      src = src.slice(km[0].length);
      continue;
    }

    // Number literal
    const nm = src.match(/^(0x[0-9a-fA-F]+|\d+)/);
    if (nm) {
      result.push(<span key={key++} className="text-blue-300">{nm[0]}</span>);
      src = src.slice(nm[0].length);
      continue;
    }

    // Function call (word followed by '(')
    const fm = src.match(/^([a-zA-Z_]\w*)(?=\s*\()/);
    if (fm) {
      result.push(<span key={key++} className="text-yellow-300">{fm[0]}</span>);
      src = src.slice(fm[0].length);
      continue;
    }

    // Macro / uppercase identifier
    const mm = src.match(/^([A-Z_][A-Z0-9_]{2,})\b/);
    if (mm) {
      result.push(<span key={key++} className="text-teal-300">{mm[0]}</span>);
      src = src.slice(mm[0].length);
      continue;
    }

    result.push(<span key={key++} className="text-gray-300">{src[0]}</span>);
    src = src.slice(1);
  }

  return result;
}

export default function CodeViewer() {
  const [activeKey, setActiveKey] = useState<SnippetKey>("boot_asm");
  const [copied, setCopied] = useState(false);

  const snippet = codeSnippets[activeKey];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden border border-gray-700">
      {/* File tabs */}
      <div className="flex overflow-x-auto bg-gray-900 border-b border-gray-700">
        {snippetKeys.map(k => (
          <button
            key={k}
            onClick={() => setActiveKey(k)}
            className={`px-3 py-2 text-xs font-mono whitespace-nowrap transition-colors border-r border-gray-700 ${
              activeKey === k
                ? "bg-gray-800 text-emerald-400"
                : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/40"
            }`}
          >
            {codeSnippets[k].title.split(" — ")[0]}
          </button>
        ))}
      </div>

      {/* Title + copy */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <span className="text-xs font-mono text-gray-300">{snippet.title}</span>
        <button
          onClick={handleCopy}
          className="text-xs font-mono text-gray-500 hover:text-emerald-400 transition-colors px-2 py-1 rounded bg-gray-700/50 hover:bg-gray-700"
        >
          {copied ? "✓ Copied!" : "Copy"}
        </button>
      </div>

      {/* Code */}
      <div className="flex-1 overflow-auto bg-gray-950 p-4 font-mono min-h-0">
        <div className="space-y-0">
          {highlight(snippet.code)}
        </div>
      </div>
    </div>
  );
}
