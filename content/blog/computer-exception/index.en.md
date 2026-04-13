+++
title = "CPU Exception Handling and RISC-V Interrupts"
date = 2026-04-13T20:51:00+09:00
description = "Learn about CPU exception handling and how RISC-V CPUs implement interrupts."

[taxonomies]
tags = ["computer-architecture", "CPU", "RISC-V"]

[extra]
series = "/series/csed311/"
+++

Let's explore how CPUs handle exceptions, and how interrupts are implemented
on RISC-V CPUs.

# CPU Exception Handling
Even while a CPU is executing instructions normally, exceptional situations
that demand immediate attention can occur. They mostly fall into three
categories.
- First, the instruction itself fails and cannot complete. For example, a
  divide by zero, or an attempt to access memory to which the program has
  no access rights.
- Second, an external I/O device requests CPU service. This covers things
  like keyboard input arriving, or a disk read completing.
- Third, in a time-sharing system, the allotted time (quantum) has expired.
  This happens when the operating system has to hand the CPU over to another
  process.

As a representative example, each pipeline stage can raise the following
kinds of exceptions.
- IF: Accessing an invalid or protected address in instruction memory.
- ID: An illegal opcode, or an intentional system call or trap.
- EX: Divide by zero, or overflow (on some architectures).
- MEM: Accessing an invalid or protected memory address.

Methods for dealing with these situations include the following.

## Polling
Polling is a scheme where the CPU itself periodically checks whether an
event has occurred. The critical drawback is that it has to check every time
regardless of whether there is actually an event, so the overhead can be
substantial. For that reason, it is only used in limited environments such
as simple embedded systems.

## Interrupts
With interrupts, when an event occurs the CPU receives a notification to
**stop what it is doing** and handle another task first. Interrupts are
generated when an **exceptional condition** occurs, and when an interrupt
fires the CPU hands control over to an exception handler. When the
interrupt handling finishes, the CPU returns to the original program.

## Interrupt Control Transfer
In an ordinary program, "control" of the CPU belongs to the program that is
running. When an interrupt occurs, though, the CPU stops what it is doing
and goes off to execute a separate routine called the interrupt handler.
In other words, control is transferred from the original program to the
interrupt handler. This process is called **interrupt control transfer**.

An interrupt is an "unplanned" function call. An ordinary function call is
performed intentionally — the programmer inserts a `call` instruction
directly into the code — but an interrupt fires with no such warning.

During this process, the interrupted thread cannot predict the control
transfer or prepare for it in advance. In a regular function call, the
caller prepares arguments and tidies up registers before calling, but an
interrupt latches onto an instruction at an arbitrary point in time, so
from the program's point of view there is no way to prepare for the
interrupt to run.

For this reason, the interrupt execution process must be completely
**transparent**. When the interrupt handler has finished running and
control has returned to the original program flow, the program must not
be able to tell, in any way, that an interrupt ever happened. To make this
possible, when the interrupt handler is entered the handler (or the CPU)
must save the register state, program counter, flags, and so on, and
restore them perfectly on return.

## Synchronous / Asynchronous Interrupts
**Synchronous interrupts** are interrupts that arise from an instruction
itself while the CPU is executing instructions. Page faults, divide by
zero, and invalid memory accesses are examples. Because these always occur
at the same point whenever the instruction is executed, they are
reproducible — running the same program under the same conditions makes
them fire again at the same point. These are also usually called
**exceptions**.

**Asynchronous interrupts** are signals coming from outside the CPU, and
they can fire at any time, independently of instruction execution.
Keyboard input, disk I/O completion, and timer expiration fall into this
category.

## Precise Interrupts
To implement interrupts on an actual CPU, the "transparency" we described
above must be guaranteed by hardware. The current execution state has to
be saved exactly, and the return after the handler must be perfect. On a
CPU that executes instructions one at a time this is relatively easy, but
on a pipelined design that processes multiple instructions simultaneously
it becomes much trickier.

In a pipelined CPU, at any given moment several instructions are in flight
at different execution stages. What happens if an interrupt occurs in this
situation — how should we handle the half-executed instructions? The
solution is the **precise interrupt**.

A precise interrupt is a scheme that makes it look, from the interrupt
handler's point of view, as if the interrupt happened exactly between two
instructions. When an interrupt fires, a specific instruction is chosen as
the boundary: everything older than it is completed, and everything younger
is cancelled, as if it had never started at all.

