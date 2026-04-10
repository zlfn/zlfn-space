+++
title = "Computer Architecture and RISC-V"
date = 2026-04-10
description = "An introduction to computer architecture and the structure of RISC-V CPUs."

[taxonomies]
tags = ["computer-architecture", "RISC-V", "CPU"]

[extra]
series = "CSED311: Computer Architecture"
series_path = "/blog/series-csed311/"
+++

Let's explore computer architecture and the structure of RISC-V CPUs.

> The content of this post is based on POSTECH's CSED311 course,  
> supplemented with some additional topics not covered in class.

# What is Architecture?
Computer architecture is the interface specification between hardware and software.
Specifically, it defines the following aspects, centered around the Instruction Set Architecture (ISA) that the CPU understands:

* Instructions: What operations (addition, branching, memory access, etc.) are supported and in what format they are expressed
* Registers: How many registers there are, how many bits each holds, and what each is used for
* Memory model: Address space size, byte order (endianness)
* Exception/Interrupt handling: How errors and external events are handled

**Architecture** is an **abstraction layer** that remains the same regardless of the actual hardware implementation. As long as a compiler generates code conforming to this specification, the code will run on any chip that implements that architecture. Therefore, even if the manufacturers differ, users can run the same OS and applications as long as the architecture is the same. (Think of AMD and Intel x86-64 CPUs.)

On the other hand, **microarchitecture** is the internal design that implements the "contract" of an architecture in actual hardware. Optimizations and implementation details such as pipelines, out-of-order execution, and branch prediction fall under the microarchitecture.

## Types of Architecture
The main types of computer architecture include von Neumann architecture, Harvard architecture, and dataflow architecture, among others.

### Von Neumann Architecture
**Von Neumann architecture** is the fundamental computer structure proposed by John von Neumann, and it forms the foundation of nearly all general-purpose computers today. Computers before the von Neumann architecture (such as ENIAC) required physically rewiring to change programs.

At the time, Mauchly and Eckert, who developed ENIAC, conceived the idea of storing both programs and data in the same memory while designing the successor computer EDVAC. This approach had the advantage that simply loading a program into memory allowed different tasks to be performed with a single set of wiring. (Later, von Neumann distributed a report summarizing this idea as the sole author, which is how this structure came to be named the von Neumann architecture.)

The von Neumann architecture executes programs by having the CPU repeatedly fetch instructions from memory, decode them, and execute them. Since instructions and data share the same memory and the same data bus, no matter how fast the CPU is, performance is limited by memory bandwidth — this is known as the Von Neumann Bottleneck. For this reason, while modern CPUs are based on the von Neumann architecture, they do not use the traditional von Neumann structure as-is, but rather combine it appropriately with the Harvard architecture described below.

### Harvard Architecture
**Harvard architecture** is an architecture that originated from Harvard University's Mark I computer around the same time as the von Neumann architecture. Since the Mark I read instructions from punched tape and data from mechanical counters separately, unlike the von Neumann architecture, it has a structure where instruction memory and data memory are physically completely separated.

The Harvard architecture separates the buses for instructions and data, allowing instructions and data to be read simultaneously, which provides higher throughput. However, the capacity between the two memories cannot be flexibly divided, and a separate mechanism is needed to transfer programs to instruction memory. In modern times, the Harvard architecture is used in some fields such as microcontrollers (like the AVR found in Arduino) and DSPs (Digital Signal Processors).

### Modified Harvard Architecture
**Modified Harvard architecture** is a compromise between the von Neumann and Harvard architectures, adopted by most modern CPUs. At the L1 cache level, the I-cache and D-cache are separated to gain the benefit of high bandwidth from the Harvard architecture, while the memory below that level is unified to maintain the flexibility of the von Neumann architecture. From the CPU's perspective, since the L1 cache memory is separated into instruction and data portions, it operates like a Harvard architecture; but from the perspective of compilers and programmers, who do not directly manage the cache, the computer can be treated as having a single address space.

### Dataflow Architecture
**Dataflow architecture** is a fundamentally different architectural paradigm from the Harvard or von Neumann architectures described above. In the von Neumann approach, a program counter sequentially specifies the "next instruction to execute." Dataflow architecture was designed to break free from the limitation of sequential instruction execution in the von Neumann approach, and it has no program counter.
In a dataflow architecture, instructions execute immediately once all required data is ready, without a program counter sequentially specifying which instruction to perform. Rather than having the programmer or hardware determine the order of program execution, the data itself determines the flow of execution.

