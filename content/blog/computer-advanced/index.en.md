+++
title = "Superscalar CPU and Out-of-Order Execution"
date = 2026-04-14
description = "Learn about the superscalar architecture and out-of-order execution used in modern CPUs."

[taxonomies]
tags = ["computer-architecture", "CPU"]

[extra]
series = "/series/csed311/"
+++

Let's explore the superscalar architecture and Out-of-Order (OoO) execution
used in modern CPUs.

# Instruction-Level Parallelism
Up to this point, the CPU has executed instructions serially. Pipelining lets
the CPU work on several instructions in a single cycle, but multiple
instructions were never really executed at the same time. They came in one
by one and ran one by one.

The technique introduced to improve this is **Instruction-Level Parallelism
(ILP)**. ILP is about finding instructions inside a program that can be
executed simultaneously and processing them in parallel. From the
programmer's point of view the instructions still execute one line at a
time, but internally the CPU boosts performance by processing independent
instructions at the same time.

There are other layers of parallelism besides ILP. **Thread-Level
Parallelism (TLP)**, which runs multiple threads simultaneously, is what
multicore and SMT exploit, and **Data-Level Parallelism (DLP)**, which
applies the same operation to many pieces of data at once, is what SIMD and
GPUs exemplify. Unlike TLP and DLP, which require the programmer to write
code explicitly, ILP is extracted automatically by the hardware and the
compiler, so it is almost transparent to the programmer.

## Processing Elements and Average ILP
To talk about how much ILP is actually achievable, we need two concepts.

First, a **Processing Element (PE)** is the smallest piece of hardware that
actually performs an operation. In the context of ILP you can think of it as
one functional unit such as an ALU or an FPU. The number of instructions
that can be processed in a single cycle is ultimately bounded by the number
of PEs.

Next, **Average ILP** is the value that tells us, assuming infinite
resources, how many instructions can be executed per cycle on average when
the program is run as fast as data dependencies allow.

$$
\text{Average ILP} = \frac{\text{total number of instructions}}{\text{length of the critical path (cycles)}}
$$

This value is the **ideal upper bound** that ignores resource constraints
and represents the parallelism inherent in the program. It is a different
concept from the IPC measured on a real machine.

As a simple example, consider the following five instructions.

```
I1: r1 = a + b
I2: r2 = c + d
I3: r3 = r1 * r2     ; depends on I1, I2
I4: r4 = e + f
I5: r5 = r3 + r4     ; depends on I3, I4
```

Following the data-dependency graph and scheduling as if resources were
infinite gives us:

| Cycle | Instructions executed in parallel |
|-------|-----------------------------------|
| 1     | I1, I2, I4                        |
| 2     | I3                                |
| 3     | I5                                |

There are 5 instructions in total and the critical path is `I1 → I3 → I5`,
which takes 3 cycles. So the Average ILP of this code snippet is
$5 / 3 \approx 1.67$. That means that even ideally we can only extract an
average of 1.67 instructions per cycle from this code.

If we run this code on a machine with only one PE, it still takes 5 cycles
and ILP is not exploited at all. Conversely, with 3 or more PEs, it can be
shortened to the 3-cycle limit that the dependencies allow. **The number of
PEs is the ceiling on how much ILP can actually be extracted.**

## Superscalar
A **superscalar** is a CPU structure designed so that multiple instructions
can be issued and executed in a single cycle. As we saw in the previous
section, extracting ILP in practice requires having several PEs, and a
superscalar CPU provides multiple copies of functional units such as ALUs,
FPUs, and load/store units, picking several independent instructions every
cycle and dispatching them to each PE.

The maximum number of instructions that can be issued per cycle is called
the **issue width**, and a machine with an issue width of $N$ is usually
called an "$N$-way superscalar". For example, a 4-way superscalar can issue
up to 4 instructions simultaneously every cycle.

### Comparison with Superpipelined Machines
Another approach to increasing throughput is the **superpipelined** machine.
Superpipelining chops each pipeline stage into smaller units, increasing
the number of stages and, in exchange, raising the clock frequency. The
number of instructions issued per cycle is still one, so it does not raise
Average ILP itself, but because the cycle is shorter, more instructions can
be processed per unit of time.

Summarising the differences between the two approaches:

| Aspect                | Superscalar                       | Superpipelined                    |
|-----------------------|-----------------------------------|-----------------------------------|
| What is increased     | Instructions issued per cycle     | Number of pipeline stages         |
| Resources needed      | Multiple PEs (functional units)   | Finer-grained stage circuitry     |
| Clock frequency       | Similar to the baseline           | Higher                            |
| Type of parallelism   | Spatial parallelism               | Temporal parallelism              |