For a synchronous interrupt, things are handled as if the CPU had stopped
right before the instruction that caused it, and when the handler returns
execution resumes from that instruction.

# Virtualization and Protection
Before looking at how interrupts are actually implemented, there is a
concept we need to know first: the **CPU's privilege level**. On a
computer, tens or even hundreds of processes run at the same time. But the
CPU is physically limited, and memory and disk are shared among many
processes.

What would happen if every program could access the hardware directly? A
program could accidentally — or maliciously — overwrite another program's
memory, and a malicious program could read or delete another user's files
on disk. A single process's bug could take down the entire system.

So the operating system provides each program with **virtualization**. It
makes it look as if every process has its own CPU and its own memory. In
reality, the OS slices time finely and hands the CPU out in turns
(time-shared multiprocessing), and, through virtual addresses, makes
memory look like an independent address space to each process as well.

## Privilege Levels
This raises a question. The OS itself is ultimately just software running
on top of a CPU — so how can it control the other programs? The programs
running on top of the OS cannot control each other, and for the OS alone
to be able to control the others, hardware-level support that treats the
OS as a special kind of program is needed. This is exactly what
**privilege levels** are.

Modern CPUs have built into them, at the hardware level, modes that
distinguish "how trustworthy the currently executing code is." Programs
are usually separated into the following three levels.

### User Mode
**User mode** is the region where ordinary application programs run. The
set of instructions available in this mode is restricted. General
operations like addition, subtraction, and memory reads and writes are
allowed, but operations that have a destructive effect on the whole
system — sending commands directly to the disk controller, accessing
another process's memory, disabling interrupts, and so on — are not. If a
program tries to execute such an instruction, the CPU raises an exception
and notifies the OS.

### Kernel Mode
**Kernel mode** (also called privileged mode) is the region where the OS
kernel code runs. In this mode, every CPU instruction can be used, every
memory region can be accessed, and the system's hardware devices can be
controlled directly. If a user program wants to read a file, it has to
request the OS to do so via a **system call**; at that point control flow
in the CPU moves to the kernel, and the CPU mode switches from user mode
to kernel mode.

### Hypervisor Mode
Below kernel mode, there is another layer: **hypervisor mode**. (The term
used to refer to this layer differs from CPU to CPU.) This adds yet
another virtualization layer underneath the OS, making it possible to run
multiple OSes simultaneously on top of a single physical machine. Virtual
machine environments like VMware, VirtualBox, and Proxmox VE operate at
this layer.

### RISC-V Privilege Modes
RISC-V defines the privilege levels described above as four
**privilege modes**. Going from top to bottom, the privilege grows
higher.

- **U mode (User)**: The lowest privilege level, where ordinary application
  programs run. It corresponds to the user mode described above.
- **S mode (Supervisor)**: The mode where the OS kernel code runs.
  Corresponds to the kernel mode above. S mode performs the main work of
  the OS: managing page tables, scheduling processes in turn, and so on.
  General-purpose OS kernels like Linux and FreeBSD run in this mode.
- **H extension (Hypervisor)**: An optional extension that extends S mode
  to support virtualization. Strictly speaking it is not an independent
  mode but an extension layered on top of S mode, and is also called
  **HS mode (Hypervisor-extended Supervisor Mode)**. A guest OS running on
  top of it operates under the illusion that it is in S mode. This
  corresponds to the hypervisor mode above.
- **M mode (Machine)**: **The highest privilege level, which exists only
  in RISC-V.** It has full control over the machine itself. It is the mode
  the CPU starts in right after boot, and it is the one mode every CPU
  must implement. **Firmware** and **bootloaders (such as OpenSBI)**, which
  handle hardware most closely, operate here, and M mode has unrestricted
  access to the CSRs.

Not every RISC-V CPU has to implement all four modes. Some example
implementations:

- **M only**: Very small microcontrollers (MCUs). This is the simplest
  configuration, with only firmware running and no OS.
- **M + U**: Simple embedded systems. There is no OS, but the designer
  wants some separation between application code and firmware.
- **M + S + U**: The typical configuration for running a general-purpose
  OS like Linux. Most RISC-V desktop/server CPUs use this configuration.
- **M + (HS) + S + U**: A high-performance configuration that also
  supports virtualization. Mostly seen on server-class RISC-V processors.

