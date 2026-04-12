+++
title = "CPU Cycles and Pipelining"
date = 2026-04-12
description = "Learn about single-cycle and multi-cycle CPUs and instruction pipelining."

[taxonomies]
tags = ["computer-architecture", "CPU"]

[extra]
series = "/series/csed311/"
+++

Let's explore single-cycle and multi-cycle CPUs, and instruction pipelining.

> This article is based on the content of POSTECH's CSED311 course,  
with some additional topics not covered in the lectures.

# CPU Implementation
## Single-Cycle CPU
To execute a single instruction, a CPU typically goes through the following five stages:
- **IF (Instruction Fetch)**: Fetches the instruction from memory (the I-cache)
  at the address pointed to by the PC. At the same time, the PC is updated to
  the address of the next instruction.
- **ID (Instruction Decode)**: Interprets the fetched instruction. It determines
  whether the instruction is an addition, a load, or a branch, and reads the
  required register values.
- **EX (EXecute)**: Performs the actual operation. The ALU carries out
  arithmetic/logical operations such as addition, subtraction, and comparison,
  or computes the address for instructions that need memory access. For branch
  instructions, the branch condition is determined at this stage.
- **MEM (MEMory Access)**: The stage where memory is accessed. For a store
  instruction, data is written to the data memory (D-cache); for a load
  instruction, data is read from it.
- **WB (Write Back)**: The stage where the result is written back to a register.
  The result of the ALU operation or the value read from memory is stored in
  the destination register.

A CPU that completes every stage of an instruction within a single clock cycle
is called a **single-cycle CPU**. Within a single cycle, it fetches an
instruction from memory, decodes it, performs the computation, accesses memory,
and writes back to a register — all at once. This approach is simple to
implement and easy to understand.

However, it has a critical drawback: the length of the clock cycle must be
matched to the slowest instruction. For example, an ADD instruction does not
need memory access, so it only needs IF, ID, EX, and WB, whereas a LOAD must
go through all five stages: IF, ID, EX, MEM, and WB. Since every instruction
in a single-cycle CPU uses the same cycle length, ADD must wait for a cycle
as long as LOAD. Time is wasted because the slowest instruction drags every
other instruction down to its cycle length.

Let us assume the time required for each stage as follows:

| Instruction Type | IF | ID | EX | MEM | WB | Total |
|------------------|-----|-----|-----|------|-----|------|
| Load             | 200ps | 100ps | 200ps | 200ps | 100ps | **800ps** |
| Store            | 200ps | 100ps | 200ps | 200ps | —     | 700ps |
| R-type           | 200ps | 100ps | 200ps | —     | 100ps | 600ps |
| Branch           | 200ps | 100ps | 200ps | —     | —     | 500ps |

In a single-cycle CPU, the clock period must be fixed at **800ps**, matching
the slowest Load instruction. As a result, even a Branch instruction that
would only need 500ps ends up consuming 800ps every cycle, wasting 300ps per
instruction.

### Designing a Single-Cycle CPU
A single-cycle CPU executes one instruction from start to finish within a
single clock. As a result, all functional units must be able to operate
simultaneously, and the control circuitry is simple.

In a single-cycle CPU, the datapath between units is a structure in which the
path from IF to WB is connected in a single line. Instruction memory and data
memory exist separately, and although there is only one ALU, a dedicated Adder
for computing PC + 4 is needed as well. This is because, while the ALU is
performing an EX operation, the computation of PC + 4 (the next instruction
address) must also proceed in parallel.

The control unit is built from combinational logic. Since everything finishes
within a single cycle, the control unit does not need to remember any current
state. Taking the instruction as input, it outputs all the control signals
needed by each unit — such as `RegDst`, `ALUSrc`, and `MemtoReg` for the ALU
and memory — in one shot.

The clock cycle length is determined by the propagation delay of the longest
path from IF to WB. This is called the **critical path**, and the Load
instruction's path is usually the longest. It traverses every unit in series:
instruction memory → register read → ALU operation → data memory → register
write. Since every instruction in a single-cycle CPU must finish its work
within the same one cycle, all instructions must use as much time as this
critical path length.

## Multi-Cycle CPU
To address this, a **multi-cycle CPU** is a design in which each instruction
takes **only as much time as it actually needs**. It splits a single
instruction into multiple clock cycles, letting each instruction consume as
many clocks as it requires.

