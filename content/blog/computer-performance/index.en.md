+++
title = "Measuring Computer Performance"
date = 2026-04-11
description = "Learn about the definition and measurement of computer performance."

[taxonomies]
tags = ["computer-architecture", "CPU"]

[extra]
series = "/series/csed311/"
+++

Let's explore the definition and measurement of computer and CPU performance.

> This article is based on the content of POSTECH's CSED311 course,  
with some additional topics not covered in the lectures.

# What is Computer "Performance"?
When we judge the performance of software and systems, we often use the word
"fast." But what exactly is fast? There are two main metrics that define
system performance.

The first is **Latency**. Latency is the time it takes for a single request
to complete from start to finish. For example, consider the time it takes
for a CPU to execute a single instruction: when there is a `load` instruction
that reads data from memory, the latency is the time from when the instruction
is issued until the result arrives in the register.

The second is **Throughput**. It refers to the amount of work a processor
can handle per unit of time. Throughput is especially important when
processing multiple tasks simultaneously, such as compiling a large codebase.

At first glance, it seems like the relationship `Throughput = 1/Latency`
should hold. If the latency for each instruction decreases, throughput
should naturally increase too. But that's not the case. A prime example is
a superscalar processor, which has multiple execution units and can process
several tasks at once. The latency of individual instructions stays the same,
but throughput increases.

## Measuring Time
CPU performance ultimately comes down to time. If latency is short,
requests take less time, so performance improves. If throughput is high,
the same amount of work finishes faster, so performance is also higher.
There are several ways to measure time on a CPU. The UNIX `time` command
uses the following terminology:

* **Wall Clock Time (Elapsed Time)** is the "actual" time that passes from
  when you start a program until the result appears. It is the most
  intuitive since it reflects the time a user actually experiences, but it
  includes not just the program you want to measure, but also processing
  from other programs, interrupts, and other factors.
* **User CPU Time** is the time the CPU spends purely executing your code.
  Only the time spent running your functions, loops, and computations on
  the CPU counts.
* **System CPU Time** is not the direct execution of your code, but the
  time the OS kernel spends working on behalf of your code. System calls
  such as reading files, allocating memory, and sending network packets are
  included in this time.

If you subtract User CPU Time and System CPU Time from Elapsed Time, there
is some time left over — this is time consumed independently of your program.
It includes time when other processes occupied the CPU, waiting for disk I/O,
or when the scheduler delayed your process's turn.

Therefore, when measuring and reporting process performance, you must be
precise about which metric you measured. User CPU Time lets you judge the
efficiency of your code itself, while Wall Clock Time measures the actual
wait time a user experiences on the system.

## CPU Clock and FLOPS
A major factor affecting performance is the CPU **Clock**. The CPU clock is
the signal that synchronizes all operations inside the CPU. At 1GHz, one
billion ticks occur per second, and each tick is 1 nanosecond long.
At 4GHz, it becomes 0.25 nanoseconds. Since all CPU computations proceed in
sync with this tick, a faster clock means tasks requiring the same number
of cycles can be completed in less time.

However, clock speed alone cannot evaluate CPU performance. According to the
Iron Law of processor performance, a program's execution time can be
expressed as the product of three factors:

```text
cpu time = (time/cycle) x (cycles/instruction) x (instructions/program)
```

Here, `cycles/instruction` (the number of cycles per instruction) is called
**CPI** (instructions per cycle is IPC), and instructions per second is
called IPS. It is usually measured in millions of instructions per second,
known as **MIPS** (Million Instructions Per Second).

Looking at the Iron Law, since the clock period `(time/cycle)` is directly
multiplied into performance, it seems like simply increasing the clock speed
would improve performance. However, increasing the clock speed can deepen
the pipeline, raising CPI and potentially decreasing performance. Also,
simplifying the ISA to reduce CPI may require more instructions to do the
same work. Therefore, you cannot judge a program's performance by looking
at only one of clock speed, CPI, or instruction count — when optimizing a
CPU, you must always consider the balance of all three factors.

In scientific computing, performance is also measured using **FLOPS
(Floating Point Operations Per Second)**. FLOPS represents the number of
floating-point operations a computer can perform per second. In scientific
computing fields such as physics simulations, weather forecasting, and
matrix operations, floating-point operations are central, so floating-point
operation speed is used as a metric instead of integer operation speed.
As of 2026, typical smartphones have 1–10 teraflops, while supercomputers
used by weather agencies and research institutes have performance on the
order of hundreds of petaflops.

## Evaluation Criteria Beyond Time
While time is the primary performance metric for processor computation,
execution time is not the only performance indicator. In reality, processors
consume power and generate heat, so minimizing these is also an important
evaluation criterion.

Additionally, implementation cost, reliability, and security are important
metrics for evaluating processors. No matter how good a processor is, it is
not practical if its design or manufacturing costs too much. How stable and
error-free a system operates is also important. For example, if you
arbitrarily overclock a processor to force higher execution speed, the
execution speed will increase, but reliability will decrease.