The biggest difference from other architectures is **the existence of
M mode**. On x86, there is no separate "machine level" below the
hypervisor, and firmware (BIOS/UEFI) and the OS are connected relatively
loosely. RISC-V, in contrast, explicitly defines M mode at the ISA level,
so that every privilege transition — from boot to OS execution to
virtualization — can be described in a single consistent model. The
interrupt handling performed in S mode likewise operates within this
model, and the `s-` prefix on the CSR names we will see shortly —
`sstatus`, `sepc`, `scause`, and so on — is exactly what **Supervisor
mode** stands for. (The corresponding CSRs that perform the same job in
M mode are named with an `m-` prefix: `mstatus`, `mepc`, `mcause`, and so
on.)

# Interrupts in RISC-V
To implement interrupt handling, the CPU must save a few pieces of
**state** somewhere. The PC at the moment the interrupt fired, the cause
of the event, the previous privilege level, the interrupt mask settings,
and so on. If you think about where to put this information, two
candidates come naturally to mind: putting it in the **general-purpose
register file (`x0`–`x31`)**, or putting it at a **specific address in
memory**. Both have serious problems, though.

Using general-purpose registers is close to impossible. An interrupt cuts
in at an arbitrary moment during program execution, and at that moment all
the general-purpose registers already hold values the original program was
using. If we write state into `x5` or `x6` for interrupt handling, the
original value is immediately overwritten, and the returning program
resumes execution with its registers corrupted. The **transparency** we
emphasized in the previous section breaks right there. On top of that, the
interrupt handler itself needs to use general-purpose registers, so
reserving some of them for state storage shrinks the pool the handler can
use.

Putting the state in memory is no easier. In the instant that an interrupt
fires, having the CPU go through the cache and MMU to access memory just
to record the PC and the cause and read them back is far too slow.
Interrupt handling needs to happen almost atomically within a single
cycle, and the path to memory is much too long. A more fundamental
problem is that **the memory access itself may cause an exception**. If
the very thing that triggered the interrupt was a page fault, saving the
state to memory might trigger another page fault, and handling that
requires another memory access, and so on — the whole thing recursively
collapses.

So RISC-V takes a third option. At the ISA level, it defines a dedicated
register space that is separate from both the general-purpose register
file and from memory. This is the **CSR (Control and Status Register)**
space. Because CSRs are independent of the general-purpose register file,
the state of the original program's `x0`–`x31` can be left completely
untouched when an interrupt fires; because they are dedicated hardware
inside the CPU rather than memory, they can be accessed in a single cycle;
and because access can be controlled on a per-mode basis, user programs
can be prevented from touching sensitive state like the interrupt vector
on a whim. The CSRs, and the dedicated instructions that manipulate them,
are the backbone of RISC-V's interrupt architecture.

### Privileged CSRs
**CSRs** are a collection of special registers with a 12-bit address
space, existing separately from the general-purpose register file
(`x0`–`x31`). The CSR address space defines a huge number of registers,
ranging from program performance counters to interrupt-related state to
memory protection settings. A large fraction of them are **privileged
CSRs**, which can only be accessed from a privileged mode (S mode or
M mode). If a user-mode program tries to access such a CSR, the CPU
immediately raises an illegal instruction exception. Thanks to this, the
OS can block, at the hardware level, actions like a user program
rewriting the interrupt vector at will, disabling interrupts, or spying
on the state of another process.

### CSR Access Instruction: CSRRW
Because CSRs are separate from the general-purpose register file, they
cannot be accessed with ordinary memory instructions such as `lw`/`sw`.
Instead, RISC-V provides a dedicated set of CSR instructions. The most
fundamental of them is **`csrrw` (Control and Status Register Read and
Write)**.

```
csrrw rd, csr, rs1
```

- `rd`: a general-purpose register that will hold the previous value of
  the CSR
- `csr`: the address of the CSR to access
- `rs1`: a general-purpose register holding the new value to write into
  the CSR

In other words, in a single instruction `csrrw` **reads a CSR and, at the
same time, overwrites it with a new value**. The important point is that
the read and the write are **atomic**, so no other code can slip in and
change the CSR value in between. In addition to this, there are `csrrs`
(CSR Read and Set) for setting specific bits, `csrrc` (CSR Read and Clear)
for clearing bits, and their respective 5-bit immediate versions —
`csrrwi` / `csrrsi` / `csrrci` — giving six CSR instructions in total.

### Major Interrupt-Related CSRs
A summary of the key S-mode CSRs used in RISC-V's interrupt handling flow.
(M mode also has corresponding CSRs with the names changed — `mstatus`,
`mepc`, `mcause`, `mtvec`, `mtval` — whose behavior is almost identical.)

