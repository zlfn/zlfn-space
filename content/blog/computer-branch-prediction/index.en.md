+++
title = "CPU Branch Prediction"
date = 2026-04-13
description = "Learn about the branch prediction techniques used in modern CPUs."

[taxonomies]
tags = ["computer-architecture", "CPU"]

[extra]
series = "/series/csed311/"
+++

Let's explore the various branch prediction techniques used in CPUs.

> This article is based on the content of POSTECH's CSED311 course,  
with some additional topics not covered in the lectures.

# Branch Prediction
Branch prediction is a technique that **guesses ahead of time** what a branch
will do, before the branch outcome has been resolved, so that the CPU
pipeline can keep fetching instructions without stalling. There are two
things to predict: whether the branch will be *taken* (the branch condition
is satisfied) or *not taken* (direction prediction), and, if it is taken,
where it will jump to (target address prediction).

The branch predictor decides, in the IF stage, which address to fetch on the
next cycle. Whether it picks the taken address or the not-taken address
depends on the specific implementation and the optimizations it uses.

Later in the pipeline the actual branch outcome becomes known. In the ID or
EX stage, the CPU finds out something like "this instruction was a branch,
and it actually was taken, so we should have jumped to the target / it was
not taken, so we should just fetch the next sequential instruction."

At that point the prediction is compared against the real outcome. If the
address the branch predictor picked in IF matches the actual result, nothing
happens. But if the predictor was wrong, the wrongly fetched instructions
sitting in the pipeline are invalidated, the PC is rolled back to the
correct address, and fetching starts over from there.

As an example, suppose we have the following code.

```asm
0x1000:  beq  x1, x2, TARGET   # branch
0x1004:  add  x3, x4, x5       # executed if not taken
0x1008:  sub  x6, x7, x8
...
TARGET (0x2000):
0x2000:  or   x9, x10, x11     # executed if taken
```

The moment the CPU fetches the `beq` at `0x1000` in the IF stage, assume the
branch predictor kicks in and predicts "this branch will be not taken."
Then, on the next cycle, the CPU fetches the `add` at `0x1004` as predicted,
and after that the `sub` at `0x1008`. The pipeline keeps flowing without
waiting for the branch outcome.

A few cycles later, the `beq` reaches the EX stage and the real branch
outcome is computed.

- **Correct prediction**: if it really was not taken, the `add` and `sub`
  that are already being executed can stay as they are. There is no branch
  penalty at all.
- **Misprediction**: if it was actually taken, then `add` and `sub` are
  instructions that should never have executed. They are flushed from the
  pipeline, the PC is restored to `0x2000`, and fetching restarts from
  `or`. The cycles thrown away here are called the
  **branch misprediction penalty (branch penalty)**.

In the end, the goal of the branch predictor is to minimize these
mispredictions and reduce the number of times the pipeline has to stall.


## PC + 4 Prediction
PC + 4 prediction is the simplest form of branch prediction. It
**unconditionally predicts every branch as not taken**, so even right after
a branch instruction the CPU just fetches `PC + 4`. Its big advantage is
that it needs no dedicated prediction hardware at all.

The problem is accuracy. In real programs, about **60–70% of branches are
taken**, especially because backward branches that form loops are almost
always taken. As a result, the per-branch accuracy of an always-not-taken
predictor is only around **30–40%**, which is a little worse than a coin
flip.

Assume a code with no data hazards, where 20% of instructions are branches
and about 70% of those branches are taken. PC + 4 prediction predicts every
branch as not taken, so it only mispredicts on branches that are actually
taken. The fraction of all instructions that are mispredicted is therefore

$$
P\_{\text{miss}} = 0.20 \times 0.70 = 0.14
$$

That is about **14%**, or, flipped around, a prediction accuracy of about
**86%**.

Performance can be measured in IPC (Instructions Per Cycle). In the ideal
case IPC is 1, and it drops by the average number of stall cycles caused by
mispredictions.

$$
\text{IPC} = \frac{1}{1 + P\_{\text{miss}} \times \text{penalty}}
$$

Here the branch penalty depends on which pipeline stage the branch is
resolved in. The later it is resolved, the more instructions have already
been fetched in the meantime and must be thrown away.

**If the branch is resolved in the MEM stage**, IF to MEM is three cycles
apart, so a misprediction costs 3 cycles.

$$
\text{IPC}\_{\text{MEM}} = \frac{1}{1 + 0.20 \times 0.70 \times 3} = \frac{1}{1.42} \approx 0.70
$$

That is **30%** below the ideal IPC of 1.0.

**Moving branch resolution up to the EX stage** drops the penalty to 2
cycles.

$$
\text{IPC}\_{\text{EX}} = \frac{1}{1 + 0.20 \times 0.70 \times 2} = \frac{1}{1.28} \approx 0.78
$$

That is about an **11%** improvement over MEM.

**Pushing resolution further up to the ID stage** reduces the penalty to
just 1 cycle.

$$
\text{IPC}\_{\text{ID}} = \frac{1}{1 + 0.20 \times 0.70 \times 1} = \frac{1}{1.14} \approx 0.88
$$

Another **13%** improvement over EX. But there is a limit to how far
branch resolution can be moved up. Computing the branch condition in the
ID stage requires cramming the register file read and the comparison logic
into that stage, and pushing it any earlier is essentially impossible.

