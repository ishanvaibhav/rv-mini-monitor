export const codeSnippets: Record<string, { title: string; language: string; code: string }> = {
  uart_driver: {
    title: "uart.c — UART Driver",
    language: "c",
    code: `#define UART0_BASE  0x10000000UL
#define UART0_RBR   ((volatile uint8_t *)(UART0_BASE + 0x00)) // RX Buffer
#define UART0_THR   ((volatile uint8_t *)(UART0_BASE + 0x00)) // TX Holding
#define UART0_LSR   ((volatile uint8_t *)(UART0_BASE + 0x05)) // Line Status
#define LSR_DR      0x01  // Data Ready (bit 0)
#define LSR_THRE    0x20  // TX Holding Register Empty (bit 5)

// Blocking transmit — waits until UART is ready
void uart_putchar(char c) {
    while (!(*UART0_LSR & LSR_THRE));
    *UART0_THR = (uint8_t)c;
}

// Blocking receive — waits for data ready bit
char uart_getchar(void) {
    while (!(*UART0_LSR & LSR_DR));
    return (char)*UART0_RBR;
}

// Non-blocking receive with millisecond timeout
int uart_getchar_timeout(uint32_t ms) {
    uint64_t deadline = read_csr(mtime) + (ms * TIMER_FREQ / 1000);
    while (!(* UART0_LSR & LSR_DR)) {
        if (read_csr(mtime) >= deadline)
            return -1; // Timeout
    }
    return (int)(uint8_t)*UART0_RBR;
}

void uart_puts(const char *s) {
    while (*s) uart_putchar(*s++);
}`,
  },

  shell: {
    title: "shell.c — Interactive CLI",
    language: "c",
    code: `#define MAX_CMD  128
#define PROMPT   "rv-monitor> "

static char cmdline[MAX_CMD];

void shell_run(void) {
    uart_puts("\\r\\nRV-Mini-Monitor v1.0\\r\\n");
    uart_puts("Type 'h' for help\\r\\n\\r\\n");

    while (1) {
        uart_puts(PROMPT);
        int idx = 0;

        while (1) {
            char c = uart_getchar();
            if (c == '\\r' || c == '\\n') {
                uart_puts("\\r\\n");
                cmdline[idx] = '\\0';
                break;
            } else if ((c == 0x7F || c == 0x08) && idx > 0) {
                // Backspace
                uart_puts("\\b \\b");
                idx--;
            } else if (idx < MAX_CMD - 1) {
                cmdline[idx++] = c;
                uart_putchar(c); // Echo
            }
        }

        if (idx > 0)
            execute_command(cmdline);
    }
}

void execute_command(char *cmd) {
    char *tok = strtok(cmd, " ");
    if (!tok) return;

    if      (tok[0] == 'h') cmd_help();
    else if (tok[0] == 'x') cmd_hexdump(strtok(NULL," "), strtok(NULL," "));
    else if (tok[0] == 'w') cmd_write(strtok(NULL," "), strtok(NULL," "));
    else if (tok[0] == 'j') cmd_jump(strtok(NULL," "));
    else if (tok[0] == 'r') cmd_regs();
    else if (!strcmp(tok,"reboot")) cmd_reboot();
    else {
        uart_puts("Unknown command. Type 'h'\\r\\n");
    }
}`,
  },

  elf_loader: {
    title: "elf.c — ELF64 Loader",
    language: "c",
    code: `#define ELF_MAGIC    0x464C457F  // 0x7f 'E' 'L' 'F'
#define EM_RISCV     243
#define PT_LOAD      1

typedef struct {
    uint32_t e_ident_magic;
    uint8_t  e_ident_class;   // 2 = 64-bit
    uint8_t  e_ident_data;    // 1 = little-endian
    uint8_t  e_ident_version;
    uint8_t  e_ident_osabi;
    uint8_t  e_ident_pad[8];
    uint16_t e_type;
    uint16_t e_machine;       // Must be 243 (EM_RISCV)
    uint32_t e_version;
    uint64_t e_entry;         // Entry point virtual address
    uint64_t e_phoff;         // Program header table offset
    uint64_t e_shoff;
    uint32_t e_flags;
    uint16_t e_ehsize;
    uint16_t e_phentsize;
    uint16_t e_phnum;         // Number of program headers
} __attribute__((packed)) Elf64_Ehdr;

typedef struct {
    uint32_t p_type;
    uint32_t p_flags;
    uint64_t p_offset;   // Offset in file
    uint64_t p_vaddr;    // Virtual address
    uint64_t p_paddr;    // Physical address ← use this for bare-metal
    uint64_t p_filesz;
    uint64_t p_memsz;    // memsz > filesz means zero out the rest (.bss)
    uint64_t p_align;
} __attribute__((packed)) Elf64_Phdr;

bool elf_load(uint8_t *data, elf_info_t *info) {
    Elf64_Ehdr *ehdr = (Elf64_Ehdr *)data;

    // Validate ELF magic and architecture
    if (ehdr->e_ident_magic != ELF_MAGIC)  return false;
    if (ehdr->e_machine != EM_RISCV)       return false;
    if (ehdr->e_ident_class != 2)          return false;

    info->entry = ehdr->e_entry;
    info->is_valid = true;

    // Walk program headers and load PT_LOAD segments
    for (int i = 0; i < ehdr->e_phnum; i++) {
        Elf64_Phdr *phdr = (Elf64_Phdr *)(data + ehdr->e_phoff
                           + i * ehdr->e_phentsize);
        if (phdr->p_type != PT_LOAD) continue;

        // Copy segment content (filesz bytes)
        memcpy((void *)phdr->p_paddr,
               data + phdr->p_offset,
               phdr->p_filesz);

        // Zero-fill remainder — this clears .bss
        if (phdr->p_memsz > phdr->p_filesz) {
            memset((void *)(phdr->p_paddr + phdr->p_filesz),
                   0,
                   phdr->p_memsz - phdr->p_filesz);
        }
    }
    return true;
}`,
  },

  xmodem: {
    title: "xmodem.c — XMODEM-1K Protocol",
    language: "c",
    code: `#define SOH   0x01  // 128-byte block start
#define STX   0x02  // 1024-byte block start (XMODEM-1K)
#define EOT   0x04  // End of transmission
#define ACK   0x06  // Acknowledge
#define NAK   0x15  // Negative acknowledge
#define CAN   0x18  // Cancel

#define XMODEM_TIMEOUT_MS  3000
#define MAX_RETRIES        10

bool xmodem_receive(uint8_t *dest, size_t max_size, size_t *out_len) {
    uint8_t blk_num = 1;
    size_t  received = 0;

    uart_puts("\\r\\nXMODEM-1K ready. Send file...\\r\\n");

    // Initiate transfer: send NAK (or 'C' for CRC mode)
    uart_putchar('C');  // Request CRC mode

    int retries = 0;
    while (retries < MAX_RETRIES) {
        int hdr = uart_getchar_timeout(XMODEM_TIMEOUT_MS);
        if (hdr < 0) {
            uart_putchar('C');  // Retry
            retries++;
            continue;
        }

        if (hdr == EOT) {
            uart_putchar(ACK);
            *out_len = received;
            uart_puts("\\r\\nTransfer complete!\\r\\n");
            return true;
        }
        if (hdr == CAN) { return false; }

        size_t bsz = (hdr == STX) ? 1024 : 128;
        uint8_t buf[1024];

        uint8_t blk  = uart_getchar();
        uint8_t cblk = uart_getchar(); // Complement

        // Receive block data
        for (size_t i = 0; i < bsz; i++)
            buf[i] = uart_getchar();

        uint16_t rx_crc = ((uint16_t)uart_getchar() << 8)
                        | uart_getchar();
        uint16_t calc_crc = crc16_ccitt(buf, bsz);

        if (blk != blk_num || (blk + cblk) != 0xFF || rx_crc != calc_crc) {
            uart_putchar(NAK);
            continue;
        }

        if (received + bsz <= max_size) {
            memcpy(dest + received, buf, bsz);
            received += bsz;
        }
        blk_num++;
        uart_putchar(ACK);
        retries = 0;
    }
    return false;
}`,
  },

  pmp: {
    title: "pmp.c — Physical Memory Protection",
    language: "c",
    code: `// PMP Configuration Register fields
#define PMP_R    (1 << 0)   // Read permission
#define PMP_W    (1 << 1)   // Write permission
#define PMP_X    (1 << 2)   // Execute permission
#define PMP_A    (3 << 3)   // Address matching: NAPOT
#define PMP_L    (1 << 7)   // Lock (survives M-mode write after set!)

// NAPOT encoding: base | ((size/2) - 1)
// e.g., 1MB at 0x80000000 = 0x80000000 | (0x80000 - 1)
//                         = 0x8007FFFF

void pmp_protect_monitor(void) {
    /*
     * Region 0: Monitor code (0x80000000 – 0x80100000)
     *   Permissions: R+X only (no Write)
     *   Locked: payload cannot overwrite trap vector
     */
    uintptr_t mon_napot = 0x80000000UL | ((0x100000 / 2) - 1);
    write_csr(pmpaddr0, mon_napot >> 2); // RISC-V shifts addr >> 2
    write_csr(pmpcfg0,  PMP_R | PMP_X | PMP_A | PMP_L);

    /*
     * Region 1: Payload area (0x80100000 – 0x88000000)
     *   Permissions: R+W+X
     *   Not locked: payload can self-modify
     */
    uintptr_t pay_napot = 0x80100000UL | ((0x7F00000 / 2) - 1);
    write_csr(pmpaddr1, pay_napot >> 2);
    write_csr(pmpcfg0,  read_csr(pmpcfg0)
              | ((PMP_R | PMP_W | PMP_X | PMP_A) << 8));

    uart_puts("[PMP] Monitor region locked R/X only\\r\\n");
    uart_puts("[PMP] Payload region R/W/X\\r\\n");
}`,
  },

  trap_handler: {
    title: "trap.c — Trap Handler",
    language: "c",
    code: `static const char *trap_names[] = {
    [0]  = "Instruction Address Misaligned",
    [1]  = "Instruction Access Fault",
    [2]  = "Illegal Instruction",
    [3]  = "Breakpoint",
    [4]  = "Load Address Misaligned",
    [5]  = "Load Access Fault",
    [6]  = "Store/AMO Address Misaligned",
    [7]  = "Store/AMO Access Fault",
    [8]  = "Environment Call from U-mode",
    [9]  = "Environment Call from S-mode",
    [11] = "Environment Call from M-mode",
    [12] = "Instruction Page Fault",
    [13] = "Load Page Fault",
    [15] = "Store/AMO Page Fault",
};

typedef struct {
    uint64_t x[32];   // General-purpose registers x0–x31
    uint64_t mepc;
    uint64_t mcause;
    uint64_t mtval;
    uint64_t mstatus;
} trap_frame_t;

void trap_handler(trap_frame_t *tf) {
    uint64_t cause  = tf->mcause;
    int      is_irq = (cause >> 63) & 1;
    uint64_t code   = cause & ~(1ULL << 63);

    uart_puts("\\r\\n========== TRAP ==========\\r\\n");

    if (is_irq) {
        uart_printf("Interrupt: %llu\\r\\n", code);
    } else {
        const char *name = (code < 16 && trap_names[code])
                         ? trap_names[code] : "Unknown";
        uart_printf("Exception: %s (cause=%llu)\\r\\n", name, code);
    }

    uart_printf("mepc:    0x%016llx\\r\\n", tf->mepc);
    uart_printf("mtval:   0x%016llx\\r\\n", tf->mtval);
    uart_printf("mstatus: 0x%016llx\\r\\n", tf->mstatus);

    uart_puts("\\r\\n--- GPR Dump ---\\r\\n");
    static const char *rnames[32] = {
        "zero","ra","sp","gp","tp","t0","t1","t2",
        "s0","s1","a0","a1","a2","a3","a4","a5",
        "a6","a7","s2","s3","s4","s5","s6","s7",
        "s8","s9","s10","s11","t3","t4","t5","t6"
    };
    for (int i = 0; i < 32; i++) {
        uart_printf("  %-4s (x%-2d): 0x%016llx\\r\\n",
                    rnames[i], i, tf->x[i]);
    }
    uart_puts("==========================\\r\\n");
}`,
  },

  boot_asm: {
    title: "boot.S — M-Mode Entry",
    language: "c",
    code: `.section .text.boot
.global _start

_start:
    # Only hart 0 proceeds; others spin forever
    csrr    t0, mhartid
    bnez    t0, _hart_park

    # Clear BSS segment
    la      a0, __bss_start
    la      a1, __bss_end
_bss_loop:
    sd      zero, 0(a0)
    addi    a0, a0, 8
    blt     a0, a1, _bss_loop

    # Set up stack pointer (grows downward from _stack_top)
    la      sp, _stack_top

    # Install trap vector (4-byte aligned, direct mode)
    la      t0, trap_entry
    csrw    mtvec, t0

    # Save DTB address (a1 from BootROM) before clobbering
    # QEMU passes DTB pointer in a1
    mv      s1, a1      # Preserve DTB pointer

    # Jump into C — never returns
    call    monitor_main

_hart_park:
    # Secondary harts: enable M-mode software interrupt then WFI
    li      t0, (1 << 3)  # MIE.MSIE
    csrw    mie, t0
1:  wfi
    j       1b

.balign 4
trap_entry:
    # Save all 32 GPRs to stack-allocated trap frame
    addi    sp, sp, -272      # sizeof(trap_frame_t)
    sd      x1,   8(sp)
    # ... (all 32 registers) ...
    sd      x31, 256(sp)

    csrr    t0, mepc
    sd      t0, 260(sp)
    csrr    t0, mcause
    sd      t0, 268(sp)

    mv      a0, sp            # Pass trap frame pointer
    call    trap_handler

    # Restore and return
    ld      t0, 260(sp)
    csrw    mepc, t0
    # ... restore GPRs ...
    mret`,
  },

  hal: {
    title: "hal.h — Hardware Abstraction Layer",
    language: "c",
    code: `// Board abstraction for QEMU virt and VisionFive 2
typedef struct {
    const char *name;
    uint64_t uart_base;
    uint64_t uart_clock;    // Reference clock in Hz
    uint32_t baud_rate;
    uint64_t dram_start;
    uint64_t dram_size;
    uint64_t clint_base;    // Core Local Interruptor base
    uint64_t plic_base;     // Platform-Level Interrupt Controller
    void (*clk_init)(void); // Board-specific clock init (VF2 only)
} board_info_t;

// QEMU virt machine (default, no clock init needed)
static const board_info_t board_qemu_virt = {
    .name       = "QEMU virt",
    .uart_base  = 0x10000000UL,
    .uart_clock = 1843200,
    .baud_rate  = 115200,
    .dram_start = 0x80000000UL,
    .dram_size  = 0x08000000UL, // 128MB
    .clint_base = 0x02000000UL,
    .plic_base  = 0x0C000000UL,
    .clk_init   = NULL,         // QEMU: no init needed
};

// StarFive VisionFive 2 (JH7110 SoC)
static const board_info_t board_visionfive2 = {
    .name       = "VisionFive 2",
    .uart_base  = 0x10010000UL, // Different from QEMU!
    .uart_clock = 24000000,     // 24 MHz PLL output
    .baud_rate  = 115200,
    .dram_start = 0x40000000UL,
    .dram_size  = 0x200000000UL, // 8GB max
    .clint_base = 0x02000000UL,
    .plic_base  = 0x0C000000UL,
    .clk_init   = jh7110_pll_init, // Critical: must run first!
};

// Runtime board detection (probe UART base register)
const board_info_t *board_detect(void) {
    // Attempt to read VisionFive 2 UART scratch register
    volatile uint8_t *scr = (uint8_t *)(0x10010007UL); // SCR offset=7
    uint8_t saved = *scr;
    *scr = 0xA5;
    if (*scr == 0xA5) {
        *scr = saved;
        return &board_visionfive2;
    }
    return &board_qemu_virt;
}`,
  },
};
