# CRUX System Architecture

This document explains how the CRUX (Compressed Rule Utility eXpression) system works in this repository. CRUX achieves 5-10x token reduction for Cursor rules while preserving all actionable information.

## Overview

The CRUX system consists of 5 interconnected components:

```mermaid
flowchart TB
    subgraph "CRUX System Architecture"
        CRUX["CRUX.md<br/>(Specification)<br/>READONLY"]
        AGENTS["AGENTS.md<br/>&lt;CRUX&gt; block<br/>(High-visibility notice)"]
        RULE["_CRUX-RULE.mdc<br/>(Always-Applied Rule)<br/>.cursor/rules/"]
        MANAGER["crux-cursor-rule-manager.md<br/>(Subagent - ΣCRUX)<br/>.cursor/agents/"]
        COMMAND["crux-compress.md<br/>(Cursor Command)<br/>.cursor/commands/"]
        
        AGENTS -->|"References"| CRUX
        RULE -->|"Points to spec"| CRUX
        MANAGER -->|"Loads spec"| CRUX
        COMMAND -->|"Spawns"| MANAGER
        RULE -->|"Delegates compression"| MANAGER
    end
    
    subgraph "I/O"
        INPUT["*.md files"]
        OUTPUT["*.crux.mdc files"]
        INPUT -->|"Compression"| OUTPUT
    end
```

## Component Details

### 1. `CRUX.md` - The Specification (Project Root)

**Purpose**: The authoritative specification defining CRUX notation syntax, encoding symbols, and compression rules.

**Key Contents**:
- Encoding symbols (structure, relations, logic, change, qualifiers)
- Standard blocks (`Ρ`, `E`, `Λ`, `Π`, `Κ`, `R`, `P`, `Γ`, `M`, `Φ`, `Ω`)
- Compression rules (eliminate prose, deduplicate, collapse, merge)
- Quality gates (target ≤20% of original token count)
- Example transformations

**Critical Rules**:
- **READONLY** - Agents must NEVER edit this file unless explicitly asked by the user
- All other CRUX components reference this as their source of truth

### 2. `<CRUX>` Block in `AGENTS.md` (Project Root)

**Purpose**: High-visibility notice ensuring ALL agents are aware of CRUX notation before they begin work.

**Location**: Near the top of `AGENTS.md`, the first file agents read.

**Key Contents**:
```xml
<CRUX agents="always">
## CRITICAL: CRUX Notation
...
### Foundational CRUX Rules (MUST FOLLOW)
1. NEVER EDIT `CRUX.md`
2. DO NOT LOAD SOURCE FILES when CRUX exists
3. SURGICAL DIFF UPDATES on source changes
4. ABORT IF NO SIGNIFICANT REDUCTION
</CRUX>
```

**Why It Matters**: This ensures agents know to:
- Load `CRUX.md` to understand compression symbols
- Use CRUX content instead of loading original source files
- Keep CRUX files synchronized when sources change

### 3. `_CRUX-RULE.mdc` - Always-Applied Rule (`.cursor/rules/`)

**Purpose**: A Cursor rule that is always loaded into context, providing agents with instructions for handling CRUX notation.

**Key Functions**:
- **Decompression**: Tells agents to interpret and follow CRUX-compressed rules
- **Compression**: Directs agents to delegate compression tasks to `crux-cursor-rule-manager`
- **Foundational Rules**: Reinforces the 4 critical rules
- **Specification Reference**: Points to `CRUX.md` for full details

**Contents**:
```markdown
# CRUX Decompression - CRITICAL
Always interpret, understand and adhere to the meaning compressed in CRUX notation!

# CRUX Compression - CRITICAL
When asked to compress a markdown rule file, delegate to crux-cursor-rule-manager subagent

# Foundational CRUX Rules (MUST FOLLOW)
1. NEVER EDIT `CRUX.md`
2. DO NOT LOAD SOURCE FILES when CRUX exists
3. SURGICAL DIFF UPDATES on source changes
4. SOURCE COMMIT TRACKING - Skip updates if sourceCommit matches

# CRUX Rule Compression Specification
load from CRUX.md
```

### 4. `crux-cursor-rule-manager.md` - The Subagent (`.cursor/agents/`)

**Purpose**: A specialized AI subagent (ΣCRUX) that performs compression and decompression tasks.

**Capabilities**:
- **Compression**: Convert verbose markdown → compact CRUX notation
- **Decompression**: Explain CRUX notation in natural language
- **Validation**: Verify CRUX output follows specification
- **Surgical Diff Updates**: Update CRUX files when sources change

**Workflow**:
1. Load `CRUX.md` specification (required first step)
2. Get source file's git commit hash
3. Check if existing CRUX `sourceCommit` matches → skip if unchanged
4. Estimate token reduction → abort if <50% reduction
5. Apply compression rules from specification
6. Generate output with frontmatter (generated, sourceCommit, beforeTokens, afterTokens)
7. Verify quality gates (target ≤20% of original)

**Output Format**:
```yaml
---
generated: YYYY-MM-DD HH:MM
sourceCommit: abc1234
beforeTokens: 2500
afterTokens: 400
alwaysApply: true
---
```