So the remaining question becomes: "**how do we reduce that 0.7
misprediction probability itself?**" In other words, we need to increase
the accuracy of the prediction step itself.

## Always-Taken Prediction
In the earlier assumption, 70% of branches were taken. So what if we
**predict every branch as taken** instead of not taken? The misprediction
rate drops from 0.7 to 0.3.

$$
P\_{\text{miss}}^{\text{taken}} = 0.20 \times 0.30 = 0.06
$$

But this introduces a new problem. To predict a branch as taken, we have
to **know the branch target address** so we can put it into IF on the next
cycle — but in the IF stage the instruction has not even been fetched yet.
The target address is encoded as an offset inside the instruction, so
until we decode it we have no way to know where it would jump. From the
current PC alone, there is nothing to guess from.

## Branch Target Buffer
The BTB (Branch Target Buffer) is the hardware that solves the problem
raised above: **how do we know a branch's target address in the IF stage
from the current PC alone?**

Its structure is similar to a cache. It is a table keyed by the branch
instruction's PC, holding the target address the branch jumped to
previously as the value. When a branch is executed for the first time and
its outcome is known, the branch's PC and target address are recorded in
the BTB. The next time an instruction is fetched from that PC, looking up
the BTB tells us — before any decoding — that "**there was a branch
instruction at this address, and its target is here**."

Looking at the operation: in the IF stage, the branch predictor looks up
the BTB with the current PC. On a miss, the PC is not in the BTB, so we
assume it is not a branch and fetch the next instruction from PC + 4. On
a hit, it means a branch was previously seen at this PC, so we predict
taken and fetch the next instruction from the target address stored in
the BTB.

Later in the pipeline, once the real branch outcome is known, the BTB is
updated. New branches are inserted, and existing entries are updated if
the target address has changed.

### Tagged BTB
Because the BTB has the same structure as a cache, it is indexed in the
same way and suffers from the same collision problems. The BTB is
finite-sized, so a wide PC cannot be used directly as an index. Instead,
a few of the low-order bits of the PC are used to look up an entry. For
example, a 256-entry BTB is indexed with the low 8 bits of the PC.

The problem is that two different branch instructions may map to the same
index. A branch at PC `0x1000` and one at `0x2000` share the same low
bits and therefore point to the same BTB entry. One side's target address
may then overwrite the other side's, and the branch predictor can end up
jumping to a completely wrong address. This is actually worse than merely
mispredicting a branch, because it may cause the CPU to jump to an
instruction that is not a branch at all, executing wildly incorrect code.

**Tagged BTB** adds a tag to detect these collisions. The low-order bits
of the PC are still used for indexing, but the high-order bits are stored
alongside as a tag. On lookup, after finding the entry by index, the
stored tag is compared against the high-order bits of the current PC. If
the tag matches, it is a true hit; if not, it means a different branch
occupies this slot, and the lookup is treated as a miss.

# Dynamic Branch Prediction
Up to this point we have predicted every branch as one of two fixed
options: *taken* or *not taken*. This approach is called **static branch
prediction**. In contrast, **dynamic branch prediction** records a
history of branch outcomes during program execution and adjusts its
predictions based on that history.

The limitation of static prediction shows up in the fact that **a single
program contains branches with completely different biases**. For
example, suppose one program has the following two branches.

- **Branch A (loop back-edge)**: the termination branch of a construct
  like `for (j = 0; j < 10; j++)`. Taken 9 out of 10 times, so about
  **90% taken**.
- **Branch B (error check)**: a construct like `if (err != 0) { handle(); }`.
  Since errors rarely occur in normal operation, this is about
  **1% taken**.

If we predict "always taken," A is right 90% of the time but B is right
only 1% of the time. Conversely, "always not taken" makes B right 99%
of the time but A right only 10%. Whichever direction you fix, branches
with the opposite bias are almost always mispredicted.

The "60–70% of branches are taken" statistic is just an **average**;
individual branches in the real world are mostly polarized toward
**almost always taken** or **almost always not taken**. Because a dynamic
predictor **learns each branch's bias individually**, it can make A
converge to taken and B to not taken, achieving high accuracy on both.

## Pattern History Table
The **PHT (Pattern History Table)** is one of the simplest dynamic branch
prediction methods: a table that stores a counter per branch address.
Just like a BTB, it is indexed by the low-order bits of the branch PC to
read the corresponding counter, and the counter value decides whether
we predict *taken* or *not taken*.

### 1-Bit Predictor

A 1-bit predictor is the simplest form of a PHT. Its counter has two
states, *0* or *1*. If the branch was taken last time, it stores 1; if
not taken, it stores 0; and it predicts the same way next time. The
problem is that the prediction flips far too easily. In a loop that
iterates 10 times, the last iteration exits with not taken, flipping
the counter to 0, and when we re-enter the loop it predicts not taken
and mispredicts again.

As an example, consider the following nested loop.

```c
for (int i = 0; i < 1000; i++) {
    for (int j = 0; j < 10; j++) {
        // ...
    }
}
```

Let's focus on the termination branch of the inner loop. This branch
runs 10 times per iteration of the outer loop, 9 of which are taken
(continue looping) and the final 1 of which is not taken (exit the
loop). Let's see what a 1-bit predictor does with this branch. Assume
we have just entered the outer loop for the second time, and the PHT
counter is initialized to `0` (not taken), the value stored at the end
of the previous outer-loop iteration.

