# 🎨 Visual Design System (DESIGN.md)

## Design Philosophy: Cyber-Chic Glassmorphic Dark UI
**CampusHome** is styled with a modern, high-contrast, dark-mode-first aesthetic inspired by linear and modern developer-first SaaS products. It combines deep slate backdrops, translucent glass layers, vibrant neon accents, and smooth physics-based transitions to evoke a premium, futuristic atmosphere.

---

## 1. Typography System

The application utilizes two harmonious Google Fonts:

```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
```

| Type Token | Font Family | Weights | Usage Scope |
|---|---|---|---|
| **Headings (`--font-heading`)** | `'Outfit', sans-serif` | `600`, `700`, `800` | Page titles, hero banners, card headers, metric numerals |
| **Body & UI (`--font-body`)** | `'Plus Jakarta Sans', sans-serif` | `400`, `500`, `600` | Paragraphs, labels, button text, table cells, form inputs |

---

## 2. Color Palette & Token Variables

### 2.1 Surfaces & Backgrounds
| Token Variable | Hex / CSS Value | Description |
|---|---|---|
| `--bg-primary` | `#0b0f19` | Deepest obsidian canvas background |
| `--bg-secondary` | `#111827` | Secondary panel and sidebar backdrop |
| `--bg-card` | `rgba(17, 24, 39, 0.75)` | Translucent glass surface (pairs with `backdrop-filter: blur(16px)`) |
| `--bg-card-hover` | `rgba(31, 41, 55, 0.85)` | Elevated hover highlight state |
| `--bg-card-solid` | `#1e293b` | Opaque container fallback for nested elements |
| `--border-color` | `rgba(255, 255, 255, 0.08)`| Subtle translucent divider border |
| `--border-glow` | `rgba(99, 102, 241, 0.35)` | Active neon focus and glow border |

### 2.2 Text & Typography Colors
| Token Variable | Hex Value | Usage |
|---|---|---|
| `--text-primary` | `#f8fafc` | High-contrast main headers and primary text |
| `--text-secondary` | `#94a3b8` | Muted secondary copy, metadata, and labels |
| `--text-muted` | `#64748b` | Tertiary timestamps, hints, and placeholders |

### 2.3 Brand Accents & Gradients
| Accent Token | Gradient / Hex Value | Role |
|---|---|---|
| `--accent-primary` | `#6366f1` | Electric Indigo brand primary |
| `--accent-gradient` | `linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)` | Hero badges, primary CTA buttons |
| `--accent-cyan-gradient` | `linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)` | Attendance, analytics & live statistics |
| `--accent-emerald-gradient` | `linear-gradient(135deg, #10b981 0%, #059669 100%)` | Success confirmations & resolved states |
| `--accent-amber-gradient` | `linear-gradient(135deg, #f59e0b 0%, #d97706 100%)` | Pending leaves & maintenance warnings |
| `--accent-rose-gradient` | `linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)` | 🚨 SOS Distress alerts & critical actions |

### 2.4 Semantic Status Colors
- **Success (`--success`)**: `#10b981` (Present, Resolved, Paid)
- **Warning (`--warning`)**: `#f59e0b` (In Progress, Pending Approval)
- **Danger (`--danger`)**: `#ef4444` (Absent, Rejected, Overdue, SOS)
- **Info (`--info`)**: `#06b6d4` (Announcements, Information, Notice)

---

## 3. Glassmorphic Surface Specifications

Standard glass container class pattern:
```css
.glass-panel {
  background: var(--bg-card);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  transition: transform var(--transition-normal), box-shadow var(--transition-normal);
}

.glass-panel:hover {
  border-color: var(--border-glow);
  box-shadow: var(--shadow-glow);
  transform: translateY(-2px);
}
```

---

## 4. Component Design Patterns

### 4.1 Buttons & Interactive Controls
- **Primary Action (`.btn-primary`)**: Indigo gradient fill with subtle white typography, soft drop-shadow, and a `1.02` scale on hover.
- **Secondary Action (`.btn-secondary`)**: Translucent background (`rgba(255, 255, 255, 0.05)`), hairline border, and text glow on hover.
- **Danger / SOS Trigger (`.btn-danger`, `.btn-sos`)**: Neon rose backdrop with pulsing beacon ring:
  ```css
  @keyframes pulseGlow {
    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
    70% { box-shadow: 0 0 0 16px rgba(239, 68, 68, 0); }
    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
  }
  ```

### 4.2 Status Badges
Pill-shaped containers (`border-radius: 9999px`) with 12px font size, semi-bold weight, and matched background-to-text tinting:
- **Badge Success**: Background `rgba(16, 185, 129, 0.12)`, Text `#10b981`
- **Badge Warning**: Background `rgba(245, 158, 11, 0.12)`, Text `#f59e0b`
- **Badge Danger**: Background `rgba(239, 68, 68, 0.12)`, Text `#ef4444`
- **Badge Info**: Background `rgba(6, 182, 212, 0.12)`, Text `#06b6d4`

### 4.3 Data Tables & Grids
- Clean borders with zebra-like low-contrast row alternation.
- Fixed header with backdrop blur to remain visible upon scrolling.
- Hover states with subtle horizontal border-left indicator.

---

## 5. Spacing, Radius & Elevation Tokens

- **Radius**:
  - Small elements (Inputs, badges): `8px` (`--radius-sm`)
  - Medium cards & buttons: `12px` (`--radius-md`)
  - Major panels & dashboards: `18px` (`--radius-lg`)
  - Modals & dialogs: `24px` (`--radius-xl`)
- **Shadows**:
  - Elevation 1: `0 2px 8px rgba(0, 0, 0, 0.3)` (`--shadow-sm`)
  - Elevation 2: `0 8px 24px -4px rgba(0, 0, 0, 0.45)` (`--shadow-md`)
  - Ambient Glow: `0 0 25px rgba(99, 102, 241, 0.35)` (`--shadow-glow`)