In a multi-cycle CPU, each instruction has a different CPI (Cycles Per
Instruction), and the Programmer Visible State is updated only when the
instruction's cycles have finished. Because an instruction spans several
clocks, the CPI is greater than 1. In exchange, `time/cycle` becomes much
shorter than in a single-cycle CPU, improving overall performance.

Let us place the instructions seen earlier onto a multi-cycle CPU. If we set
the clock period to the shortest stage length, **100ps**, then a 100ps stage
takes 1 clock and a 200ps stage takes 2 clocks.

| Instruction Type | IF | ID | EX | MEM | WB | Total Clocks | Total Time |
|------------------|----|----|----|-----|----|--------------|------------|
| Load             | 2  | 1  | 2  | 2   | 1  | 8 | 800ps |
| Store            | 2  | 1  | 2  | 2   | —  | 7 | 700ps |
| R-type           | 2  | 1  | 2  | —   | 1  | 6 | 600ps |
| Branch           | 2  | 1  | 2  | —   | —  | 5 | 500ps |

Because each instruction only consumes as many clocks as it actually needs,
unlike the single-cycle case where every instruction was bound to 800ps,
Branch finishes in 500ps and R-type in 600ps.

In addition, whereas a single-cycle CPU had to process everything within one
cycle and therefore needed separate memories for fetching instructions and
fetching data, a multi-cycle CPU handles IF and MEM in different cycles. This
means it can share a single memory — using it in IF to fetch instructions and
in MEM to read or write data — which is another advantage. (In modern CPUs,
however, I-cache and D-cache are separated to gain speed under limited memory
bandwidth, so the advantage of sharing memory has little practical meaning
today. You can think of it as an advantage from the early days of CPU design
when transistors were scarce and hardware resources were limited.)

### Designing a Multi-Cycle CPU
Since a multi-cycle CPU executes a single instruction over several cycles, its
design differs from that of a single-cycle CPU.

First, **temporary registers are needed**. In a single-cycle CPU it was
enough for data to flow straight through the circuit within a single cycle,
but in a multi-cycle CPU the result of this cycle must be passed to the next.
The IR holds the instruction, the register file holds the values read from
registers, the ALU holds the result of computation, and the memory unit holds
the data read from memory — each storing its value for the duration of the
instruction's execution.

Second, **an FSM (Finite State Machine)-based control unit is needed**.
The same ALU must compute PC + 4 in one cycle and perform a SUB operation in
another. The same memory unit outputs an instruction during IF and reads data
during MEM. Because of this, the select signals of the multiplexers connecting
each module must change depending on which stage the current instruction is
in. Combinational logic that decides control signals by looking at the
instruction alone — as in a single-cycle CPU — is no longer possible, and an
FSM that remembers the current state and changes the control signals
accordingly becomes necessary.

### Microcode
Microcode is one way to implement the FSM in a multi-cycle CPU, by storing the
FSM's control signals in a ROM. In the hardwired approach, the current state
and the opcode are taken as input, and control signals are generated directly
through logic gates. This is fast, but adding a new instruction or modifying
the control logic requires changing the entire circuit design.

In the microcode approach, which control signals should be asserted in each
state is written into a ROM table ahead of time. Each row is a single
**microinstruction**, containing control signal values such as `ALUSrcA`,
`ALUSrcB`, and `MemRead`, along with next-state information. The FSM's current
state is used as the address into the ROM, and reading the corresponding row
gives the control signals for this cycle.

The greatest advantage is flexibility. If you want to add a new instruction
or change the behavior of an existing one, you only need to modify the
contents of the ROM.

The disadvantage, however, is speed: because the ROM must be read on every
cycle, there is added delay. Therefore, in modern performance-critical CPUs,
the control signals for frequently used simple instructions are handled in
hardwired form, while only complex instructions are processed via microcode.

#### Millicode and Nanocode
Millicode and nanocode are structures that divide microcode into hierarchical
layers.

In microcode, all control signals are contained in a single microinstruction.
However, different microinstructions often repeat the same combinations of
control signals. For example, the control-signal combination for "read from
memory" is used both in Load instructions and in the IF stage. Storing all of
these duplicated control signals every time wastes ROM space.

**Nanocode** is a control layer below microcode that addresses this problem.
The actual combinations of control signals are stored in a nanocode ROM, and
the microcode ROM stores only the address (a pointer) into the nanocode ROM
where the needed control signals live. When microcode runs, it first reads
the nanocode address from the microcode ROM, then goes to that address in the
nanocode ROM to fetch the actual control signals. Duplicated control signals
only need to be stored once in the nanocode ROM, reducing the overall ROM
size. The downside is that reading ROM twice makes things slower.