| Iteration | Counter (Prediction) | Actual | Correct? | Counter after update |
|:---:|:---:|:---:|:---:|:---:|
| 1 | 0 (N) | T | No | 1 |
| 2 | 1 (T) | T | Yes | 1 |
| 3 | 1 (T) | T | Yes | 1 |
| ... | ... | ... | ... | ... |
| 9 | 1 (T) | T | Yes | 1 |
| 10 | 1 (T) | N | No | 0 |

It gets **2 out of 10** wrong: once on loop entry (because the counter
is 0 from the previous outer-loop exit, so the first iteration misses)
and once on loop exit. Accuracy is stuck at
$\frac{8}{10} = 80\\%$.

The problem is that **a single mistake contaminates the next prediction
as well**. Not taken shows up just once in ten times, yet because of it
the first iteration of the next loop entry is also mispredicted. To fix
this, the 2-bit predictor was introduced.

### 2-Bit Predictor
The 2-bit predictor solves the 1-bit predictor's problem by expanding
the state to four values: *00 (strongly not taken)*, *01 (weakly not
taken)*, *10 (weakly taken)*, *11 (strongly taken)*. The high-order
bit decides the prediction: 10 and 11 predict taken, 00 and 01 predict
not taken. There are two variants of the 2-bit predictor, depending on
the state-transition rules.

**The 2-bit saturating counter** increments the counter by 1 on taken
and decrements it by 1 on not taken, saturating at 11 (max) and 00
(min). In the strongly-taken (11) state, one misprediction moves it to
weakly taken (10), but the high-order bit is still 1, so it still
predicts taken. This way a single misprediction at the end of a loop
does not shake the prediction, solving the earlier 1-bit predictor
problem.

**The 2-bit hysteresis counter** uses slightly different state
transitions. The two bits are interpreted as a direction bit and a
hysteresis bit. The direction bit decides the prediction, and the
hysteresis bit is used to decide "whether or not to flip the direction
bit."

There are three transition rules. On a correct prediction, set the
hysteresis bit to 1 and go to the strong state. On a wrong prediction
from a strong state (hysteresis = 1), only the hysteresis bit drops to
0, moving to the weak state. On a wrong prediction from a weak state
(hysteresis = 0), flip the direction bit and set the hysteresis bit
back to 1.

The difference from the saturating counter shows up at the moment the
prediction flips. In the saturating counter, when 10 (weakly taken)
mispredicts it moves to 01 (weakly not taken). But in the hysteresis
counter, when 10 (weakly taken) mispredicts it moves straight to 01
(strongly not taken), starting off in the strong state right away. In
both cases it still takes two consecutive mispredictions to flip the
direction, but the confidence level after flipping is different.

In practice, the accuracy difference between the two schemes is known
to be small, and most modern CPUs use the saturating counter. The
important point is that the prediction is not flipped on a single
misprediction — it takes two consecutive mispredictions to change it.

Let's rerun the nested-loop example we used for the 1-bit predictor
with a 2-bit saturating counter. The inner loop's termination branch
runs 10 times per outer-loop iteration: 9 taken, 1 not taken.

First, let's trace what state the counter is left in at the end of the
previous outer-loop iteration. Entering the loop in the strongly-taken
(`11`) state, it gets 9 in a row right and misses on the 10th, dropping
the counter to weakly taken (`10`), which is where the outer-loop
iteration exits. So the state left in the PHT is `10`.

Now the outer loop comes back around and re-enters the inner loop.

| Iteration | State (Prediction) | Actual | Correct? | State after update |
|:---:|:---:|:---:|:---:|:---:|
| 1 | 10 (T) | T | Yes | 11 |
| 2 | 11 (T) | T | Yes | 11 |
| 3 | 11 (T) | T | Yes | 11 |
| ... | ... | ... | ... | ... |
| 9 | 11 (T) | T | Yes | 11 |
| 10 | 11 (T) | N | No | 10 |

Only **1 out of 10** is wrong. With the 1-bit predictor we lost both
the loop exit (iteration 10) and the re-entry (iteration 1), but the
2-bit predictor only drops from `11 → 10` on the exit miss, and since
the high-order bit is still 1, **on re-entry it still predicts taken**.

## Global Path History
A 2-bit state-machine-based branch predictor is known to reach about
90% accuracy assuming the PHT is large enough. The remaining sub-10%
consists of branches with complicated patterns. According to Amdahl's
law, which we discussed earlier, improving this last portion should
hardly change overall CPU speed — improving less than 10% has only a
tiny effect on the whole.

Yet modern CPUs use branch predictors far more complex and more
accurate than the ones above. More complex circuitry costs more, so
why would they go to such lengths just to nudge accuracy up a little?

The reason is that as CPU pipelines have gotten deeper, misprediction
penalties have grown dramatically. In a 5-stage pipeline, improving
branch prediction accuracy by 1% barely matters, because a
misprediction only wastes a handful of cycles. But in modern CPUs with
10- or 20-plus stages, a single misprediction throws away dozens of
cycles, so the value of even a 1% accuracy improvement grows much
larger.

One of the most representative branch-prediction techniques used in
modern CPUs is **Global Path History**. Instead of indexing the PHT
by the branch PC alone, it also incorporates the outcomes of recent
branches.