In a dataflow architecture, a program is represented not as a sequential list of instructions, but as a directed graph. When performing an operation like `(a + b) * (c - d)`, the addition node and subtraction node have no dependency on each other, so they execute simultaneously. When the results of both operations arrive at the multiplication node, the multiplication operation fires. Even without the programmer explicitly specifying parallel operations, all operations are automatically executed in parallel.

The dataflow architecture, which first appeared in the 1970s, was actively researched as a next-generation computer in the 1980s-1990s, but failed to become commercially viable due to various limitations. The operations required for dataflow architecture were very expensive in hardware, there were difficulties in handling large-scale data structures, and all existing software infrastructure was written assuming a sequential execution model — these were compounding problems.

Pure dataflow computers have now disappeared, but the ideas continue to live on to the present day. The out-of-order execution (OoO) structure within the von Neumann model and circuit design in FPGAs carry on the design philosophy of dataflow architecture. Recently, AI accelerator processors have been reapplying dataflow principles to hardware, and although dataflow architecture was never commercialized as a general-purpose computing machine, research continues on using dataflow architecture in various special-purpose hardware.

## ISA
ISA stands for **Instruction Set Architecture**, and can be described as the interface between software and hardware. The ISA determines the following:
* What operations exist in the instruction set, and what the encoding format of each instruction is
* What data types the hardware directly supports, and what the byte order is (little-endian, big-endian)
* Register organization, including the number of registers, their bit widths, and their purposes
* Addressing modes and how instructions specify the location of operands
* The address space size of the memory model
* Under what conditions (division by zero, page fault, illegal instruction) exceptions occur, and how interrupts are handled
* Privilege levels, the distinction between protected mode/kernel mode, the range of registers and instructions accessible in each mode, and virtual memory-related aspects

On the other hand, the ISA does not specify matters related to the microarchitecture beneath it (clock speed, pipeline stages, cache structure, etc.) or software layer conventions (ABI, memory map, firmware interface).

**Programmer Visible State** refers to all hardware state that a programmer (compiler) can directly read or write through instructions in the ISA. The semantics of a program are defined by changes to these states. Specifically, this includes general-purpose registers, the program counter, the stack pointer, flag registers, and the entire memory address space.

Conversely, invisible state (microarchitectural state) includes cache contents, branch predictor history, reorder buffer, reservation station, physical register file, TLB entries, and so on. These only affect performance and do not change the logical results of a program.

For any chip implementing the same ISA, as long as changes to the **Programmer Visible State** are identical, the implementation is correct, and all other internal state is free to differ.

The instructions provided by an ISA can be classified by function as follows:
* **Arithmetic/Logical**: Performs operations on registers or immediate values. Results are typically stored in a register, and flags may be updated as a side effect.
* **Data Transfer/Memory**: Moves data between registers and memory, or between registers.
* **Control Flow**: Changes the program counter to alter the flow of execution. This includes unconditional jumps, conditional branches, function calls/returns, and so on.
* **System/Privileged**: Instructions for OS or hardware control. This includes entering the kernel from user mode, interrupt control, and so on. In modern microprocessors, most such instructions can only be executed in kernel mode, and executing them in user mode causes an exception.

These instructions must be executed **atomically**. A single instruction may change multiple Programmer Visible States, but these intermediate changes must not be exposed to the programmer. In actual hardware, instructions may be processed in stages within a pipeline — writing to a register first and updating the PC later — but this is microarchitectural state, not Programmer Visible State.

## History of the ISA

### EDSAC
EDSAC was one of the first stored-program computers and had a very simple ISA.

An instruction consisted of a 5-bit opcode + a reserved bit + a 10-bit memory address (n), using a single accumulator structure. There was only one register, the Acc, and all operations revolved around this Acc register. Examples of instructions include:
* A n: Adds `M[n]` to `ACC`
* T n: Moves the contents of `ACC` to `M[n]` and clears ACC
* E n: If `ACC>=0`, jumps to `M[n]`
* I n: Reads the next character from tape and stores it at the address pointed to by `M[n]`
* Z  : Halts the program and rings the bell

A notable characteristic is that all memory addresses are hardcoded in instructions. However, this leads to the following problems:

1. When executing a function in code, the function must return to the call site.
   However, since EDSAC has return addresses hardcoded in instructions,
   it was difficult to specify the return address when calling the same function from multiple locations.