**Millicode** is the opposite of nanocode — it is a control layer above
microcode. When handling complex instructions, microcode alone can become
long and hard to manage. Millicode acts like a kind of subroutine, bundling
frequently repeated microcode sequences into a single millicode routine.
When a complex instruction is executed, it calls a millicode routine, which
in turn executes microcode sequences internally.

#### Microcode in Practice
Modern x86 processors make heavy use of microcode. Simple instructions like
`add` and `mov` have their control signals determined directly by a hardwired
decoder. Complex CISC-specific instructions like `REP MOVSB`, `CPUID`, and
`WRMSR`, on the other hand, are executed by reading a micro-op sequence from
the microcode ROM. In the previous article, I mentioned that x86 CISC
simplifies its instructions internally and operates in a RISC-style
internally; these RISC-style micro-ops are the mechanism that plays that role.

Millicode is most notably used in IBM's z/Architecture mainframes. Very
complex operations such as context switching, interrupt handling, and virtual
memory fault handling are too long and complex to implement purely in
microcode. In z/Architecture, such operations are written as millicode
routines and used like firmware-level subroutines.

Nanocode has the critical drawback of slowing the CPU down, so it is rarely
used in modern CPUs. A historical example is the Motorola 68000 (M68K) from
the late 1970s, which stored only nanocode addresses in its microcode ROM and
kept the actual control signal combinations in a nanocode ROM to reduce ROM
size. In the modern era, where transistors are plentiful, it is more important
to avoid the speed loss of reading ROM twice than to add an extra layer just
to shrink ROM size, so nanocode routines are very rarely used.

# Pipelined CPU
Pipelining takes the multi-cycle CPU one step further. In a multi-cycle
design, while a single instruction spent several stages being executed, the
hardware for the remaining stages sat idle. Pipelining puts the next
instruction into that idle hardware right away, overlapping the execution of
multiple instructions at the same time.

For example, while the first instruction is in the ID stage, the IF hardware
is empty, so it fetches the second instruction. When the first moves on to
EX, the second goes to ID, and the third enters IF as a new fetch. In a
5-stage pipeline, up to 5 instructions can be processed simultaneously, each
in a different stage.

The latency of an individual instruction is still 5 cycles, but since one
instruction completes every cycle, throughput becomes one instruction per
cycle. This is where the `throughput != 1/latency` relationship discussed in
the previous article applies.

Structurally, the key difference from a multi-cycle design is the pipeline
registers. In a multi-cycle CPU, it was fine for temporary registers to be
overwritten every cycle, since only one instruction was in flight at a time.
In pipelining, however, several instructions are processed simultaneously, so
pipeline registers are placed between each pipeline stage to preserve the
data for each instruction independently. In a 5-stage pipeline, there are
four pipeline registers: IF/ID, ID/EX, EX/MEM, and MEM/WB. Each stores the
results of its stage along with the corresponding control signals and passes
them on to the next stage.

Control signals are generated all at once in the ID stage, and they flow
through the pipeline registers alongside the instruction, being used at the
appropriate stage. Because the control signals naturally flow to the next
stage, an FSM that remembers the current state — as in the multi-cycle case —
is no longer needed.

## Pipelining Performance
Ideally, an N-stage pipeline can increase throughput by a factor of N. Since
one instruction completes every cycle, N times as many instructions can be
processed in the same amount of time as without pipelining. In reality,
however, the performance gains are not this simple.

First, there is the overhead of the pipeline registers (latches). As
mentioned, a latch is needed between each pipeline stage to store intermediate
results, and passing through that latch also takes time. If we let $T$ be the
total computation delay without a pipeline and $S$ the latch delay, then the
length of a single cycle of a $K$-stage pipeline is:

$$T_{\text{clk}}(K) = \frac{T}{K} + S$$

The computational part $T$ is divided by $K$ and becomes smaller, but $S$ is
added intact because a latch must be traversed at every stage. Since
throughput is one instruction per cycle, we have
$\text{Throughput}(K) = \frac{1}{T/K + S}$, and as $K \to \infty$ the cycle
converges to $S$, fixing the upper bound of throughput at $\frac{1}{S}$. That
is, the theoretical maximum speedup of pipelining is