- **`sstatus`** (Supervisor Status Register): A register that holds the
  current state of the CPU. Its most important field is the **`SIE`**
  (Supervisor Interrupt Enable) bit: when it is 1, S-mode interrupts can
  be received, and when it is 0, interrupts are disabled. The **`SPP`**
  (Supervisor Previous Privilege) bit records the **privilege level just
  before the interrupt fired**, so that when the handler returns later it
  knows which mode to go back to.
- **`sepc`** (Supervisor Exception Program Counter): A register that
  stores the **PC** at the moment the interrupt or exception occurred.
  When the handler is done, the CPU returns to this address and continues
  execution of the original program. For a synchronous exception, this is
  the address of the instruction that caused the exception; for an
  asynchronous interrupt, it is the address of the next instruction that
  has not yet been executed.
- **`scause`** (Supervisor Cause Register): A register that indicates the
  **cause** of the interrupt/exception that just occurred. If the top bit
  is 1 it is an asynchronous interrupt, and if it is 0 it is a
  synchronous exception; the lower bits contain the specific
  **exception code**. The handler looks at this value and decides what
  processing to do. We will discuss its bit structure in more detail
  right below.
- **`stvec`** (Supervisor Trap Vector Base Address Register): A register
  that stores the **starting address of the handler** that the CPU will
  jump to when an interrupt fires. At boot, the OS writes the address of
  its own interrupt handler into this CSR, and from then on the CPU
  automatically jumps to that address every time an interrupt arrives.
- **`stval`** (Supervisor Trap Value): Holds additional information about
  an exception. For example, on an invalid memory access it contains the
  offending address, and on an illegal instruction exception it contains
  the encoding of the offending instruction. The handler uses it for
  extra diagnostics.

### The Structure of the `scause` Register
Of the CSRs listed above, `scause` is the one the handler reads most often
in the interrupt handling flow, so let's look at its bit structure a bit
more carefully.

`scause` is XLEN bits wide — 32 bits on RV32 and 64 bits on RV64. Either
way, the structure is essentially the same. The topmost bit is the
**Interrupt bit**, and all the remaining lower bits form the
**Exception Code** field. Drawn as a picture, it looks like this on RV32:

```
  31  30                                                       0
 ┌───┬──────────────────────────────────────────────────────────┐
 │ I │                 Exception Code (31 bits)                 │
 └───┴──────────────────────────────────────────────────────────┘
   │                               │
   │                               └── specific cause number
   │                                   (interrupt type or exception type)
   │
   └── Interrupt bit
       1 = asynchronous interrupt
       0 = synchronous exception
```

The **Interrupt bit (I)** is a single bit at the MSB. Looking at this bit,
the handler first distinguishes "is what just came in an asynchronous
interrupt from an external device or a timer, or is it a synchronous
exception caused by the instruction that was executing?" The two usually
have entirely different handling paths. For a synchronous exception, the
handler has to decide whether to re-execute the instruction pointed to by
`sepc`, skip it, or kill the process; for an asynchronous interrupt, it
just needs to send an acknowledgement to the relevant device's controller
and return to the original program.

The **Exception Code** field is all of the remaining lower bits. Its value
is a number that identifies exactly what event occurred. Since the same
number means different things when `I` is 0 versus when `I` is 1,
strictly speaking it has to be interpreted as an `(I, code)` pair.

Common codes seen when `I = 1` (interrupt):

| Code | Meaning |
|:---:|:---|
| 1 | Supervisor software interrupt (SSI) |
| 5 | Supervisor timer interrupt (STI) |
| 9 | Supervisor external interrupt (SEI) |

Common codes seen when `I = 0` (exception):

| Code | Meaning |
|:---:|:---|
| 0 | Instruction address misaligned |
| 1 | Instruction access fault |
| 2 | Illegal instruction |
| 3 | Breakpoint |
| 4 | Load address misaligned |
| 5 | Load access fault |
| 6 | Store/AMO address misaligned |
| 7 | Store/AMO access fault |
| 8 | Environment call from U-mode (system call) |
| 9 | Environment call from S-mode |
| 12 | Instruction page fault |
| 13 | Load page fault |
| 15 | Store/AMO page fault |

An interesting design choice is that the Interrupt bit is the **topmost**
bit. If C code reads the `scause` value as a signed integer, then for
interrupts the value becomes **negative**, so you can write the branch
concisely as "if `scause < 0` it is an interrupt, otherwise it is an
exception." A simple S-mode handler typically looks something like this.