2. When accessing array elements, since array addresses are hardcoded in instructions,
   iterating through an array in a loop required modifying the instruction itself each time to change the address.

### Evolution of the ISA
To solve these problems, subsequent CPUs evolved in various ways.

First, register architecture evolved from using only a single accumulator register to adding registers for program address specification, and in the modern era, multiple general-purpose registers (GPR, General Purpose Register) have been added so that any register can be used for any purpose.

Second, instructions gained the ability to specify various operands. A structure like EDSAC where an instruction has an implicit operand (ACC) and only one explicit operand is called **Monadic**; a structure like `OP inout, in2` where there are 2 operands and one of the inputs is overwritten with the result is called **Dyadic**; and a structure like `OP out, in1, in2` that explicitly specifies both the output and two inputs is called **Triadic**.

In CISC architectures described below, a single instruction like `ADD [mem], reg` can perform both memory access and computation simultaneously, whereas RISC architectures restrict memory access to load/store instructions only. (load-store architecture)

Third, instructions gained the ability to specify various memory addresses.
* **Absolute** - `LD rt, 100`: The address is specified as a constant in the instruction, like EDSAC.
* **Register Indirect** - `LD rt, (r_base)`: Uses the value in a register as the address. Pointer dereferencing works this way.
* **Displaced** - `LD rt, offset(r_base)`: Creates an address by adding a constant offset to the register value. Useful for struct access.
* **Indexed** - `LD rt, (r_base, r_index)`: Creates an address by adding two register values.
* **Memory Indirect** - `LD rt, ((r_base))`: Reads a value from a memory address and uses that value as an address again. This corresponds to double pointer dereferencing.
* **Auto increment/decrement** - `LDR rt, (r_base)`: Uses the register value as an address, but automatically increments/decrements the register value before or after access. Useful for sequentially traversing arrays.

### The Emergence of RISC
Early CPU development progressed by making the initially simple ISA increasingly complex, adding various features to the instruction set. At the time, programming directly in assembly was common, and adding diverse instructions could simplify the programmer's coding work. Additionally, since memory size and performance were limited, it was useful to process frequently-used complex operations in a single step.

However, as compiler technology advanced, cases where programmers directly used complex assembly instructions became rare. The complex instructions designed for human use were difficult for compilers to optimize, and since execution time and memory access counts varied wildly between instructions, it was also difficult to design efficient pipelines.

Against this backdrop, RISC (Reduced Instruction Set Computer) emerged. RISC CPUs were built with the philosophy of keeping the instruction set simple — all instructions the same size, memory access only through designated instructions, simple individual instructions but with a generous number of registers. RISC shifted complexity from hardware to the compiler, making the hardware simple while delegating optimization burden to the now-advanced compilers.

RISC made pipelines easier to build and was advantageous for increasing clock speeds. Since the hardware was simple, transistors could be invested in areas that help performance such as caches and branch predictors, and verification, debugging, and design cycles were shorter.

In contrast to RISC, pre-RISC architectures (x86, M68K, Z80, etc.) are called CISC (Complex Instruction Set Computer). While many CISC architectures like M68K and Z80 disappeared, x86 survived due to its massive software ecosystem. Instead, it adopted a compromise of maintaining a CISC external ISA while internally being RISC, introducing a design where complex instructions are decomposed into RISC operations internally within the CPU.

A leading representative of modern RISC architectures is ARM. ARM initially penetrated the emerging mobile market quickly, leveraging high performance-per-watt through simple design. Until the 2020s, RISC architectures were used in low-power designs such as mobile and embedded systems, while CISC architectures were used in workstation, desktop, and server environments that required high performance at the cost of higher power consumption.

However, this situation was largely reversed after Apple Silicon released the M1 chip in the 2020s. Apple's M1 and other ARM CPUs, as RISC architecture-based CPUs, have been rapidly growing market share with high performance and improved performance-per-watt compared to CISC CPUs. Beyond Apple, ARM-based Windows/Linux laptops are now being sold, and RISC architectures are gradually expanding their share beyond the mobile market.

# RISC-V
RISC-V is an open-source ISA that started at UC Berkeley in 2010. It was designed from scratch as a clean RISC ISA without legacy, incorporating lessons learned over the past 30 years since RISC-I and RISC-II, the first RISC processors designed in 1981. (The V stands for the fifth RISC design developed at Berkeley: RISC-I, RISC-II, SOAR, SPUR, RISC-V.)