Why does the outcome of surrounding branches help? Consider a simple
example. Suppose a program has **three branches that are correlated
with each other**:

```c
if (x == 0) { ... }            // B1
if (y == 0) { ... }            // B2
if (x == 0 && y == 0) { ... }  // B3
```

B3's outcome is completely deterministic. If B1 and B2 were both taken
then B3 is definitely taken; otherwise it is definitely not taken. In
theory it is a branch that can be predicted with 100% accuracy.

But what happens if the 2-bit PHT we saw earlier only looks at B3 in
isolation? The values of `(x, y)` change from one execution to the
next, so from this predictor's point of view B3's outcomes look like a
random mix of taken and not taken. The counter keeps getting jerked
around, and accuracy converges at best to the fraction of cases where
`(x, y) = (0, 0)`. As long as we only look at B3's own PC, there is no
way to capture this correlation.

A Global Path History predictor keeps the taken/not-taken results of
the most recently executed branches in a **GHR (Global History
Register)**. As the name suggests, it is a single register shared
across the entire program (global); every time a branch result comes
in, it shifts in one bit, keeping the most recent N outcomes. For
example, with a 2-bit GHR, by the time we reach B3 the GHR holds the
outcomes of the immediately preceding two branches (B1 and B2).

| Previous (B1, B2) | GHR | Actual B3 result |
|:---:|:---:|:---:|
| (T, T) — `x=0, y=0` | `11` | T |
| (T, N) — `x=0, y≠0` | `10` | N |
| (N, T) — `x≠0, y=0` | `01` | N |
| (N, N) — `x≠0, y≠0` | `00` | N |

If we mix this GHR value with B3's PC to index the PHT, the four cases
map to four different PHT entries. Each entry only ever learns B3's
outcome under its own GHR context, so the (T, T) entry always
converges to taken and the other three to not taken. Outcomes that
looked random when B3 was viewed on its own become perfectly
deterministic patterns once we separate them by GHR context. With
this, B3's accuracy approaches 100%.

More generally, Global Path History takes the correlation between a
branch's outcome and its neighbors, bakes it into the PHT index, and
lets the predictor learn patterns that a single 2-bit predictor could
never capture.

### GShare Branch Predictor
In the description above, I glossed over "mix the GHR value with B3's
PC to index the PHT," but the question of **how** to mix them is the
real remaining problem. The simplest and most widely used answer to
that question is the **GShare** predictor, proposed by Scott McFarling
in 1993.

First, let's see why just using the GHR alone or the PC alone would
not work. If you index the PHT with only the GHR, then two branches
with completely different PCs will share the same PHT entry whenever
they happen to hit that PC with the same GHR. Unrelated branches
fight over the same counter and ruin each other's predictions — this
is **aliasing**, and it becomes severe. On the other hand, using only
the PC is the same as the plain PHT we saw earlier, which cannot
capture any correlation with surrounding branches at all.

So what about **concatenating** the PC and the GHR? For example,
concatenating the low 6 bits of the PC with a 6-bit GHR gives a 12-bit
index, making the PHT $2^{12} = 4096$ entries. Every `(PC, GHR)`
combination gets its own independent entry, which solves aliasing,
but now the **PHT has to grow as the product of the two bit widths**.
Worse, real programs only ever touch a tiny fraction of the possible
`(PC, GHR)` combinations, so the vast majority of entries go unused.

GShare's idea is simple: **XOR the PC and the GHR and use the result
as the index**.

$$
\text{index} = \text{PC}[n-1:0] \oplus \text{GHR}[n-1:0]
$$

If the PHT has $2^{12}$ entries, take the low 12 bits of the PC and a
12-bit GHR, XOR them, and use the 12-bit result as the index. The
table size stays at $2^{12}$, but **both** the PC and the GHR
information are folded into the index. It uses both pieces of
information without blowing up the table the way concatenation does.

Of course, GShare is not perfect. Two different `(PC, GHR)` pairs can
still have **the same XOR**. For example, `PC = 0x100, GHR = 0x010`
and `PC = 0x010, GHR = 0x100` both XOR to `0x110`. More sophisticated
predictors — Bi-Mode, Agree Predictor, TAGE, and others — were later
introduced to cut down this **destructive aliasing**. But GShare
achieves most of Global Path History's benefits with the one-line
idea of "PC ⊕ GHR," which made it the de facto standard for a long
time after 1993 and remains a common baseline when evaluating new
predictors.

### Two-Level Branch Predictors
More generally, branch predictors can be described in a single
framework. This framework was laid out by Yeh and Patt in 1991–92
under the name **Two-Level Adaptive Branch Prediction**, and almost
every commercial CPU's branch predictor since has been a variation
within this framework.

The "Two-Level" in the name means that prediction goes through
**two levels of storage**. The first level is the **BHR (Branch
History Register)**, a register that records recent branch outcomes
as a bit string. The GHR we saw earlier was just the special case of
a single global BHR; the Two-Level framework allows per-branch or
per-set BHRs as we'll see, which is why the more general name BHR is
used. The second level is the **PHT**, a 2-bit saturating counter
table indexed by the history value from the first level.

What's interesting is that each of the two levels can be **organized
in several ways**. Yeh and Patt listed three options per level.