$$\text{Speedup}_{\max} = \frac{T + S}{S} \approx \frac{T}{S}$$

(when $T \gg S$).

For example, let $T = 10\text{ns}$ and $S = 1\text{ns}$. Without a pipeline,
one cycle is 11ns. Dividing it into $K = 5$ stages gives $10/5 + 1 = 3\text{ns}$,
yielding roughly 3.7x the throughput. With $K = 10$ it becomes 2ns (5.5x), and
with $K = 100$ it drops to 1.1ns (10x). No matter how large $K$ becomes, the
cycle cannot go below 1ns ($=S$), so the theoretical maximum speedup stops
around $T/S = 10$x.

Second, the hardware cost increases. The total amount of combinational logic
$G$ does not change no matter how the pipeline is split, but $K$ latches are
needed, so the cost grows in proportion to the number of stages:

$$C(K) = G + L \cdot K$$

Here, $L$ is the cost of a single latch (the number of gates, as a proxy for
area and power). When $K = 1$ (no pipeline), $C = G + L$; as $K$ grows, the
cost increases linearly with slope $L$.

For example, suppose the combinational logic is $G = 1000$ gates and each
latch is $L = 50$ gates. Without a pipeline, 1000 gates are needed; with
$K = 5$, it becomes $1000 + 50 \cdot 5 = 1250$ gates, a 25% increase. At
$K = 10$ it becomes 1500 gates (a 50% increase), and at $K = 20$ it becomes
2000 gates — double the original. The more finely the stages are split, the
higher the throughput, but the more area and power that must be paid along
with it.

So rather than simply increasing the pipeline depth without bound, it is
important to choose an appropriate pipeline depth at the balance point
between pipeline-driven performance gains and cost. In 1981, Peter M. Kogge
proposed the following formula for the optimal pipeline depth that maximizes
performance per cost:

$$K_{\text{opt}} = \sqrt{\frac{T \cdot G}{S \cdot L}}$$

This equation is derived by dividing throughput $\frac{1}{T/K + S}$ by cost
$G + L \cdot K$ to get the performance/cost ratio, then differentiating it
with respect to $K$ and finding where the derivative is zero. Intuitively,
the $T \cdot G$ in the numerator represents "the gains to be had from
pipelining" (the longer and heavier the original operation, the more worth it
there is in splitting it up), and the $S \cdot L$ in the denominator
represents "the cost of adding stages" (the larger the latch delay and area,
the more burdensome it is to add stages).

Plugging in the example values from earlier — $T = 10\text{ns}$,
$S = 1\text{ns}$, $G = 1000$, and $L = 50$ — we get
$K_{\text{opt}} = \sqrt{10 \cdot 1000 / (1 \cdot 50)} = \sqrt{200} \approx 14$.
That is, under these assumptions, around 14 stages is the sweet spot for
performance per cost, and splitting the pipeline more finely than that causes
latch overhead and hardware cost increases to start eating into the
throughput gains.

Of course, in actual CPU design, depth is not determined by this formula
alone. Stalls caused by pipeline hazards (data, control, and structural
hazards) that we will discuss later, the cost of pipeline flushes on branch
misprediction, power consumption, and verification difficulty are all factors
that constrain depth. The Kogge formula is ultimately just a basic formula
that shows an "upper bound under ideal conditions."

# Pipeline Hazards
Because pipelining overlaps the execution of multiple instructions, problems
arise when there are dependencies between instructions. The problems that
result from this are called **data hazards** and **control hazards**.

## Data Hazards
A data hazard occurs in a pipeline when a later instruction needs the result
of an earlier instruction but that result is not yet ready.

For example, suppose the following two RISC-V instructions execute back to
back:

```asm
add x1, x2, x3   # x1 = x2 + x3
sub x4, x1, x5   # x4 = x1 - x5
```

`sub` uses as input the `x1` computed by `add`. However, in a 5-stage
pipeline, `add` finishes its computation in the EX stage (cycle 3), and the
result is not actually written back to the register file until the WB stage
(cycle 5). Meanwhile, `sub` enters one cycle later and tries to read `x1` in
the ID stage, which is cycle 3 — at this point `x1` still contains its old
value. This is a RAW (Read After Write) data hazard.

| Cycle  | 1  | 2  | 3        | 4   | 5   |
|--------|----|----|----------|-----|-----|
| add    | IF | ID | EX       | MEM | WB  |
| sub    |    | IF | **ID**   | EX  | MEM |

There are three ways to solve this.