```c
void trap_handler(void) {
    uintptr_t cause = read_csr(scause);
    uintptr_t code  = cause & ~((uintptr_t)1 << (XLEN - 1));

    if ((intptr_t)cause < 0) {
        // interrupt
        switch (code) {
            case 5: handle_timer();    break;
            case 9: handle_external(); break;
            // ...
        }
    } else {
        // exception
        switch (code) {
            case 2:  handle_illegal_instruction(); break;
            case 8:  handle_syscall();             break;
            case 13: handle_load_page_fault();     break;
            // ...
        }
    }
}
```

In this way, `scause` is a register that holds the answer to **"why am I
here right now?"** in a single word, and the first decision an interrupt
handler makes is based on reading this value.

### What Actually Happens When an Interrupt Fires
When an interrupt or exception fires, the sequence of things the CPU does
in hardware is as follows. All of these steps are finished **automatically
by the hardware within a single cycle**, with not a single line of
software code involved.

1. **Record the cause**: The type of event that occurred is written to
   `scause`. The topmost bit distinguishes interrupt vs. exception, and
   the lower bits hold the exception code.
2. **Save the PC**: The PC at the moment the interrupt fired is saved to
   `sepc`. Because precise interrupts are guaranteed, this PC represents
   the boundary line "everything before this instruction has fully
   completed, and from this instruction onward nothing has executed at
   all."
3. **Record additional information**: If necessary, extra information
   (the offending access address, the bad instruction encoding, etc.) is
   also written to `stval`.
4. **Privilege transition**: The CPU mode is raised to S mode (or M
   mode). The previous privilege level is backed up in `sstatus.SPP`, to
   be referenced on return.
5. **Disable interrupts**: `sstatus.SIE` is cleared to 0 so that no
   further interrupts can come in while the handler is running and
   corrupt its state. The previous `SIE` value is backed up in
   `sstatus.SPIE` (Supervisor Previous Interrupt Enable).
6. **Jump to the handler**: Finally, the PC is set to the address pointed
   to by `stvec`. The CPU now starts executing the interrupt handler
   code that the OS registered earlier.

The CPU state at the moment the handler starts running looks like this.
`scause` holds the cause, `sepc` holds the return address, and, if
applicable, `stval` is already filled in with additional information. The
current mode is S mode, and `SIE` is 0, so nested interrupts are blocked.
The handler code reads this information to figure out which interrupt
fired and why, performs the appropriate handling, and finally returns
with the **`sret` (Supervisor Return)** instruction. When `sret` is
executed, the CPU restores the PC to the address saved in `sepc`,
restores the mode to the previous privilege level stored in
`sstatus.SPP`, and puts `sstatus.SPIE` back into `SIE` to re-enable
interrupts. From the original program's point of view, execution simply
continues from precisely the point where it was interrupted, as if
nothing had happened.

## Nested Interrupts
In the discussion so far, we have assumed that "once an interrupt fires,
no new interrupt comes in until the handler finishes." The reason this is
actually true is that the hardware forcibly makes it so by clearing
`sstatus.SIE` to 0 — a safety measure that keeps the handler from
destroying its own state. In practice, however, always operating this way
has its problems.

The biggest issue is **response latency**. If new interrupts are blocked
while some interrupt handler is running for a long time, the responses of
external devices and timers are delayed by the same amount. For example,
if the handler for a disk I/O completion takes a long time and the timer
interrupt is blocked during that whole period, the OS cannot make
scheduling decisions in the meantime, and every other process is
temporarily stopped. On systems where responsiveness matters (real-time
OSes, network equipment, etc.) such delays become a serious problem.

The way to deal with this is **nested interrupts**. After the handler has
done some initial work, it re-enables new interrupts by setting
`sstatus.SIE` back to 1, returning itself to **a state in which it can
once again accept new interrupts**. Then, while the handler is running,
if a more urgent interrupt arrives, the current handler is suspended and
control is transferred to the new handler; when the new handler finishes,
control returns to the original handler to finish the rest of its work.
It looks much like one function calling another and returning.

There is an important caveat, though. The trap-related CSRs of RISC-V
(`sepc`, `scause`, `stval`, `sstatus.SPP`, `sstatus.SPIE`) all store
**only a single value**. If another interrupt fires, those CSRs are
**overwritten with the new values**, so the information the original
handler had is lost. Therefore, before the handler allows nested
interrupts, it has to **save the current CSR values to its own stack or
registers ahead of time**, and on return it must restore them back into
the CSRs before calling `sret`. If you get this ordering wrong, the
original interrupt will fail to return properly, or will return to the
wrong place. The typical flow of a nest-allowing handler looks like this.