- **Global (G/g)**: a **single** structure shared by the entire
  program. For the first level, one global BHR; for the second level,
  one global PHT. This uses the least hardware and naturally captures
  correlations between branches. The downside is that unrelated
  branches share the same structure and can suffer heavy aliasing.
- **Per-address (P/p)**: a **separate** structure **per branch PC**.
  For the first level, a separate BHR per branch PC; for the second
  level, a separate PHT per branch PC. Each branch learns its own
  history and pattern independently, so aliasing is almost eliminated,
  but the number of entries scales with the number of branches and
  hardware cost is high.
- **Per-set (S/s)**: branches are divided into groups (sets), and the
  structure is provided **per group**. Usually a few bits of the PC
  select the set number, and branches in the same set share a BHR or
  PHT. This sits between global and per-address, providing a
  compromise that lowers hardware cost while still cutting aliasing
  to some extent.

Yeh and Patt summarized these combinations with a three-letter
notation **XAY**. The uppercase first letter is the first-level
organization (`G`/`P`/`S`), the middle `A` is a fixed letter for
"Adaptive," and the lowercase last letter is the second-level
organization (`g`/`p`/`s`). With 3 choices for the first level and 3
for the second, there are **9 possible combinations**.

| Name | Level 1 (BHR) | Level 2 (PHT) | Description |
|:---:|:---:|:---:|:---|
| **GAg** | 1 global BHR | 1 global PHT | The simplest form. The PHT is indexed by the history value alone. |
| **GAs** | 1 global BHR | Per-set PHT | Global history plus selecting one of the per-set PHTs to index. |
| **GAp** | 1 global BHR | Per-branch PHT | The PC picks a PHT, and the history indexes within it. |
| **SAg** | Per-set BHR | 1 global PHT | Per-set history looked up in a single global pattern table. |
| **SAs** | Per-set BHR | Per-set PHT | Both per-set. A midpoint compromise between global and per-address. |
| **SAp** | Per-set BHR | Per-branch PHT | History is per-set, pattern table is per-branch. |
| **PAg** | Per-branch BHR | 1 global PHT | Each branch's own history looked up in a single global pattern table. |
| **PAs** | Per-branch BHR | Per-set PHT | History is per-branch, pattern table is shared per set. |
| **PAp** | Per-branch BHR | Per-branch PHT | Both per-branch. The highest accuracy, but also the highest hardware cost. |