The first is a **stall**. We stop the later instruction and wait until the
result is ready. A bubble (empty cycle) is inserted into the pipeline, and
while the earlier instruction is being processed, the rest of the
combinational logic sits idle. This is the simplest method, but the
performance loss is significant.

The second is **forwarding**, also called **bypassing**. The result of an
ALU operation is already present at the ALU's output once the EX stage
finishes. Instead of waiting for that result to be written back to the
register (at WB), we pull the value directly from the EX/MEM pipeline
register and feed it as the ALU input of the next instruction. In hardware
terms, bypass paths and multiplexers are added from the outputs of the
pipeline registers to the ALU inputs, and a forwarding unit detects whether
"the register to be read right now is about to be written by an earlier
stage" and controls the ALU multiplexer accordingly.

Forwarding can resolve most data hazards, but there is a type it cannot
resolve: the **load-use** hazard. A load instruction only produces its value
after the MEM stage that follows EX. If the very next instruction wants to
use that value in EX, the cycles do not line up. In that case, a one-cycle
stall is unavoidable.

```asm
lw  x1, 0(x2)    # x1 = MEM[x2 + 0]
add x3, x1, x4   # x3 = x1 + x4
```

The result of `lw` appears at cycle 4 when the MEM stage finishes, but `add`
needs to enter EX at cycle 4 — one cycle too early. Even with forwarding
paths, we cannot turn back time, so `add` must be stalled for one cycle and a
bubble must be inserted in its place. After that, the value is forwarded from
the MEM/WB register into `add`'s EX input.

| Cycle  | 1  | 2  | 3      | 4         | 5      | 6   |
|--------|----|----|--------|-----------|--------|-----|
| lw     | IF | ID | EX     | MEM       | WB     |     |
| add    |    | IF | ID     | **stall** | EX     | MEM |

The third is to have the compiler reorder instructions (**scheduling**). The
compiler arranges things so that an instruction that uses a loaded value does
not come right after the load, inserting other unrelated instructions that
can be processed first in between.

For example, suppose we have the following C code:

```c
int a = arr[i];
int b = a + 1;
int c = brr[j];
int d = c * 2;
```

If compiled as is, `addi b, a, 1` comes right after `lw a`, causing one
load-use stall, and `slli d, c, 1` comes right after `lw c`, causing another
stall. However, since `a` and `c`, and `b` and `d`, do not depend on each
other, the compiler can reorder them as follows:

```asm
lw   a, 0(arr_i)
lw   c, 0(brr_j)   # load c in advance while waiting for a
addi b, a, 1       # by this point a is already ready
slli d, c, 1       # c is also already ready
```

With `lw c` inserted between `lw a` and `addi b`, the load-use gap widens and
both stalls disappear. In effect, the same work finishes two cycles sooner.

Both GCC and LLVM (Clang), the representative compilers, perform this kind of
instruction scheduling. They first build a dependency graph between
instructions to figure out which instructions depend on the results of which,
and then freely reorder instructions that have no dependencies between them.
GCC enables this optimization at -O2 and above, and performs scheduling twice
— both before and after register allocation. LLVM likewise performs
scheduling at both the intermediate representation (LLVM-IR) level and the
machine code level. Both compilers carry tables of pipeline information per
target CPU — such as instruction latency and execution unit counts — and use
them to determine the optimal order for that particular CPU.

In addition to the cost-versus-performance efficiency issue mentioned
earlier, data hazards are one of the factors that make it impossible to use
an excessively deep pipeline. If we use a deep pipeline, the distance that
forwarding must cover becomes quite long. In a 5-stage pipeline, if a SUB
that uses the result of a preceding ADD comes right after it, forwarding the
result of EX directly into the next EX is a one-cycle difference and can be
handled cleanly. But if the EX stage is split into EX1, EX2, and EX3, the
operation result comes out at EX3, while the next instruction already needs
that value at EX1. The number of cycles that even data forwarding cannot
cover grows, and stalls happen more often.

Load-use hazards become even more severe. In a slim 5-stage pipeline, a
one-cycle stall after a load was enough, but if the MEM stage is split into
several stages for a deeper pipeline, it takes more cycles before the value
comes out of memory. That means more stall cycles, or the compiler must
insert more instructions into the gap.

## Control Hazards
A control hazard is a problem that occurs when a branch instruction has not
yet determined the address of the next instruction to execute, but the
pipeline has already fetched the next instruction.