Let's assume we execute the same eight instructions on three kinds of
machines. Assume none of the instructions depend on each other, and that
the baseline pipeline has 5 stages (IF, ID, EX, MEM, WB).

```
I1, I2, I3, I4, I5, I6, I7, I8   ; all independent
```

**(1) Plain scalar pipeline** — only one instruction is issued per cycle.
The first instruction finishes after 5 cycles, and after that one
instruction completes every cycle. Finishing all 8 instructions takes
$5 + (8 - 1) = 12$ cycles. IPC is $8/12 \approx 0.67$.

**(2) Superpipelined (10 stages, 2× clock)** — stages are split into twice
as many, doubling the clock. Still only one instruction issued per cycle,
but the cycle itself is shorter. The first instruction finishes after 10
(short) cycles, and then one instruction completes per short cycle, for a
total of $10 + (8 - 1) = 17$ short cycles. Converted to the original cycles,
that's $17 / 2 = 8.5$ cycles — roughly 1.4× faster than the scalar
pipeline.

**(3) 2-way superscalar (5 stages, 2 PEs)** — two instructions are issued
per cycle. On cycle 1 I1 and I2 enter IF, on cycle 2 I3 and I4 enter, and so
on. The first two instructions finish together after 5 cycles, after which
two instructions complete per cycle, for a total of $5 + (8/2 - 1) = 8$
cycles. IPC is $8/8 = 1.0$, which falls short of the 2.0 ideal limit of a
2-way machine because of warm-up, but for a sufficiently long instruction
stream it approaches 2.

| Machine                 | Time (in original cycles) | Relative speed |
|-------------------------|---------------------------|----------------|
| Scalar pipeline         | 12                        | 1.00x          |
| Superpipelined (×2)     | 8.5                       | 1.41x          |
| 2-way superscalar       | 8                         | 1.50x          |

Two observations can be made here. First, superpipelining raises throughput
along the **time axis** by pushing up the clock, whereas the superscalar
raises it along the **space axis** by adding more PEs. Second, the two
approaches are not mutually exclusive, and real modern CPUs combine a deep
pipeline with a wide superscalar issue, enjoying the benefits of both at
once.

## Limitations of the In-Order Pipeline
That said, the example above assumed there were no dependencies at all
between instructions. Real code is a mixture of data dependencies, branches,
and memory access latency, and when faced with this, an **in-order
pipeline** that issues instructions in program order runs into two big
problems.

### 1. As machine parallelism grows, utilisation drops sharply
An in-order pipeline can only issue instructions in program order, so if an
earlier instruction stalls, the later instructions must stall with it,
regardless of whether they actually depend on it. As issue width grows, the
penalty from "one stalled instruction empties out an entire cycle" grows
with it.

Consider the following code.

```
I1: r1 = load [r10]   ; cache miss, data arrives 4 cycles later
I2: r2 = r1 + 1       ; depends on I1
I3: r3 = r5 + r6      ; independent
I4: r4 = r7 + r8      ; independent
I5: r5 = r9 + r11     ; independent
I6: r6 = r12 + r13    ; independent
```

Executing this on a **2-way in-order superscalar** proceeds as follows.

| Cycle | Instructions issued | Notes                                          |
|-------|---------------------|------------------------------------------------|
| 1     | I1, —               | I2 depends on I1 → can't be issued same cycle  |
| 2     | (stall)             | waiting for I1's load data                     |
| 3     | (stall)             | ditto                                          |
| 4     | (stall)             | ditto                                          |
| 5     | I2, I3              | I1 result arrives, I2 issued                   |
| 6     | I4, I5              |                                                |
| 7     | I6, —               |                                                |

7 cycles for 6 instructions; the number of slots that could have been
filled is $7 \times 2 = 14$, yet only 6 were actually used.
**Utilisation is about 43%.** During the stalls in cycles 2–4, I3, I4 and
I5 were already ready, but could not enter because of the in-order rule.

Now let's run the same code on a **4-way in-order superscalar**.

| Cycle | Instructions issued | Notes                                          |
|-------|---------------------|------------------------------------------------|
| 1     | I1, —, —, —         | I2 depends on I1, so the rest is also blocked  |
| 2     | (stall)             |                                                |
| 3     | (stall)             |                                                |
| 4     | (stall)             |                                                |
| 5     | I2, I3, I4, I5      |                                                |
| 6     | I6, —, —, —         |                                                |

6 cycles in total, with $6 \times 4 = 24$ slots and only 6 used —
**utilisation is 25%.** We doubled the issue width, but total time only
dropped from 7 → 6 cycles, and most of the slots were empty. **The bigger
the machine parallelism, the larger the penalty from stalls grows in
proportion to the width, so beyond a certain point the added PEs barely do
any work — this is an inherent limitation of the in-order structure.**