Unlike ARM and x86 which are tied to specific companies, anyone can freely build processors implementing the RISC-V ISA, and startups, universities, and large corporations can all freely design chips. Additionally, it was developed using a modular design — rather than a single monolithic ISA, it has a small ISA with a minimal set of instructions to which necessary extensions are attached.

## Programmer Visible State of RISC-V
RISC-V has 32 integer general-purpose registers by default, from x0 to x31. x0 is always fixed at 0, because fixing x0 to 0 allows various operations to be expressed using existing instructions, thereby reducing the number of instruction types needed. (For example, NOP can be expressed as `ADDI x0, x0, 0`, and loading an immediate value as `ADDI x1, x0, 42`.)

Additionally, there is a PC register that is not included in the general-purpose registers, as well as floating-point registers included in the F/D extensions that provide floating-point operations.

Memory uses byte addressing, and is little-endian by default. Every byte of memory is Programmer Visible State, and little-endian alignment is used by default.

## RISC-V Extension System
RISC-V has a structure where necessary extensions are combined with a small base ISA.

The base ISAs are as follows:
* **RV32I**: 32-bit integer base. Contains only the minimal instructions for integer arithmetic/logic, load/store, etc.
* **RV64I**: 64-bit integer base. Adds 64-bit operations and doubleword instructions to RV32I.
* **RV128I**: 128-bit integer base. However, since it is still unclear when an address space larger than 64 bits would be needed, the specification has not been fully frozen yet.
* **RV32E**, **RV64E**: Reduced ISA for embedded use, cutting registers from 32 to 16 to lower the cost of ultra-small microcontrollers.

The following standard extensions exist:
* **M**: Integer multiplication and division: Adds native integer multiplication instructions such as `MUL`, `MULH` using a hardware multiplier. On ultra-small embedded devices, multiplication and division can be replaced with other operations like bit manipulation without hardware multiplication, which is why multiplication and division are in a separate extension.
* **A**: Atomic operations: Instructions for inter-core memory sharing in multi-core environments. Defines functionality for atomically performing reads and writes to memory, reserving memory, etc.
* **F**: 32-bit floating-point operations: Adds hardware floating-point operations via the FPU. Adds 32 floating-point registers f0-f31 and the fcsr flag that records the results of floating-point operations.
* **D**, **Q**: Add 64-bit double-precision floating-point and 128-bit quadruple-precision floating-point operation instructions, respectively.
* **C**: Enables encoding of frequently used instructions in 16 bits. This can reduce code size, making it useful in embedded environments where flash memory size is severely constrained.
* **V**: Vector extension. Supports various vector operations similar to SIMD.
* **H**: Hypervisor extension. Supports the virtualization layer provided by hypervisors.

In addition to single-letter extensions, there are also more fine-grained extensions prefixed with Z:
* **Zicsr**: CSR access instructions
* **Zifencei**: Instruction cache synchronization, ensures I-Cache and D-Cache coherence for self-modifying code and JIT compilation
* **Zba**, **Zbb**, **Zbc**, **Zbs**: Address computation acceleration, basic bit manipulation, carry-less multiplication, and other detailed bit manipulation instructions
* **Zfinx**: Performs floating-point operations in integer registers
* **Ztso**: Guarantees Total Store Ordering memory model. Useful for x86 binary translation
* **Zicond**: Conditional operations. Conditionally selects values without branching

Because there are so many extensions, **RISC-V profiles** exist that bundle frequently used extensions for software compatibility.
For example, **RVA20U64** is defined to mandatorily include the I, M, A, F, D, C, Zicsr, and Zifencei extensions.

## RISC-V Instruction Formats
RISC-V defines 6 basic instruction formats. In RV32I, all are 32 bits of fixed length, and the positions of opcode, rd, rs1, and rs2 are arranged as consistently as possible across formats to simplify decoding.

### R-Type
Used for register-to-register operations.
```txt
[31:25]  [24:20]  [19:15]  [14:12]  [11:7]  [6:0]
funct7   rs2      rs1      funct3   rd      opcode
7 bits   5 bits   5 bits   3 bits   5 bits  7 bits
```

Operates on two source registers rs1 and rs2, and stores the result in rd. `funct7` and `funct3` distinguish the specific type of operation.