### Tournament Predictor
All of the predictors we've seen so far pick "one prediction
strategy" and apply it to every branch in the program. But real
programs contain branches with very different characters — for some,
local history (the branch's own past outcomes) is the biggest clue;
for others, correlation with surrounding branches (global history)
is key. The inner-loop termination branch we saw earlier, for
instance, is one whose **own past pattern** repeats, so a local
predictor is better; a correlated branch like B3 depends on the
**outcomes of immediately preceding branches**, so a global predictor
is better.

So what if we **run both and pick whichever one is doing better for
each branch**? The most famous implementation of this idea is the
**Tournament Predictor** of the **DEC Alpha 21264 (1998)**. It was
the first commercial CPU to adopt the **combined predictor**
structure that Scott McFarling proposed in a 1993 technical report,
and for a long time it has been the textbook example of branch
prediction.

The 21264's predictor consists of three sub-tables.

1. **Local Predictor (PAp structure)**: a 1024-entry BHR table
   holding a 10-bit local history per branch PC, and a 1024-entry
   3-bit counter PHT indexed by that history. Strong on branches with
   a clear self-pattern.
2. **Global Predictor**: a 12-bit global history register that
   indexes a 4096-entry 2-bit counter PHT. Strong on
   correlation-based branches.
3. **Choice Predictor**: as the name says, a predictor that predicts
   **which predictor to trust**. It is a 4096-entry 2-bit counter
   table indexed by the global history, and each counter's value is a
   learned answer to "in this situation, is local more likely to be
   right, or global?"

On every branch, all three tables are looked up **simultaneously**.
Local and Global each produce their own taken/not-taken prediction,
and Choice picks the one that is "more trustworthy" as the final
prediction. When the branch outcome is confirmed, the local and
global predictors' counters are updated the usual way. The choice
predictor is treated a bit specially: **only when exactly one of the
two predictors was right** is the choice counter nudged toward the
one that was right. When both are right or both are wrong, the
choice counter is left alone, because in those cases there is
essentially no information about which predictor is better.

With this scheme, the 21264 **dynamically** picks the predictor best
suited to each branch's character. It was noticeably more accurate
than either pure PAp or pure GShare alone, reaching about
**90–100%** accuracy on benchmarks of the time. Many high-performance
CPUs afterward inherited this **multiple predictors + chooser** idea
in one form or another.

## Other Branch Prediction Techniques
The BTB and PHT-based predictors covered so far are **general-purpose**
methods for predicting conditional branch direction (taken/not taken)
and target address. But real CPUs use a number of additional
techniques specialized for particular situations. In this section we
briefly look at a few of the ones most often mentioned.

### Return Address Stack
Function return instructions are not predicted well by the BTB alone.
The same return instruction (i.e., the same PC) **goes back to a
different place** every time it executes. If a function `foo` is
called from dozens of different sites, its return instruction needs
dozens of different target addresses depending on the caller. Since
the BTB only remembers "where did this PC jump to last time,"
predictions break every time the call site changes.

The **Return Address Stack (RAS)** is a small **hardware LIFO stack**
inside the CPU that solves this problem. Its operation is simple: on
a **call** instruction, push the address of the next instruction
(PC + 4) onto the RAS; on a **return** instruction, pop the RAS and
use the popped value as the predicted target address.

One question arises here: in the IF stage, the instruction has not
been decoded yet, so how does the CPU know whether the PC it is
fetching right now is a return or a regular branch, and therefore
whether to use the RAS or the BTB? The answer is that the **BTB
entry also stores the branch type**. When a branch is first executed
and decoded, its type — `conditional`, `call`, `return`, etc. — is
recorded in the BTB, and when the same PC is fetched again, a BTB
hit that says "this is a return" tells the CPU to pop from the RAS
instead of using the BTB's target field. In other words, the RAS and
the BTB aren't a "pick one of two" relationship — **the BTB acts as
a type dispatcher** that brings in the RAS when appropriate.

The RAS is usually implemented as a small circular buffer with
**8–32 entries**, so if recursion exceeds that depth, the oldest
entry gets overwritten and overflow occurs. The returns that fall
inside the overflow region get wrong addresses from the RAS and are
mispredicted, but once recursion unwinds and we come back inside the
RAS's depth, subsequent returns are recovered correctly. The
important thing is that this is only a **performance loss**, not a
**correctness problem**. The actual return address is still stored
in the in-memory stack frame, and the moment the real target address
is confirmed in the EX stage, the pipeline is flushed and execution
jumps to the correct place — the program never actually returns to
the wrong location. Modern CPUs almost universally include this RAS
structure as a basic feature.

### Trace Cache
**Trace Cache** is, strictly speaking, not a branch prediction
technique but an optimization of the **instruction fetch path**. It
is nevertheless often mentioned alongside branch prediction because
it has a direct impact on branch-handling performance.

A normal I-cache stores instructions **in address order**. So when a
taken branch is encountered, after jumping to the target, a **new
cache line has to be read**, which makes it hard to fetch
instructions across multiple basic blocks in a single cycle. In
high-performance CPUs with deep pipelines that need to fetch many
instructions per cycle, this becomes a bottleneck.

A trace cache instead stores instructions **in execution order**. It
bundles the path the program actually ran (a sequence of basic blocks
strung together along taken branches) into a single "trace" and
caches it, so that the next time the same path is encountered, the
CPU can fetch instructions **spanning multiple basic blocks at once**.
On top of that, the instructions are stored in a pre-decoded form,
which also eases the burden on the decode stage.

**Intel Pentium 4 (NetBurst microarchitecture, 2000)** is the most
famous adopter of this scheme, but due to the low density and high
power consumption caused by duplicating instructions, it was dropped
in Core 2. Later, starting with Sandy Bridge (2011), Intel revived a
similar idea in a much smaller form, the **µop Cache**, and has kept
it in use ever since.

### TAGE
**TAGE** (TAgged GEometric history length predictor) is a predictor
announced by André Seznec in 2006. It is one of the most accurate
known branch predictors to date, and most modern high-performance
CPUs — **Intel processors since Haswell (2013)**, **AMD Zen family**,
**Apple Silicon**, and others — adopt it in some variant form.

The core idea is that **branches predictable from short history** and
**branches needing very long history** coexist in a single program.
Most branches are accurately predicted from just a few bits of
history, but a minority of tricky branches only reveal their pattern
given tens to hundreds of bits. At the same time, attaching hundreds
of bits of history to every branch would blow up the table size and
make aliasing much worse.

TAGE solves this by using **multiple tables with geometrically
increasing history lengths**. For example, it might use 6 tables with
history lengths of 0, 4, 10, 25, 64, and 160 bits, each indexed with
its own history length. Like cache tags, each entry carries a
**tag** that verifies "is this entry really about this branch with
this history?"

On a prediction, all tables are looked up simultaneously, and the
prediction from **the table with the longest history among those
whose tags match** is used as the final output. If no tag matches,
the predictor falls back to the shortest-history table (a plain
bimodal). This way, branches that are satisfied by short histories
get handled by a short table, and tricky branches that need long
histories follow the long table's prediction when its tag matches.
The number of tables grows only logarithmically, yet the **range of
history lengths it can cover grows geometrically** — that is the
power of this structure.

TAGE has topped the Championship Branch Prediction Workshop contests
for years, and follow-on variants like TAGE-SC-L and TAGE-GSC
continue to be proposed.

### Perceptron Predictor
The **Perceptron Predictor** is an approach proposed by Jiménez and
Lin in 2001 that views branch prediction as a **machine learning
problem**. The perceptron (an ancestor of 1950s neural networks) is
the simplest linear classifier: it takes the dot product of an input
vector and a weight vector and makes a binary classification based on
the sign. The perceptron predictor carries this structure straight
into branch prediction.

Each branch has its own weight vector. The inputs are the bits of the
global history register (interpreted as +1 or -1), and the weights
are small integers (for example, in the range -127 to 127). The
prediction is made by taking the dot product of the weights and the
history bits: if the sum is positive, predict taken; if negative,
predict not taken. When the actual branch outcome is known, **only
when the prediction was wrong or when confidence was low** are the
weights nudged slightly in the direction of each history bit, which
constitutes the learning step.

This scheme's biggest strength is that it can use **very long
histories at linear cost**. Where a conventional PHT with $n$ bits of
history needs a $2^n$ table, a perceptron only needs $n$ weights, so
histories of hundreds of bits are realistic. As a result, it shines
on branches with long-range correlations.

Its weakness is just as clear. A perceptron is a **linear
classifier**, so it cannot learn linearly inseparable patterns like
XOR. For example, a pattern like "taken when the two immediately
preceding branches had **different** outcomes, not taken when they
had the same outcome" cannot be accurately predicted by a single
perceptron.

**AMD Bulldozer (2011)** is known to be the first commercial CPU to
adopt this approach, and subsequent AMD Piledriver and Jaguar
families used it in modified forms. From AMD Zen onward the trend
has shifted toward TAGE-family predictors, but the perceptron is
still frequently used as one component of a hybrid predictor.

# Compiler-Level Branch Optimization
So far we have looked at ways **hardware** dynamically predicts
branches at runtime. But another axis for improving branch-prediction
performance is the **compiler**. Compilers use source code structure
and static analysis results, or profile information, to reduce
branches themselves, to lay out code in ways friendlier to the
predictor, or even to eliminate branches entirely.

## If-Conversion
No matter how accurate prediction is, the **probability of being
wrong** can never be driven to zero. So what if we get rid of the
branch altogether so that "we don't need to predict it at all"? That
is the idea behind **if-conversion** (also known as **predication**).
The compiler converts a conditional branch into **predicated
instructions**, so that both paths are **executed simultaneously**
and only the result from the matching side is committed to a
register.

For example, consider the following code.

```c
if (a > 0) x = y + 1;
else       x = y - 1;
```

A normal compilation emits a conditional branch on `a > 0` and
executes only one of the two paths. With if-conversion it turns into
roughly this:

```
cmp  a, 0
(p1) x = y + 1   ; commits only if p1 is true
(p2) x = y - 1   ; commits only if p2 is true
```

Both instructions run without any branch, but the result is
committed to the register on only one side depending on the
predicate bit. Since the branch is gone entirely, there is **no such
thing as a misprediction**. The cost is that both paths always run,
increasing the work done, and if the paths are long or unbalanced,
this can actually be a loss. So if-conversion is selectively applied
mainly to **short, balanced branches**.

**ARM** (pre-ARM32 instruction sets had nearly every instruction
conditional), **Intel Itanium** (full predication in IA-64), and
**GPUs** (which handle every intra-warp branch via predication) are
the most prominent examples of aggressive use of this technique.
x86/x86-64 lacks full predication but provides partial support
through limited conditional-move instructions like `cmov`. For
example, the following code is often compiled on x86-64 without any
branch, using `cmov`.

```c
int max(int a, int b) {
    return (a > b) ? a : b;
}
```

```asm
cmp  edi, esi
cmovg eax, edi    ; if a > b, put a into eax
cmovle eax, esi   ; otherwise, put b into eax
```

## Static Branch Hints
When the developer already knows the bias of a particular branch,
they can pass that information directly to the compiler. GCC/Clang's
`__builtin_expect` is the typical example. The `likely()` /
`unlikely()` macros widely used in the Linux kernel wrap this
builtin.

```c
#define likely(x)   __builtin_expect(!!(x), 1)
#define unlikely(x) __builtin_expect(!!(x), 0)

void process(int *p) {
    if (unlikely(p == NULL)) {
        handle_error();
        return;
    }
    // ... normal processing ...
}
```

With this hint, the compiler **places the normal path as the
fall-through (the path that runs straight through with no branch)**,
and moves the rare error-handling path to the back of the function
or to a separate section, inserting a jump to it. From the CPU's
perspective, the rarely used error code no longer pollutes the
I-cache and the BTB, and the frequently used normal path stays as
straight-line code, improving fetch efficiency.

Since C++20, the standard `[[likely]]` / `[[unlikely]]` attributes
have been added, so the same optimization can be requested without
a builtin.

```cpp
if (value < 0) [[unlikely]] {
    throw std::invalid_argument("negative");
}
```

**Rust** has long idiomatically used the `#[cold]` attribute. By
extracting a rare path into a separate function and marking it
`#[cold]`, the compiler treats that call site as unlikely and
rearranges the code accordingly.

```rust
#[cold]
#[inline(never)]
fn handle_error() -> ! {
    panic!("invalid input");
}

fn process(p: Option<&i32>) {
    let Some(v) = p else { handle_error() };
    // ... normal processing ...
}
```

Since Rust 1.83, `std::hint::likely` / `std::hint::unlikely` have
been stabilized, so they can be used in roughly the same style as
C++20. That said, the `#[cold]` function pattern is still more
widely used in the community.

## Profile-Guided Optimization (PGO)
There is a limit to how many hints a developer can attach manually.
You cannot put `likely`/`unlikely` on every one of hundreds of
thousands of branches, and a human's guess at bias often diverges
from the actual runtime statistics.

**PGO (Profile-Guided Optimization)** solves this problem by using
**actual profile measurements**. It typically works in two stages.

1. **Instrumented build**: the compiler produces a binary with a
   counter inserted at each branch. This is run against a
   representative workload to gather statistics on "which branch is
   taken how often."
2. **Optimized build**: the collected profile is fed back to the
   compiler, which rearranges the code according to the
   **measured bias directions**. Hot paths are laid out as
   straight-line code, cold paths are pushed to the back, and even
   inlining decisions are tuned based on the profile.

In GCC, PGO is applied in the order `-fprofile-generate` → run →
`-fprofile-use`; in Clang, `-fprofile-instr-generate` →
`-fprofile-instr-use`. On large-scale server code, performance
improvements from a few percent to more than 10% have been observed.
Companies like Google and Facebook build most of their internal
infrastructure with PGO, and recently approaches like LLVM's
**AutoFDO**, which feeds the data obtained from a sampling profiler
(`perf`) directly into PGO, have also seen widespread use.

## Basic Block Placement
One of the most important optimizations that actually uses the bias
information provided by PGO or static hints is **basic block
placement**. The compiler reorders the basic blocks inside a
function based on their execution frequency.

```c
int f(int x) {
    if (x < 0) {
        return -1;          // rare path
    }
    return compute(x);      // common path
}
```

If the basic blocks are laid out in source order, the common case
where `x >= 0` requires "conditional branch → taken → jump to
target." If the compiler **places the common path as the
fall-through**, this becomes "conditional branch → not taken → just
execute the next instruction." A taken branch is slightly more
expensive than a not-taken branch on the fetch side, and once these
small differences accumulate they become non-trivial.

Going further, the compiler may also move **very rare paths
(exception handling, error logging, cold initialization)** out of
the function into a separate section like `.text.cold`. This way
only the hot path is brought into the I-cache, and rarely used code
is pushed onto an entirely separate page, significantly reducing
cache and TLB pressure.

### Itanium's `brp` and TAR
Taking this one step further, **Intel Itanium (IA-64)** extended
"code placement" all the way into ISA-level instructions, providing
dedicated instructions with which the compiler can **fire hints
directly at the branch predictor**. This feature aligns with
Itanium's declared **EPIC (Explicitly Parallel Instruction
Computing)** philosophy: "let the compiler statically take over as
much of what the hardware would otherwise decide dynamically as
possible."