1. Handler entry. (At this point `sstatus.SIE = 0`, and the CSRs hold
   information for the current interrupt.)
2. Push the current values of `sepc`, `scause`, `sstatus`, and so on to
   the handler stack.
3. Do the urgent work that must be done first (e.g. acknowledging the
   interrupt controller, clearing flags).
4. Set `sstatus.SIE` to 1 to allow nested interrupts. New interrupts may
   now come in.
5. Do the remaining long work. If a new interrupt arrives in the middle,
   it is handled recursively as a nested interrupt.
6. Work complete. `sstatus.SIE` is cleared back to 0 to block nesting.
7. Restore `sepc` and friends from the stack into the CSRs.
8. Return with `sret`.

Conceptually this flow is simple, but in real implementations it is an
area where bugs easily creep in, so even general-purpose OSes like Linux
often allow nested interrupts only in a very limited way, or not at all.
Instead, handlers are split into a "short **top half** that only does the
urgent work" and a "**bottom half** (also called softirq or tasklet) that
handles the rest of the processing later," so that long work is done
outside of interrupt context.

## Interrupt Priority
When several interrupts fire at nearly the same time, or when a new
interrupt arrives while a handler is running, something has to decide
which one is handled first. For this purpose, interrupts are assigned a
**priority**. A higher-priority interrupt can push a lower-priority one
out of the way and run first, and this rule, combined with the nested
interrupts we saw above, gives the behavior **"when a lower-priority
handler is running and a higher-priority interrupt arrives, suspend the
lower handler and handle the higher one first."**

In RISC-V, interrupt priority is decided on three levels.

### Priority Between Privilege Modes
First, there is a fixed order between **privilege modes**. M-mode
interrupts have the highest priority, followed by S mode, followed by U
mode. A machine-level interrupt (for example a machine timer) can push
aside a supervisor-level interrupt at any time. This order is baked into
the ISA and cannot be changed by software.

### Priority Within the Same Mode
When several interrupts are **pending at the same time** within the same
privilege mode, the priority is defined by the RISC-V specification. For
S mode, the order is as follows (higher has priority).

1. **SEI** (Supervisor External Interrupt) — interrupts from external
   devices
2. **SSI** (Supervisor Software Interrupt) — interrupts explicitly raised
   by software
3. **STI** (Supervisor Timer Interrupt) — the timer interrupt

External-device interrupts come first because external events are the
most latency-sensitive and missing one can lead to data loss. The timer
is periodic, so being delayed a little is not much of a problem.

### Fine-Grained Priority Among External Interrupts: PLIC
SEI is a single channel that aggregates "interrupts from outside" and
delivers them, but in reality dozens or hundreds of external devices
(keyboard, disk, network card, UART, etc.) each raise their own
interrupts. The priority among these is handled not by the CPU core but
by a separate hardware block called the
**PLIC (Platform-Level Interrupt Controller)**.

The role of the PLIC is as follows.

- It gathers the requests coming up from every external interrupt source.
- Based on the **priority value** that software has configured for each
  source, it picks the single request with the highest priority.
- It delivers the selected interrupt to the relevant hart (hart, RISC-V's
  name for a CPU core) as an SEI.
- The handler notifies the PLIC that it has "claimed" this interrupt, and
  when the processing is done notifies it that it has "completed" it.
  This process prevents the same interrupt from being processed twice.

So when an S-mode handler enters on an SEI, the first thing it has to do
is read the PLIC to find out "which external device raised this
interrupt." The PLIC's priority values are integers in the range 0–7 (or
wider, depending on the implementation), and the OS can set them freely
at runtime. Thanks to this, software can flexibly define policies tailored
to the system — for example, "network card priority 7, UART priority 3."

### Timer and Software Interrupts: CLINT
STI and SSI are internal events of the system itself rather than events
from external devices, so they originate not from the PLIC but from a
separate block. The block responsible for these is the
**CLINT (Core-Local Interruptor)**. For each hart, the CLINT provides a
timer compare register (`mtimecmp`) and a software interrupt trigger,
and when the conditions are met it raises an STI or SSI on that hart. If
the PLIC arbitrates "whose turn it is to speak among many external
devices," then the CLINT is a smaller and simpler block that handles
"communication between the timer and the hart."