### 5. `crux-compress.md` - The Command (`.cursor/commands/`)

**Purpose**: A Cursor command that orchestrates CRUX compression tasks.

**Usage**:
```
/crux-compress ALL                    - Compress all eligible rules
/crux-compress @path/to/file.md       - Compress a specific file
/crux-compress @file1.md @file2.md    - Compress multiple files
```

**Key Features**:
- **Parallelism**: Spawns up to 4 `crux-cursor-rule-manager` subagents in parallel
- **Batching**: Processes files in batches of 4 when >4 files
- **Source Commit Tracking**: Skips files whose sourceCommit hasn't changed
- **Eligibility Criteria**: Files must have `crux: true` frontmatter

**File Convention**:
| Type | Extension | Example |
|------|-----------|---------|
| Source (human-readable) | `.md` | `core-tenets.md` |
| Compressed (token-efficient) | `.crux.mdc` | `core-tenets.crux.mdc` |

## How They Work Together

### Compression Flow

```mermaid
flowchart TD
    USER["User: /crux-compress @.cursor/rules/my-rule.md"]
    
    subgraph COMMAND["crux-compress.md (Command)"]
        C1["Parse arguments"]
        C2["Spawn subagent(s)"]
        C1 --> C2
    end
    
    subgraph MANAGER["crux-cursor-rule-manager (Subagent)"]
        M1["1. Read CRUX.md specification"]
        M2["2. git log -1 --format=%h -- source"]
        M3{"3. sourceCommit matches?"}
        M4["4. Read source file"]
        M5["5. Estimate reduction"]
        M6{"6. Reduction ≥50%?"}
        M7["7. Apply compression rules"]
        M8["8. Write .crux.mdc with frontmatter"]
        
        M1 --> M2 --> M3
        M3 -->|"Yes"| SKIP["Skip - source unchanged"]
        M3 -->|"No"| M4 --> M5 --> M6
        M6 -->|"No"| ABORT["Abort - not beneficial"]
        M6 -->|"Yes"| M7 --> M8
    end
    
    USER --> COMMAND
    COMMAND --> MANAGER
```

### Decompression Flow (Runtime)

```mermaid
flowchart TD
    START["Agent loads context"]
    
    subgraph RULE["_CRUX-RULE.mdc (Always Applied)"]
        R1["Instructs: interpret CRUX notation"]
        R2["Points to CRUX.md for symbols"]
    end
    
    subgraph INTERPRET["Agent encounters «CRUX⟨source.md⟩»"]
        I1["Uses compressed content directly"]
        I2["Does NOT load source.md"]
        I3["Interprets symbols per CRUX.md"]
    end
    
    START --> RULE
    RULE --> INTERPRET
```

### Synchronization Flow

```mermaid
flowchart TD
    START["User modifies source.md"]
    
    subgraph RULE["_CRUX-RULE.mdc detects change"]
        R1["Triggers: SURGICAL DIFF UPDATES"]
        R2["Invokes crux-cursor-rule-manager"]
        R1 --> R2
    end
    
    subgraph MANAGER["crux-cursor-rule-manager"]
        M1["Read existing .crux.mdc"]
        M2["Identify what changed in source"]
        M3["Apply minimal targeted edits"]
        M4["Update generated timestamp"]
        M5["Update sourceCommit hash"]
        
        M1 --> M2 --> M3 --> M4 --> M5
    end
    
    START --> RULE
    RULE --> MANAGER
```

## Foundational Rules (All Components Enforce)

1. **NEVER EDIT `CRUX.md`** - The specification is read-only
2. **DO NOT LOAD SOURCE FILES when CRUX exists** - Use `«CRUX⟨...⟩»` content directly
3. **SURGICAL DIFF UPDATES** - Keep CRUX files synchronized with source changes
4. **ABORT IF NO SIGNIFICANT REDUCTION** - Target ≤20% of original; skip if not achieved

## File Locations Summary

| Component | Path | Purpose |
|-----------|------|---------|
| Specification | `CRUX.md` | Defines notation syntax |
| Agent Notice | `AGENTS.md` (CRUX block) | High-visibility awareness |
| Always-Applied Rule | `.cursor/rules/_CRUX-RULE.mdc` | Runtime instructions |
| Subagent | `.cursor/agents/crux-cursor-rule-manager.md` | Compression executor |
| Command | `.cursor/commands/crux-compress.md` | User interface |

## Quick Reference

### To Compress a Rule File

```
/crux-compress @.cursor/rules/my-rule.md
```

### To Make a File Eligible for Compression

Add to frontmatter:
```yaml
---
crux: true
---
```

### To Check Compression Ratio

Compressed files include metrics in frontmatter:
```yaml
beforeTokens: 2500  # Original
afterTokens: 400    # Compressed (16% of original)
```

### CRUX Notation Quick Reference

```
STRUCTURE: «»⟨⟩{}[]().sub
RELATIONS: → ← ⊳ ⊲ @ : = ∋
LOGIC:     | & ⊤ ⊥ ∀ ∃ ¬
CHANGE:    Δ + -
QUALIFY:   * ? ! #
BLOCKS:    Ρ E Λ Π Κ R P Γ M Φ Ω
```

See `CRUX.md` for complete specification.