**`brp` (Branch Predict)** is an instruction that **primes the
branch predictor ahead of time**. It tells the hardware in advance
that "a branch will soon come at this PC, its target address is
here, and its direction is this way," so that the CPU can have the
BTB and prediction counter state ready before the actual branch
instruction is even fetched. It's a kind of **software-directed
branch-prediction prefetch**.

```asm
brp.sptk  target_addr, clr       # a branch to target_addr is coming soon
                                 # request strongly-taken prediction
...
// (several instructions later)
br.cond   target_addr            # the actual branch — the predictor is already primed
```

A normal hardware predictor can only predict correctly **from the
second occurrence of a branch onward**, but with `brp` it is
possible to hit **even on the very first execution**, because the
predictor was primed ahead of time. That is the key difference.

**TAR (Target Address Register)** is a mechanism for indirect
branches. Itanium's indirect branches read the jump target not from
a general-purpose register but from a dedicated **Branch Register**
(`b0`–`b7`), and on top of that structure there is a separate
target-address register and a mechanism that pre-links its contents
to the predictor. If the compiler loads the indirect branch's
target address into TAR well in advance, then by the time the
actual `br.call` or similar instruction executes, the predictor
already knows the target and can jump without misprediction. This
is useful for branches that are hard to predict with a normal BTB,
such as virtual function calls or function pointer calls.