Processor security refers to side-channel attack defense, memory protection,
and similar features. Adding security features can increase execution time,
making this another trade-off in processor performance. For example, during
the 2017 Meltdown/Spectre vulnerability incident, resolving the issue
required abandoning several OS optimizations, resulting in significant
performance degradation. Evaluating CPUs with such vulnerabilities against
those without them, without considering these factors, would not be fair.

## Amdahl's Law
Amdahl's Law states that no matter how much you speed up a part of a
program, the overall performance improvement is limited by the proportion
that part occupies.

$$T_{\text{new}} = T_{\text{old}} \times \left((1-f) + \frac{f}{S_f}\right)$$

$$S_{\text{overall}} = \frac{T_{\text{old}}}{T_{\text{new}}} = \frac{1}{(1-f) + \frac{f}{S_f}}$$

In the formulas above, f is the fraction of the total that the improvable
portion occupies, and $S_{\text{f}}$ is how much faster that portion was made.

For example, if you make a part that accounts for 80% of program execution
time 4 times faster, the execution time improvement is
$\frac{1}{(1-0.8) + 0.8/4} = \frac{1}{0.2 + 0.2}$ = 2.5x.
Even though the majority of the program was made 4 times faster, the overall
speedup is only 2.5x. Even in the extreme case where that part is made
infinitely fast, reducing its execution time to 0, the remaining 20% never
shrinks, so the limit is 5x.

# Measuring Program Performance
To measure program performance, we run **benchmarks** — a set of tasks for
the computer to perform. Whether a program is a good benchmark can be
evaluated by the following criteria:

* The workload must be clearly defined in terms of what tasks to perform.
* It must produce concrete numerical metrics such as time or throughput.
* It must be reproducible. Running it again under similar conditions should
  yield similar results.
* It must be portable. Being able to port it to various platforms and run it
  on multiple systems makes cross-system comparison of benchmark results
  meaningful.
* It must be possible to verify that the benchmark was executed correctly,
  such as by producing meaningful output. If the benchmark does not verify
  correctness, compilers may optimize away meaningless computations,
  producing high numbers unrelated to actual performance.
* It must be clear which devices can run it and which optimizations are
  allowed. Otherwise, vendors can run benchmarks under favorable conditions
  to inflate their numbers.

Currently, the most representative benchmark is **SPEC**. SPEC is an
industry standard for measuring intensive CPU computation performance,
stressing the processor, memory subsystem, and compiler.

Outside the industry, in the general consumer market, benchmarks such as
Cinebench, Geekbench, and 3DMark are widely used to measure overall system
performance in environments similar to actual computer usage.

## Averaging Benchmark Results
When consolidating benchmark results, the typical approach is to run various
benchmarks multiple times and average the results. However, there are
several ways to compute such averages.

### Arithmetic Mean
The **Arithmetic Mean** is the most commonly used averaging method in
everyday life, where you add up all the execution times and divide by the
count. However, this approach has the problem that programs with long
execution times dominate the average.

The **Weighted Arithmetic Mean** addresses this problem by incorporating
the execution frequency of each program as a weight when computing the
arithmetic mean. The performance of frequently used programs is reflected
more heavily, producing an average closer to actual usage patterns.

### Geometric Mean
The **Geometric Mean** is an averaging method where you multiply all values
together and take the nth root. The aforementioned SPEC uses this method.
The greatest advantage of the geometric mean is that it produces consistent
results regardless of the weighting ratios of each program.

For example, suppose there are two machines and programs as follows:

|Machine|Program A|Program B|
|-------|---------|---------|
|X      |10 sec   |100 sec  |
|Y      |20 sec   |50 sec   |

Normalizing performance relative to X, machine Y gets A = 2.0, B = 0.5.
The arithmetic mean is 1.25, making machine Y appear slower. Conversely,
normalizing relative to machine Y, machine X gets A = 0.5, B = 2.0. The
arithmetic mean is also 1.25, producing the contradictory result that both
are 1.25x slower than the other.

The geometric mean eliminates this problem. Machine Y relative to X:
$\sqrt{2.0 \times 0.5}$ = 1.0, machine X relative to Y:
$\sqrt{0.5 \times 2.0}$ = 1.0. Both are 1.0, yielding the consistent
conclusion that the two machines have equal performance.

However, the geometric mean has the disadvantage that it has no direct
relationship to the aggregate of execution times, making intuitive
interpretation of the averaged results difficult.

### Harmonic Mean
The **Harmonic Mean** is the reciprocal of the arithmetic mean of the
reciprocals of each value. It is suitable for averaging rate metrics.
For example, when averaging "throughput per unit time" metrics like MIPS or
FLOPS, using the arithmetic mean introduces distortion. If you run a program
at 10 MIPS for 1 second and a program at 100 MIPS for 1 second, saying the
arithmetic mean is 55 MIPS overestimates actual performance. The harmonic
mean gives more weight to the slower side, producing a more accurate average
for rate metrics.