Example: `ADD x1, x2, x3`: x1 <- x2 + x3

### I-Type
Used for immediate value operations, loads, JALR, etc.
```txt
[31:20]     [19:15]  [14:12]  [11:7]  [6:0]
imm[11:0]   rs1      funct3   rd      opcode
12 bits     5 bits   3 bits   5 bits  7 bits
```
The 12-bit immediate value is sign-extended before use. This is the R-type format with the `funct7` and `rs2` fields replaced by the immediate value.

Example: `ADDI x1, x2, 10`: x1 <- x2 + 10

Since `funct7` is absent compared to R-type, there are some instruction differences. For example, ADD/SUB which are distinguished by `funct7` in R-type — in I-type, SUB is unnecessary since negative immediate values can be used instead, and there are cases where the immediate field is split to distinguish sub-instructions.
(In RV32I, shift instructions like SLLI, SRLI, and SRAI, which need at most 5 bits for the immediate value, use the upper 7 bits as an instruction specifier and the remaining 5 bits as the shift immediate value.)

Load instructions that fetch values from memory are also I-Type, with `0000011` in the `opcode` field to indicate a Load, `rs1` as the base, and the 12-bit `imm` as the offset. Depending on `funct3`, these are distinguished into `LW` which reads 32 bits, `LH` which reads 16 bits with sign extension, `LHU` which reads 16 bits with zero extension, `LB` which reads 8 bits, `LBU`, and so on.

Also, immediate values are always limited to 12 bits. Immediate values used in programs are typically small values, and cases requiring large constants are usually rare, so this is an intentional design for optimization. When large constants are absolutely necessary, they can be constructed using U-type instructions or AUIPC, described below. This follows the RISC philosophy of not trying to do everything with a single instruction, but instead solving problems with combinations of simple instructions.

### S-Type
Used for storing values to memory.
```text
[31:25]   [24:20]  [19:15]  [14:12]  [11:7]   [6:0]
imm[11:5] rs2      rs1      funct3   imm[4:0] opcode
7 bits    5 bits   5 bits   3 bits   5 bits   7 bits
```
Since results are not written to a register, there is no `rd`; instead, the lower bits of the immediate go in the `rd` position, and the upper bits of the immediate go in the `funct7` position.

Example: `SW x3, 12(x2)`: `MEM[x2 + 12]` <- x3

### B-Type (SB-Type)
Used for conditional branches.
```text
[31]     [30:25]    [24:20]  [19:15]  [14:12]  [11:8]   [7]     [6:0]
imm[12]  imm[10:5]  rs2      rs1      funct3   imm[4:1] imm[11] opcode
1 bit    6 bits     5 bits   5 bits   3 bits   4 bits   1 bit   7 bits
```
Similar to S-Type, but with a different immediate bit arrangement. The immediate is used as a branch offset, and since RISC-V instructions are aligned to at least 16-bit boundaries, the least significant bit of the branch offset is always 0 and is not encoded. Therefore, a branch range of 13 bits is possible.

Example: `BEQ x1, x2, offset`: If `x1 == x2`, then PC <- PC + offset

The reason the bit arrangement is peculiarly scrambled is to share as many bit positions as possible with S-type to simplify hardware. Due to this similarity with S-Type, B-Type is also sometimes called SB-Type.

### U-Type
Instructions that use a 20-bit upper immediate value.
```text
[31:12]     [11:7]  [6:0]
imm[31:12]  rd      opcode
20 bits     5 bits  7 bits
```
The 20-bit immediate is placed in the upper 20 bits, and the lower 12 bits are filled with 0. Since I-Type instructions can use immediate values of up to 12 bits, this instruction was created to complement that limitation.

* **LUI** (Load Upper Immediate): rd <- imm << 12, used in combination with ADDI to create large constants. To create `0x12345678`, `LUI x1, 0x12345` fills the upper 20 bits, and `ADDI x1, x1, 0x678` fills the lower 12 bits.
* **AUIPC** (Add Upper Immediate to PC): rd <- PC + (imm << 12), used for PC-relative address calculation, and can create addresses within a +/-2GB range from the current position when combined with JAL and load.

### J-Type (UJ-Type)
Used for unconditional jumps.
```text
[31]     [30:21]    [20]     [19:12]    [11:7]  [6:0]
imm[20]  imm[10:1]  imm[11]  imm[19:12] rd      opcode
1 bit    10 bits    1 bit    8 bits     5 bits  7 bits
```
Uses a 20-bit immediate as a jump offset, and like B-Type, bit 0 is always 0 so it is not encoded. Therefore, a jump range of 21 bits (+/-1MB) is possible.