Itanium's `brp` and TAR embody the approach of **"don't wait for
the hardware predictor to learn — have the compiler put the answer
in ahead of time."** In theory it is very powerful, but in practice
it turned out to be hard for compilers to predict branch behavior
accurately enough to attach useful hints, and along with Itanium's
own commercial failure the idea faded from the mainstream.
Nonetheless, the idea of **embedding branch-prediction hints
directly in the ISA** has left its mark on several research
processors and some embedded ISAs.

## Loop Unrolling
A loop's termination branch runs as many times as the loop iterates.
**Loop unrolling** is an optimization that expands the loop body
several times to reduce the iteration count itself.

```c
// original
for (int i = 0; i < n; i++) {
    sum += a[i];
}

// unrolled by 4
for (int i = 0; i < n; i += 4) {
    sum += a[i];
    sum += a[i+1];
    sum += a[i+2];
    sum += a[i+3];
}
```

There are two benefits from a branch-prediction standpoint. First,
the termination branch's execution count drops from `n` to `n/4`,
reducing the cost of the branch instruction itself. Second, the
larger loop body exposes more **Instruction-Level Parallelism
(ILP)**, giving the OoO engine more room to work. The downside is
that the code size grows and I-cache pressure goes up, so compilers
pick the unroll factor carefully.

## Function Inlining
`call` and `return` instructions are themselves branches. Thanks to
the RAS their prediction accuracy is high, but they still add
instructions and incur register save/restore overhead. **Function
inlining** inserts the body of a small function directly at the call
site, eliminating the call/return pair entirely.

```c
static inline int square(int x) { return x * x; }

int sum_of_squares(int a, int b) {
    return square(a) + square(b);
    // after inlining: return (a * a) + (b * b);
}
```

Not only does the call overhead disappear, but the inlined code can
combine with the constants and type information in the calling
context, opening up **additional optimization opportunities** — and
this is usually the bigger win. The compiler decides whether to
inline based on function size, call frequency, recursion, and so on,
and becomes significantly more aggressive when PGO information is
available.