### 2. Forwarding cannot solve this problem
The pipeline hazards we saw earlier could mostly be solved by
**forwarding**: the result computed in the EX stage is fed directly to the
EX input of the next instruction, rather than waiting for WB. But
forwarding only works **when the result has already been computed**.

Look at the I1 → I2 dependency in the example above. Because of the cache
miss, I1's result doesn't arrive from memory until 4 cycles later. No matter
how thoroughly forwarding paths are laid out, **you can't forward data that
does not yet exist.** In other words, forwarding reduces the **pipeline
delay** between "result produced → result used", but it cannot reduce the
**fundamental waiting time** that exists because "the data isn't there
yet." When a dependent instruction follows a multi-cycle operation such as
a cache miss, a floating-point division, or a long multiplication, an
in-order pipeline has no choice but to wait.

# Out-of-Order Execution
In the end, increasing issue width in an in-order design quickly runs into
diminishing returns, and conventional techniques such as forwarding cannot
overcome it. So, what if we ran a later instruction first while an earlier
one is stalled? That very idea is the starting point of **Out-of-Order
Execution (OoO)**.

As the name suggests, **OoO** is a style of execution that does not run
instructions in the order they appear in the program, but **runs those that
are ready first**. The core principles can be summarised as follows.

- **In-order fetch / decode**: The stages of fetching and decoding
  instructions still follow program order. We need to know the original
  order for branch prediction and dependency tracking.
- **Out-of-order execute**: Decoded instructions pile up in a kind of
  waiting room, and **whichever instruction has all of its required input
  values (operands) ready first** is issued to an available PE. Program
  order is ignored.
- **In-order commit**: Even after execution has finished, the result is not
  immediately reflected in the architectural state (register file, memory).
  Instead, it is **committed in program order**. This way, when a branch
  misprediction or an exception happens, the state can be cleanly rolled
  back as if the program had run in order.

Thanks to this "fetch in order, execute out of order, then finish in order"
structure, the programmer still sees instructions as executing one line at
a time in order, while the CPU internally extracts as much ILP as possible.

To actually build an OoO machine, there are several problems to solve.

1. **False dependencies** caused by reusing the same register name chain
   instructions together. How do we unravel this? → **Register Renaming**
2. How do we track which instructions have their operands ready, and
   distribute ready instructions to appropriate PEs? → **Reservation Station
   / Issue Queue**
3. What do we need to re-sort the results that executed out of order back
   into program order for commit? → **Reorder Buffer (ROB)**

Let's look at these three in turn.

## Register Renaming
When we try to reorder instructions, data dependencies trip us up. There
are three kinds of dependencies.

- **RAW (Read After Write, true dependency)**: The dependency we already
  met in pipelining. A later instruction reads a value that an earlier
  instruction wrote. This comes from the real data flow and can't be
  removed by any trick.
- **WAR (Write After Read, anti-dependency)**: A later instruction
  overwrites a register that an earlier instruction reads. If the order
  gets swapped, the earlier instruction ends up reading the wrong value.
- **WAW (Write After Write, output dependency)**: Two instructions write to
  the same register in order. If the order gets swapped, the final value
  is wrong.

WAR and WAW are in fact **false dependencies that arise from reusing the
same register name.** There is no real data flowing; it is just the
consequence of compilers having only a limited set of architectural
registers (RAX in x86, x1–x31 in RISC-V, etc.) and having to reuse the same
names. If we could just give them different names, these false dependencies
would vanish.

**Register Renaming** does exactly that. The CPU keeps a set of **physical
registers** that is much larger than the architectural register set, and
whenever an instruction writes to an architectural register, it allocates
a fresh free physical register. When a later instruction reads the same
architectural register, it reads from the most recently mapped physical
register. The result is that instructions sharing the same name now look at
different physical registers, so WAR and WAW disappear and only RAW
remains.

Consider the following code.

```
I1: r1 = r2 + r3
I2: r4 = r1 * 2       ; RAW dependency on I1
I3: r1 = r5 + r6      ; WAW with I1, WAR with I2
I4: r7 = r1 - r8      ; RAW dependency on I3
```

I3 has no data-flow relationship with I1 or I2 at all. It just happens to
reuse the name `r1`. Yet from the in-order point of view, I3 has to wait
for I1 and I2 to finish. If I1 stalls due to a cache miss, I3 and I4 stall
along with it.