Similar to B-Type, it is designed to share as many bit positions as possible with U-Type. Hence it is also sometimes called UJ-Type.

## RV32I Instruction Set

### Integer Arithmetic/Logic (R-type)

| Instruction | Operation | Description |
|--------|------|------|
| `ADD rd, rs1, rs2` | `rd <- rs1 + rs2` | Addition |
| `SUB rd, rs1, rs2` | `rd <- rs1 - rs2` | Subtraction |
| `AND rd, rs1, rs2` | `rd <- rs1 & rs2` | Bitwise AND |
| `OR rd, rs1, rs2` | `rd <- rs1 \| rs2` | Bitwise OR |
| `XOR rd, rs1, rs2` | `rd <- rs1 ^ rs2` | Bitwise XOR |
| `SLL rd, rs1, rs2` | `rd <- rs1 << rs2[4:0]` | Logical left shift |
| `SRL rd, rs1, rs2` | `rd <- rs1 >> rs2[4:0]` | Logical right shift (zero-fill) |
| `SRA rd, rs1, rs2` | `rd <- rs1 >>> rs2[4:0]` | Arithmetic right shift (sign-preserving) |
| `SLT rd, rs1, rs2` | `rd <- (rs1 < rs2) ? 1 : 0` | Signed comparison |
| `SLTU rd, rs1, rs2` | `rd <- (rs1 < rs2) ? 1 : 0` | Unsigned comparison |

### Immediate Arithmetic/Logic (I-type)

| Instruction | Operation | Description |
|--------|------|------|
| `ADDI rd, rs1, imm` | `rd <- rs1 + sext(imm)` | Immediate addition |
| `ANDI rd, rs1, imm` | `rd <- rs1 & sext(imm)` | Immediate AND |
| `ORI rd, rs1, imm` | `rd <- rs1 \| sext(imm)` | Immediate OR |
| `XORI rd, rs1, imm` | `rd <- rs1 ^ sext(imm)` | Immediate XOR |
| `SLLI rd, rs1, shamt` | `rd <- rs1 << shamt` | Immediate logical left shift |
| `SRLI rd, rs1, shamt` | `rd <- rs1 >> shamt` | Immediate logical right shift |
| `SRAI rd, rs1, shamt` | `rd <- rs1 >>> shamt` | Immediate arithmetic right shift |
| `SLTI rd, rs1, imm` | `rd <- (rs1 < sext(imm)) ? 1 : 0` | Immediate signed comparison |
| `SLTIU rd, rs1, imm` | `rd <- (rs1 < sext(imm)) ? 1 : 0` | Immediate unsigned comparison |

### Upper Immediate (U-type)

| Instruction | Operation | Description |
|--------|------|------|
| `LUI rd, imm` | `rd <- imm << 12` | Load upper 20 bits |
| `AUIPC rd, imm` | `rd <- PC + (imm << 12)` | Add upper 20 bits relative to PC |

### Load (I-type)

| Instruction | funct3 | Operation | Description |
|--------|--------|------|------|
| `LB rd, imm(rs1)` | `000` | `rd <- sext(MEM8[rs1 + sext(imm)])` | Load byte (sign extension) |
| `LH rd, imm(rs1)` | `001` | `rd <- sext(MEM16[rs1 + sext(imm)])` | Load halfword (sign extension) |
| `LW rd, imm(rs1)` | `010` | `rd <- MEM32[rs1 + sext(imm)]` | Load word |
| `LBU rd, imm(rs1)` | `100` | `rd <- zext(MEM8[rs1 + sext(imm)])` | Load byte (zero extension) |
| `LHU rd, imm(rs1)` | `101` | `rd <- zext(MEM16[rs1 + sext(imm)])` | Load halfword (zero extension) |

### Store (S-type)

| Instruction | funct3 | Operation | Description |
|--------|--------|------|------|
| `SB rs2, imm(rs1)` | `000` | `MEM8[rs1 + sext(imm)] <- rs2[7:0]` | Store byte |
| `SH rs2, imm(rs1)` | `001` | `MEM16[rs1 + sext(imm)] <- rs2[15:0]` | Store halfword |
| `SW rs2, imm(rs1)` | `010` | `MEM32[rs1 + sext(imm)] <- rs2` | Store word |