For example, suppose we have the following code:

```asm
beq  x1, x2, L1   # branch to L1 if x1 == x2
add  x3, x4, x5   # instruction that runs if the branch is not taken
sub  x6, x7, x8
...
L1:
or   x9, x10, x11
```

In a 5-stage pipeline, the branch condition of `beq` is not determined until
the EX stage (cycle 3). In the meantime, `add` and `sub` have already entered
the IF and ID stages. If the branch actually is taken, those two instructions
were fetched in error and must be discarded (flushed), and fetching must
resume from the `or` at `L1`.

| Cycle  | 1  | 2  | 3      | 4         | 5         |
|--------|----|----|--------|-----------|-----------|
| beq    | IF | ID | EX     | MEM       | WB        |
| add    |    | IF | ID     | **flush** |           |
| sub    |    |    | IF     | **flush** |           |
| or(L1) |    |    |        | IF        | ID        |

Two cycles are lost as bubbles, giving a 2-cycle penalty per branch. The IF
stage happens before the instruction is decoded, so it cannot even tell
whether there is a branch; the type of branch is only known at ID, and the
condition only at EX. Therefore, all instructions fetched in the meantime
must be flushed.

The solutions are as follows.

The first, as with data hazards, is to **stall**. When a branch instruction
is encountered, we do not fetch the following instructions and instead wait
until the branch result is ready, then fetch the next instruction. It is safe
and simple, but every branch wastes many cycles, leading to a significant
performance loss.

The second is **early branch resolution**. By adding hardware to handle the
branch comparison at the ID stage instead of at EX, the stall penalty is
reduced from 2 cycles to 1. MIPS is a representative CPU that uses this
approach.

The third is the **delayed branch**. This is a convention at the ISA level:
one (or more) instruction slots following a branch instruction are defined
as **branch delay slots**, and the hardware is made to always execute the
instruction in that slot regardless of whether the branch is taken. In other
words, the meaning "the slot is unconditionally executed whether or not the
branch is taken" becomes part of the instruction set. This way, the IF stage
no longer needs to worry about fetching the wrong instructions, so there is
nothing to flush and the branch penalty cycles simply vanish.

Filling that slot with a meaningful instruction, however, is the compiler's
job. The compiler picks an independent instruction from before the branch —
one that does not affect the branch condition or the jump target — and moves
it into the slot. For example, in MIPS code:

```asm
addu $t0, $t1, $t2   # computation unrelated to the branch
beq  $a0, $a1, L1
```

`addu` is unrelated to `beq`'s comparison targets ($a0, $a1), so the result
is the same whether it comes before or after the branch. The compiler
rearranges this as follows:

```asm
beq  $a0, $a1, L1
addu $t0, $t1, $t2   # branch delay slot — always executed regardless of the branch
```

Done this way, `addu` was an instruction that had to be executed anyway, so
the 1-cycle penalty is filled in for free. If there is no suitable
independent instruction to move, the compiler has to jam a `nop` into the
slot, which ends up carrying the same penalty as a stall.

Delayed branches were commonly adopted in early 1980s RISCs — MIPS, SPARC,
PA-RISC, SuperH, and others all pinned a 1-cycle delay slot into their ISAs.
However, as pipeline depth increased, a single slot could no longer cover
the branch penalty, and as superscalar and out-of-order execution became the
norm, much more accurate branch predictors became the better solution. Above
all, since the semantics are nailed down at the ISA level, it becomes hard
to change the pipeline structure later. So later RISCs such as ARM, PowerPC,
and Alpha never introduced delay slots from the beginning; RISC-V explicitly
left them out; and even MIPS abandoned delay slots in its 2014 R6 revision.

The fourth is to reduce or eliminate branches themselves at the compiler
level. **if-conversion** turns short if-then-else constructs into conditional
moves (x86 `cmov`, ARM predication, RISC-V Zicond, etc.), removing the branch
entirely. **Loop unrolling** replicates the loop body to reduce the number of
back-edge branches taken per iteration, and **inlining** eliminates function
call and return branches altogether.

For example, compiling `x = (a > b) ? a : b` directly would insert a compare
and one branch, but applying if-conversion finishes the job without a branch:

```asm
cmp  a, b
mov  x, b
cmovg x, a   # if a > b then x = a, otherwise keep b
```

The last is **branch prediction**, which is the method primarily used in
modern CPUs. There are various techniques for branch prediction, and we will
look at them in more detail in the next article.
