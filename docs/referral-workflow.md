# ASLZAR Referral Program — Workflows

Mermaid source for the referral workflow diagrams. Renders on GitHub, in VS Code (Mermaid preview), or via the bundled `referral-workflow.html`.

## Overview — two referral types

```mermaid
flowchart LR
    A([Someone shares a link]) --> B{Link type?}
    B -->|"start=&lt;Telegram ID&gt; (numeric)"| U[USER referral - Customer invites a friend]
    B -->|"start=empN (emp5, emp123...)"| E[EMPLOYEE referral - Staff brings a client]
    U --> U2[Recorded in 1C ERP under the inviter]
    E --> E2[Recorded in our database under the employee]
    U2 --> R[(Rewards / bonuses computed in 1C)]
    E2 --> R2[(Used for staff performance tracking)]
```

## 1. User referral — customer invites a friend

```mermaid
flowchart TD
    S([Customer A opens Mini App]) --> L[Opens Referral screen - Gets personal link + QR: t.me/bot?start=A_TelegramID]
    L --> SH[A shares link / QR / Telegram share]
    SH --> C([Friend B taps the link]) --> ST[Bot receives /start A_TelegramID]
    ST --> PH{Does B already have a phone?}
    PH -->|No| SAVE[Save code as pending] --> ASK[Bot asks B to share contact]
    ASK --> CT[B shares phone] --> VER[Verify B in 1C]
    PH -->|Yes| VER
    VER --> PROC[Process referral]
    PROC --> SELF{Is it a self-referral?}
    SELF -->|Yes| STOP1([Ignored])
    SELF -->|No| LOOK[Look up inviter A's 1C clientId]
    LOOK --> ADD[[Call 1C addReferral A.clientId, B.phone, B.name]]
    ADD --> DONE([1C records B under A's referral list])
    DONE --> REW[(Any bonus is calculated inside 1C - external ERP)]
```

**Key point:** the friend must verify their phone for the referral to count. The reward is handled by 1C, not the app — the app only displays the referral list and bonus balance pulled from 1C.

## 2. Employee referral — staff brings a client

```mermaid
flowchart TD
    ADM([Admin creates an employee]) --> GEN[System generates a unique code: emp1, emp2, emp3...]
    GEN --> LINK[Employee gets a link + QR: t.me/bot?start=empN]
    LINK --> SH[Employee shares it with a client]
    SH --> C([Client taps the link]) --> ST[Bot receives /start empN]
    ST --> NEW{Is the client brand new? no phone yet}
    NEW -->|No - already a user| IGN([Ignored - employees only get NEW clients])
    NEW -->|Yes| SAVE[Save empN as pending] --> ASK[Bot asks for contact]
    ASK --> CT[Client shares phone] --> VAL{Does empN exist in employees?}
    VAL -->|No| STOP([Skip])
    VAL -->|Yes| ONCE{Already attributed to an employee?}
    ONCE -->|Yes| LOCK([Keep original - never overwritten])
    ONCE -->|No| SET[Tag client with referredByEmployeeCode = empN]
    SET --> COUNT[(Admin dashboard counts referred clients per employee)]
```

**Two rules:** (1) An employee referral only applies to a **new** client. (2) Attribution is **permanent** — once set, a later employee link won't change it.

## Side-by-side comparison

| | User referral | Employee referral |
|---|---|---|
| Code format | Numeric Telegram ID | `empN` (emp5...) |
| Who shares | Any customer | Employee / sales staff |
| Applies to | New or existing friend | New clients only |
| Stored where | 1C ERP (external) | Our database (MongoDB) |
| Can change later? | Each event sent to 1C | No — locked once set |
| Purpose | Customer bonuses (via 1C) | Staff performance tracking |
| Requires phone? | Yes | Yes |