Now let's apply renaming, allocating physical registers `p10, p11, p12,
...`. Assume the initial mapping is `r1→p1, r2→p2, ..., r8→p8`:

| Original instruction    | After renaming             | Updated mapping |
|-------------------------|----------------------------|-----------------|
| `I1: r1 = r2 + r3`      | `p10 = p2 + p3`            | r1 → **p10**    |
| `I2: r4 = r1 * 2`       | `p11 = p10 * 2`            | r4 → **p11**    |
| `I3: r1 = r5 + r6`      | `p12 = p5 + p6`            | r1 → **p12**    |
| `I4: r7 = r1 - r8`      | `p13 = p12 - p8`           | r7 → **p13**    |

Let's redraw the dependency graph after renaming.

- I1(`p10`) ← I2 (`p11` reads `p10`): **RAW**
- I3(`p12`) ← I4 (`p13` reads `p12`): **RAW**
- I1 and I3 no longer write to the same register → **WAW is gone**
- The fake WAR between I2 and I3 is also gone

In other words, the instruction stream cleanly splits into two independent
chains `(I1 → I2)` and `(I3 → I4)`. Even if I1 stalls, I3 and I4 are free
to run earlier, and on a 2-way superscalar both chains can progress at the
same time, hiding I1's latency.

Comparing the length of the critical path before and after renaming makes
the effect obvious. The original is chained as `I1 → I2 → I3 → I4` and
takes 4 cycles (because of the fake dependency), but after renaming
`I1 → I2` and `I3 → I4` run in parallel, so 2 cycles suffice. **Average
ILP has doubled from 4/4 = 1.0 to 4/2 = 2.0.** Once the false dependencies
are peeled away, the ILP hidden inside the program is revealed.

## Reservation Station (Issue Queue)
Renaming removed false dependencies, but RAW dependencies still remain.
Some instructions can't run yet because their input values haven't been
computed, while others can run right away. Every cycle we need a mechanism
that tracks **"who is ready to run now"** and dispatches ready instructions
to free PEs. The structure that plays this role is the **Reservation
Station (RS)**, also called the **Issue Queue**.

A renamed instruction does not go directly to a PE; it first enters one
slot (entry) of the RS and waits there. Each entry holds roughly the
following information.

| Field           | Meaning                                               |
|-----------------|-------------------------------------------------------|
| op              | Which operation (add, mul, load, ...)                 |
| dst             | Physical register number to write the result to       |
| src1, src2      | Physical register numbers of the input operands       |
| ready1, ready2  | Whether each operand's value is already ready (1/0)   |
| value1, value2  | The value itself, if already ready                    |

Right after renaming, operands whose values are already in the register
file enter with `ready=1`, while operands that are still being computed
enter with `ready=0`. Each cycle, the RS performs two actions in parallel.

1. **Wakeup**: When a PE finishes computing a result, the result is
   broadcast simultaneously to every entry in the RS over a shared bus
   called the **CDB (Common Data Bus)**. Entries whose waiting physical
   register number matches pick up the operand and flip their `ready` to 1.
2. **Select**: From entries whose two operands are both ready
   (`ready1 = ready2 = 1`), as many as there are available PEs are picked
   and issued. The selected entries leave the RS.

As these two actions repeat every cycle, instructions are executed
**independently of program order**, in whatever order they become ready.

## Reorder Buffer (ROB)
Thanks to the RS, instructions can execute in scrambled order. But if we
wrote the results back to the register file and memory immediately, big
problems would arise.

- **Branch misprediction**: If the branch predictor is wrong, the results
  of all the speculatively executed instructions after it must be
  discarded, but once they have been written to the register file they
  can't be undone.
- **Exceptions**: When an instruction raises an exception such as a page
  fault or a divide-by-zero, from the programmer's point of view,
  **every instruction before it must be reflected, and every instruction
  after it must not be.** As explained in the previous article, this is
  called a **precise exception**.

To satisfy both requirements, even though execution happens out of order,
the step of reflecting results into the architectural state must still be
performed in **program order**. The structure that plays this role is the
**Reorder Buffer (ROB)**.

The ROB is, as the name implies, a circular-queue buffer. At dispatch,
instructions take their places **in program order** one entry at a time.
Each entry roughly holds:

| Field           | Meaning                                              |
|-----------------|------------------------------------------------------|
| instruction kind | (add/mul/load/store/branch ...)                     |
| dst (logical)   | Which architectural register must be written         |
| dst (physical)  | Physical register that actually holds the result     |
| done            | Whether execution has finished (1/0)                 |
| exception?      | Kind of exception, if any                            |

An instruction's life goes like this.

1. **Dispatch (in-order)**: After decoding, it takes a slot at the ROB
   tail, and at the same time an entry is created in the RS.
2. **Execute (out-of-order)**: The RS sends a ready instruction to a PE for
   execution.
3. **Writeback**: When execution finishes, the result is written to the
   physical register and `done` is set to 1 in the corresponding ROB entry.
4. **Commit / Retire (in-order)**: When the entry at the **head** of the
   ROB has `done = 1`, that instruction is officially "completed." That is,
   the logical register mapping is updated so the result becomes visible
   externally, and if it is a store, the value is actually written to
   memory. Then the ROB head advances to the next slot.

If, in step 4, an entry has an exception marker, the ROB **discards that
entry and every entry behind it as a block**, and the RS is emptied too.
Branch mispredictions are handled the same way. Because not-yet-committed
instructions have had no effect on the architectural state, it's safe to
throw them away.

## Hiding Memory Latency with OoO
So far, the benefit of OoO has been focused on hiding short stalls between
ALU instructions, but in reality OoO's biggest gain in real CPUs comes from
**hiding memory access latency**.

Modern CPUs have fast clocks, but DRAM has not kept up, so the cost of a
single cache miss is horrendous.

OoO does not let that time go to waste. **While a load waits for the memory
response, OoO runs later instructions that are already in the ROB and RS
and that don't depend on that load.** By the time the load's result
arrives, a good chunk of the independent work has already been done.

### Load-Store Queue (LSQ)
Executing **memory-access instructions (load, store)** has one tricky
aspect. Registers can have their false dependencies removed by renaming,
but **memory addresses cannot be renamed.** Between two stores that write
to the same address, or between a load and a store that touch the same
address, there is a real data dependency, and furthermore, the address is
not even known until the instruction adds the base register and offset in
the EX stage.

The dedicated structure for dealing with this is the **Load-Store Queue
(LSQ)**. It is usually divided into two parts.

- **Store Queue (SQ)**: A store takes its slot at dispatch time. Once the
  address and the value to be written are computed, they are filled into
  its entry, but **the actual memory is not written until the ROB commits
  the instruction.** If squashed by a branch misprediction or an exception,
  we can just remove it from the SQ, so this is safe.
- **Load Queue (LQ)**: A load takes its slot at dispatch time. Loads
  usually need to run early and out of order to hide memory latency, so
  they fetch data without waiting for ROB commit.

The LSQ has two core problems to solve.

**1. Store-to-load forwarding** — Before a load fetches data from memory,
it must first check **whether any older store in the SQ has written to the
same address**. If so, even though that store has not yet been reflected in
memory, the load receives the value directly from the SQ. This is
**store-to-load forwarding**. Without it, the load would read the stale
value from the cache.

```
I1: store [r10], r1     ; writes r1 to the address in r10
I2: load  r2, [r10]     ; reads from the same address
```

Even if I1 has not yet been committed and is not in memory, I2 can receive
I1's value from the SQ directly and place it in `r2`.

**2. Memory disambiguation** — In principle a load can't execute until it
knows the addresses of all older stores. It can't tell whether some store
is going to write to the same address. But being so conservative destroys
almost all the OoO benefit. So modern CPUs **execute loads speculatively
too**. They assume "the older stores are going to be at different addresses
than me" and fetch from memory early.

Later, when those older stores actually learn their addresses, the CPU
**checks whether any already-executed loads in the LQ** are affected. If a
load that already read the same address is found, that load got the wrong
value, so it and every instruction after it are discarded just like a ROB
squash, and re-executed. This is called a **memory ordering violation**.

## Control Speculation in OoO
There has been one big assumption hidden in the explanation so far:
**enough later instructions are already in the ROB and RS**. For
straight-line code full of ALU instructions this isn't really a problem,
but real code has a **branch** every 5 or 6 instructions. When we hit a
branch, fetch can only continue once we know which instruction to fetch
next, and that decision isn't normally known until the branch instruction
actually runs in EX.

What if the CPU honestly said, "Let's wait until the branch is resolved"?
Then a big ROB and a wide issue width would all be useless. During the
tens of cycles the branch takes to resolve, the ROB would sit empty, and
the memory-latency-hiding effect we saw in the previous section would also
vanish. So for OoO to work meaningfully, **we must move past branches
without waiting for them**.

To this end we introduce **control speculation**. We **predict** the
branch outcome, assume the prediction is correct, and just keep fetching
later instructions, dispatching them to the ROB and executing them. If the
prediction was right, those instructions commit normally; if it was
wrong, they are all discarded and execution restarts from the correct
path.

Branch prediction itself was covered in the
[previous article](/blog/computer-branch-prediction/), so here I'll just
say "the predictor somehow tells us taken/not-taken and the target
address." What matters here is **how to roll back cleanly when the
prediction is wrong**, and **how to handle branches when fetching multiple
instructions in a single cycle**.

### Superscalar Fetch and Branches
A superscalar CPU fetches **several instructions at once** every cycle, not
just one. A 4-way CPU fetches 4 per cycle, an 8-way CPU fetches 8. But if
there is a branch inside that fetch group, how should we determine the
next cycle's nextPC (nPC)?

Let's look at three cases using a 2-way fetch.

**Case 1: Neither instruction is a branch, or both are predicted
not-taken**

The ordinary case. Just continue with the next two instructions, so

$$
nPC = PC + 8
$$

(assuming 4-byte instructions). Instruction fetch continues without
interruption.

**Case 2: One of the two is a branch predicted as taken**

In this case nPC becomes that branch's **predicted target address**.

$$
nPC = \text{predicted target}
$$

If the taken branch sits in the **second** slot of the fetch group, the
first instruction is sent down the pipeline normally, and from the next
cycle fetch continues from the target.

**Case 3: Both instructions are branches**

This is the trickiest. We have to look at the prediction for the first
branch first.

- If the first branch is predicted **not-taken**, the second branch is
  kept and nPC is decided by its prediction.
- If the first branch is predicted **taken**, the second branch has
  **already been fetched in the same cycle**. But if the first branch is
  taken, the second branch is in fact an instruction that shouldn't
  execute at all, so **even though it was fetched, it must be flushed out
  of the pipeline**. nPC becomes the first branch's predicted target.

This last scenario highlights an intrinsic inefficiency of superscalar
fetch. The larger the issue width, the higher the probability of having
more than one branch in a single fetch group, and the more often **fetch
slots get wasted**. To reduce this loss, modern CPUs use multi-ported BTBs
and predictors that can do several branch predictions in one cycle, but
fundamentally "handling multiple branches in a single cycle" significantly
raises the complexity of the fetch stage.

### Recovery from a Wrong Prediction
We can only know a branch was mispredicted when the branch instruction
actually runs in EX. But by then the ROB and RS are already full of
instructions from after the branch, and some of them may already have
finished execution and written their results to the physical register
file. All of this must be rolled back **as if it had never happened**.

Fortunately, thanks to the ROB's in-order commit rule we saw earlier, the
instructions on the wrong-prediction path have **not yet been committed**.
In other words, they have not yet touched the architectural register file
or memory. So recovery proceeds like this.

1. **Squash**: Discard **every entry after the mispredicted branch** in
   the ROB. The corresponding entries in the RS are emptied too. The
   physical registers that the discarded instructions were occupying are
   returned to the free list.
2. **Restoring the RAT**: Register Renaming tracks "which physical
   register each architectural register is currently mapped to" in the
   **Register Alias Table (RAT)**. A snapshot of the RAT is saved at the
   time the branch was predicted, and on a misprediction it is rolled
   back to that snapshot. Only then can renaming resume "as if we were
   executing from right after this branch."
3. **Fetch restart**: PC is set to the correct branch target and fetch
   begins again from there.

All of this is usually designed to finish within one or two cycles in
hardware. But from there it still takes several tens of cycles for the ROB
to refill, new instructions to reach the EX stage, and the backend to get
back to full throughput. This total cost is called the **branch
misprediction penalty**, and in the deep pipelines of modern CPUs it is
typically around 15–20 cycles. That's why a 1% drop in branch prediction
accuracy can have such a big impact on performance.

Consider the following code.

```
I1: cmp r1, 0
I2: beq L1            ; branch, predicted taken
I3: r2 = r3 + r4      ; (instructions on the predicted path)
I4: r5 = r2 * r6
I5: store [r7], r5
L1: ...
```

On an OoO + branch-prediction machine:

- **Cycle 1**: I1 and I2 are dispatched. The predictor tells us "I2 is
  taken", so fetch jumps to L1 and **the RAT at this point is saved as a
  snapshot**.
- **Cycle 2~**: Instructions after L1 are continuously dispatched and
  enter the ROB, and some begin executing in the RS.
- **Cycle 5**: I2 actually runs in EX and reveals that it was really
  **not-taken**. The prediction was wrong.
- **Cycle 6**: Every ROB entry after I2 (the post-L1 instructions) is
  squashed. The RS is emptied. The RAT is restored from the snapshot saved
  in Cycle 1.
- **Cycle 7~**: PC is set back to I3 and fetch restarts. I3, I4, I5 begin
  to be dispatched anew.

Without squashing, the instructions on the L1 side would have been
committed and the wrong result would become visible to the programmer.
Thanks to the ROB's in-order commit rule and the RAT snapshot, a wrong
prediction is silently absorbed without surfacing outside.

# P6 Style vs R10K Style
The OoO structures we've described so far have been an abstract model, but
real CPUs fall into two big streams. The key difference is **"where the
instruction's result value is stored."**

| Aspect                 | P6 style                           | R10K style                           |
|------------------------|------------------------------------|--------------------------------------|
| Representative CPUs    | Intel Pentium Pro/II/III, AMD K8 (Opteron) | MIPS R10000, Alpha 21264, Intel Sandy Bridge onward |
| Result storage         | Stored inside the ROB entry        | Unified Physical Register File (PRF) |
| Architectural RF       | Separate from the ROB (ARF)        | No separate ARF — part of PRF plays its role |
| Commit action          | **Copies** the ROB value into the ARF | Updates the RAT mapping — **no data movement** |
| Operand read           | From ROB or ARF                    | Always from the PRF                  |

## P6 Style (Pentium Pro, AMD K8/Opteron Core)
This style first appeared in the 1995 Intel Pentium Pro. Its name
"P6 microarchitecture" is where "P6 style" comes from. AMD's K8 (Opteron,
Athlon 64) core also belongs to the same family.

The core idea of this style is that **the ROB does two jobs at once**.

1. Original ROB role: line instructions up in order to guarantee commit
   order
2. Additional role: **directly holds the result values of the
   not-yet-committed instructions**

That is, in P6 style, when an instruction finishes executing, its result
value is recorded in a field of its ROB entry. There is no separate
physical register file. When commit time comes, the value in the ROB entry
is **copied into a separately existing Architectural Register File (ARF)**
and the ROB entry is emptied.

A ROB entry looks roughly like this.

| Field         | Meaning                               |
|---------------|---------------------------------------|
| op            | Instruction kind                      |
| dst (logical) | Which architectural register to write |
| **value**     | **Computed result value** (unique to P6) |
| done          | Whether execution has finished        |
| exception?    | Exception marker                      |

In this design, when an instruction in the RS reads its operands, it has
to look in two places. If the value has **already been committed**, it
comes from the ARF; if it's an **in-flight value that hasn't been committed
yet**, it comes from the ROB entry. The RAT acts as a pointer that says
"the most recent value of this architectural register is in the ARF — or
in which ROB entry."

**Pros**:
- The structure is intuitive, and restoring the RAT is relatively simple.
  On a branch misprediction, you just throw away the squashed ROB entries
  and leave the ARF untouched.
- Precise exceptions are easy to guarantee. Values in the ARF are by
  definition ones that have been committed, so the ARF itself is the
  "architectural state."

**Cons**:
- The same value can live in **both** the ROB and the ARF, wasting storage.
- On every commit, values must be **physically copied** from the ROB to
  the ARF. As issue width grows, the number of commit ports must grow too,
  which is expensive.
- Putting the value into the ROB entry makes each entry bigger, and
  building a large ROB becomes harder.

AMD's Opteron (K8) core also belongs to this family. K8 introduced
variants, such as splitting the integer ROB from the floating-point ROB,
but the essence — "result values live inside the ROB" — stayed the same.
For the K8 integer core, instead of a unified reservation station it
adopted a **distributed scheduler** with small RSes per instruction type,
and the integer RS was built to copy the operand values directly into
itself at dispatch time.

## R10K Style (MIPS R10000)
This style was formalised in the MIPS R10000 in 1996, and Alpha 21264, IBM
Power, and Intel (from Sandy Bridge in 2011) all moved to it. Today
virtually every high-performance OoO CPU is R10K style.

The key idea is to **get rid of the separate ARF and keep every register
value in a single Physical Register File (PRF)**. The PRF has many more
entries than the architectural register count (e.g., the MIPS R10000 has
64 physical integer registers for its 32 architectural integer
registers), and both in-flight values and committed values live in this
single place.

Here the ROB **does not hold values**. Instead it only keeps mapping
information such as "this instruction is supposed to write to which
physical register."

| Field               | Meaning                                   |
|---------------------|-------------------------------------------|
| op                  | Instruction kind                          |
| dst (logical)       | Architectural register number             |
| **dst (physical)**  | **Newly allocated physical register number** |
| **prev dst (physical)** | **Physical register that previously held the same logical register** |
| done                | Whether execution has finished            |
| exception?          | Exception marker                          |

When an instruction is dispatched, one free physical register is pulled
from the free list and placed in `dst (physical)`, and the physical
register that **was pointing to the same logical register just before** is
saved in `prev dst`. This information is essential for managing the free
list on squash and commit.

When an instruction finishes executing in EX, it writes its result
directly into the `dst (physical)` slot of the PRF. **That's it.** There
is no need to move data at commit time. Other instructions in the RS were
already looking at the PRF from the start, so forwarding is possible as
soon as the value is written.

So what does commit do? It doesn't do anything dramatic — just **two
things**.

1. Update the RAT (architectural map): record "the official mapping of
   this logical register is now the new physical register." This table is
   used to restore the RAT on squash.
2. Return the old physical register named in `prev dst` **to the free
   list**. Nobody looks at the old mapping anymore.

Conversely, on squash: the `dst (physical)` of the discarded ROB entries
is returned to the free list, and the RAT is restored from the snapshot
taken at branch-prediction time.

**Pros**:
- Commit is very lightweight. There's no data copy, just pointer updates.
- The result value exists in only one place in the PRF, so no storage is
  wasted.
- ROB entries become smaller, which means a bigger ROB fits in the same
  area — and that directly enlarges the window for hiding memory latency
  we discussed in the previous section.
- With the PRF ports designed carefully, the wakeup and forwarding
  circuits become simpler.

**Cons**:
- The free list, RAT, and ROB must all mesh together in a more
  complicated way. Restoring the free list on squash is tricky and
  requires a separate history buffer or walk mechanism.
- The PRF itself becomes a very large multi-ported SRAM, with a big area
  and power overhead. In a 4-way machine, the issue stage alone may need
  8 read ports.

## MIPS R10000 vs AMD Opteron Core
These two CPUs appeared in almost the same era (around 1996) but show
opposing design philosophies.

| Aspect                     | MIPS R10000 (1996)         | AMD Opteron K8 Core (2003) |
|----------------------------|----------------------------|----------------------------|
| Style                      | R10K (PRF based)           | P6 (value inside ROB)      |
| Issue width                | 4-way                      | 3-way (x86 macro-ops)      |
| ROB entries                | 32                         | 72                         |
| Physical registers         | 64 int + 64 FP             | No separate PRF (values in ROB and ARF) |
| Reservation station        | Split by instruction type (16+16+16) | Integer/FP split, many small RSes |
| Branch misprediction penalty | ~5 cycles                | ~10 cycles                 |
| Memory instruction handling | LSQ (16 entries)          | LSQ (44 entries)           |

The R10000 is regarded as the cleanest OoO design from an academic and
theoretical standpoint. Unified PRF, clear RAT and free-list management,
RSes split by instruction type — it has served as a blueprint for almost
every subsequent OoO CPU. However, with only 64 physical registers and 32
ROB entries, its window was narrow, and by today's standards its ability
to hide memory latency was limited.

The Opteron K8 chose the P6 style in order to run the complex x86 ISA with
OoO. It decodes x86 instructions into internal macro-ops, and each macro-op
goes through the ROB, RS and LSQ to be executed. Thanks to the P6 style,
Intel and AMD could directly leverage the Pentium Pro lineage's know-how,
and on that foundation K8 put in a large ROB (72) and a wide LSQ (44),
showing memory performance that surpassed the contemporary Pentium 4.

Interestingly, Intel itself kept the P6 style up through the Pentium 4,
and only from **Sandy Bridge (2011)** switched to the R10K style unified
PRF. The reason is simple — to keep growing the ROB, the R10K style was
eventually required. Today Apple's M series, ARM Cortex-X series, AMD Zen,
and Intel Golden Cove are all R10K style, with **ROBs ranging from 200 to
600 entries**. It was only on top of the R10K style that the huge
instruction windows needed to survive the memory wall era became possible.

# Chip Multiprocessors
So far we've been talking about pulling out as much ILP as possible from a
single core, but from the mid-2000s onward the limits of this direction
became clear. Even as issue width grew and the ROB grew, the performance
gain per added transistor shrank, and more importantly, the **power and
thermal problems that prevented raising the clock any further (the power
wall)** delivered the finishing blow. The moment the Pentium 4 hit the
4 GHz wall is symbolic.

The alternative that emerged at that point is the
**Chip-Multiprocessor (CMP)**, commonly called the **multicore** design.
Rather than making one core bigger and faster, the idea is to **put
several cores of moderate size on a single die**. Starting with the 2005
AMD Athlon 64 X2 and Intel Pentium D, every mainstream CPU since then has
been a multicore.

CMP **invests the transistor budget in TLP (Thread-Level Parallelism)
rather than ILP**. Because each core runs its own thread independently,
throughput can scale roughly linearly with the number of cores, without
the dependency, branch, and cache-miss headaches you get when squeezing
ILP. Going back to the ILP/TLP/DLP classification from the beginning of
this post, where superscalar and OoO were the hardware for ILP, CMP is
the hardware for TLP.

Of course, it isn't free. Because multiple cores share the same memory, a
**cache coherence** protocol is needed, and from the programmer's side
**explicit multithreaded programming** is required to actually benefit
from multicore. A single-threaded program still runs on just one core no
matter how many cores there are. For this reason, the introduction of
CMPs marked the transition from the era of "hardware getting faster on
its own" to the era of "software having to deal with parallelism
explicitly."