### Conditional Branches (B-type)

| Instruction | funct3 | Operation | Description |
|--------|--------|------|------|
| `BEQ rs1, rs2, offset` | `000` | `if (rs1 == rs2) PC <- PC + offset` | Branch if equal |
| `BNE rs1, rs2, offset` | `001` | `if (rs1 != rs2) PC <- PC + offset` | Branch if not equal |
| `BLT rs1, rs2, offset` | `100` | `if (rs1 < rs2) PC <- PC + offset` | Signed less than |
| `BGE rs1, rs2, offset` | `101` | `if (rs1 >= rs2) PC <- PC + offset` | Signed greater than or equal |
| `BLTU rs1, rs2, offset` | `110` | `if (rs1 < rs2) PC <- PC + offset` | Unsigned less than |
| `BGEU rs1, rs2, offset` | `111` | `if (rs1 >= rs2) PC <- PC + offset` | Unsigned greater than or equal |

### Jumps

| Instruction | Type | Operation | Description |
|--------|------|------|------|
| `JAL rd, offset` | J-type | `rd <- PC+4, PC <- PC + offset` | Direct jump (function call) |
| `JALR rd, rs1, imm` | I-type | `rd <- PC+4, PC <- (rs1 + sext(imm)) & ~1` | Indirect jump (function return, etc.) |

### Memory Ordering

| Instruction | Description |
|--------|------|
| `FENCE pred, succ` | Ensures memory access ordering (pred/succ: combinations of I, O, R, W) |

### System Instructions

| Instruction | Operation | Description |
|--------|------|------|
| `ECALL` | Generates environment call trap | System call (OS entry) |
| `EBREAK` | Generates debug trap | Breakpoint |


Previously, the `Zicsr` and `Zifencei` extensions were included in RV32I, but they were separated into independent extensions in version 2.1, so currently a total of 40 instructions constitute RV32I.

## RISC-V ABI Conventions
### Register Conventions
These are recommended register usage conventions for all systems, though they are not enforced at the ISA level. Only `x0 = 0` is the sole constraint enforced by the ISA; all other registers are equivalent from a hardware perspective. In practice, adherence to these conventions is the role of the ABI and calling convention.

However, since most compilers, operating systems, and debuggers follow these conventions, they should be adhered to except in very special cases such as bare-metal embedded environments that do not use any external libraries.


| Register | ABI Name | Purpose | Caller/Callee Saved |
|----------|----------|------|---------------------|
| `x0` | `zero` | Always 0 (fixed at ISA level) | -- |
| `x1` | `ra` | Return Address | Caller |
| `x2` | `sp` | Stack Pointer | Callee |
| `x3` | `gp` | Global Pointer | -- |
| `x4` | `tp` | Thread Pointer | -- |
| `x5` | `t0` | Temporary register | Caller |
| `x6` | `t1` | Temporary register | Caller |
| `x7` | `t2` | Temporary register | Caller |
| `x8` | `s0` / `fp` | Saved register / Frame Pointer | Callee |
| `x9` | `s1` | Saved register | Callee |
| `x10` | `a0` | Function argument 1 / Return value 1 | Caller |
| `x11` | `a1` | Function argument 2 / Return value 2 | Caller |
| `x12` | `a2` | Function argument 3 | Caller |
| `x13` | `a3` | Function argument 4 | Caller |
| `x14` | `a4` | Function argument 5 | Caller |
| `x15` | `a5` | Function argument 6 | Caller |
| `x16` | `a6` | Function argument 7 | Caller |
| `x17` | `a7` | Function argument 8 | Caller |
| `x18` | `s2` | Saved register | Callee |
| `x19` | `s3` | Saved register | Callee |
| `x20` | `s4` | Saved register | Callee |
| `x21` | `s5` | Saved register | Callee |
| `x22` | `s6` | Saved register | Callee |
| `x23` | `s7` | Saved register | Callee |
| `x24` | `s8` | Saved register | Callee |
| `x25` | `s9` | Saved register | Callee |
| `x26` | `s10` | Saved register | Callee |
| `x27` | `s11` | Saved register | Callee |
| `x28` | `t3` | Temporary register | Caller |
| `x29` | `t4` | Temporary register | Caller |
| `x30` | `t5` | Temporary register | Caller |
| `x31` | `t6` | Temporary register | Caller |
