# Template Crafting Guide

How to create interactive character sheets and custom templates for Simple VTT.

Templates are plain HTML files with special `data-*` attributes. You don't need to know JavaScript — just HTML basics. Place your `.html` files in `backend/assets/templates/` and they'll appear in the template picker inside the notepad panel.

---

## Quick Start

Minimal working template:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>My Template</title>
</head>
<body>

  <table class="tpl-table">
    <tr>
      <td><strong>Name:</strong> <input data-field="name" type="text" class="plain wide"></td>
    </tr>
    <tr>
      <td><strong>HP:</strong> <input data-field="hp" type="text" class="box sm"></td>
    </tr>
  </table>

</body>
</html>
```

The `<title>` becomes the notepad title when a user loads the template.

---

## Editable Fields

Every editable element uses the `data-field` attribute with a **unique name**. This name is used internally to save and restore values.

### Text Input

```html
<input data-field="character_name" type="text" class="plain">
```

### Textarea (multi-line)

```html
<textarea data-field="backstory" class="plain wide" rows="5"></textarea>
```

### Checkbox

```html
<input data-field="has_proficiency" type="checkbox">
```

### Default Values

Use the standard `value` attribute. It will be used when the template is loaded for the first time:

```html
<input data-field="prof_bonus" type="text" class="box xs" value="+2">
```

---

## Input Styles

Three visual variants are available. Add them as CSS classes:

### `.plain` — Invisible input

Text appears naturally, as if it was part of the document. No border, no background. A subtle underline appears on hover and focus.

```html
<input data-field="name" type="text" class="plain">
```

Best for: names, descriptions, notes — anywhere you want seamless inline text.

### `.box` — Bordered input

Standard input with a visible border and centered text.

```html
<input data-field="armor_class" type="text" class="box">
```

Best for: numeric values, modifiers, small data points.

### `.circle` — Round stat bubble

A 36x36px circle with bold centered text. Looks like a classic RPG stat bubble.

```html
<input data-field="strength" type="text" class="circle">
```

Best for: ability scores, armor class, key stats.

### Size Modifiers

Combine with a size class:

| Class   | Width | Use case |
|---------|-------|----------|
| `.xs`   | 36px  | Single number: modifier, bonus |
| `.sm`   | 60px  | Short value: HP, level |
| `.wide` | 100%  | Full-width: name, description |

Examples:

```html
<input data-field="str_mod" type="text" class="box xs">
<input data-field="hp_current" type="text" class="box sm">
<input data-field="character_name" type="text" class="plain wide">
<textarea data-field="notes" class="plain wide" rows="6"></textarea>
```

---

## Table Structure

Use `class="tpl-table"` on tables for proper styling. Available cell classes:

```html
<table class="tpl-table">
  <tr>
    <td class="section-header">Section Title</td>    <!-- Red accent header -->
  </tr>
  <tr>
    <td class="section-header-sm">Sub-header</td>    <!-- Subtle gray header -->
  </tr>
  <tr>
    <td class="center">Centered content</td>
    <td class="right">Right-aligned content</td>
  </tr>
</table>
```

---

## Dice Roll Buttons

Add a button with `data-roll` to create an inline dice roller. Clicking it rolls the dice and sends the result to the dice panel (visible to all players).

### Basic Roll

```html
<button data-roll="d20" class="roll-btn">🎲</button>
```

Rolls a d20. Supported dice: `d4`, `d6`, `d8`, `d10`, `d12`, `d20`, `d100`.

### Roll with Multiple Dice

```html
<button data-roll="2d6" class="roll-btn">🎲</button>
```

### Roll with a Fixed Modifier

```html
<button data-roll="d20+5" class="roll-btn">🎲</button>
```

### Roll Using Field Values

Reference any field with `@field_name`. The current value of that field will be parsed as a number and added:

```html
<input data-field="str_mod" type="text" class="box xs" value="+3">
<button data-roll="d20+@str_mod" class="roll-btn">🎲</button>
```

If `str_mod` contains `+3`, the roll becomes d20+3.

### Conditional Modifier (Proficiency)

Use `+@value?@condition` syntax. The value is added **only if** the condition checkbox is checked:

```html
<input data-field="athletics" type="text" class="box xs" value="+3">
<input data-field="athletics_prof" type="checkbox">
<input data-field="prof_bonus" type="text" class="box xs" value="+2">

<button data-roll="d20+@athletics+@prof_bonus?@athletics_prof" class="roll-btn">🎲</button>
```

This means:
- Always roll d20
- Always add `@athletics` value (+3)
- Add `@prof_bonus` (+2) **only if** `@athletics_prof` checkbox is checked

Result: d20+3 (without proficiency) or d20+5 (with proficiency).

### Roll Label

Use `data-roll-label` to name the roll in the dice history:

```html
<button data-roll="d20+@athletics" data-roll-label="Athletics" class="roll-btn">🎲</button>
```

In the dice history, this will appear as: **PlayerName (Athletics): d20 [15] +3 = 18**

### Dynamic Labels

Labels can reference field values too:

```html
<input data-field="weapon_name" type="text" class="plain" value="Longsword">
<button data-roll="d20+@atk_mod" data-roll-label="Attack: @weapon_name" class="roll-btn">🎲</button>
```

Shows: **PlayerName (Attack: Longsword): d20 [12] +5 = 17**

### Button Content

The button text can be anything — emoji, text, or both:

```html
<button data-roll="d20" class="roll-btn">🎲</button>
<button data-roll="d20" class="roll-btn">🎲 Roll</button>
<button data-roll="d20" class="roll-btn">🎲 Death Save</button>
```

---

## Roll Expression Reference

| Expression | Meaning |
|---|---|
| `d20` | Roll one d20 |
| `2d6` | Roll two d6 |
| `d20+5` | Roll d20, add 5 |
| `d20+@str_mod` | Roll d20, add value from field `str_mod` |
| `d20+@str_mod+@prof?@str_prof` | Roll d20, add `str_mod`, add `prof` only if `str_prof` is checked |
| `2d6+@dmg_mod` | Roll 2d6, add value from field `dmg_mod` |

---

## Complete Example: Skill Row

A typical D&D 5e skill with proficiency toggle and one-click roll:

```html
<tr>
  <td>
    <input data-field="skill_stealth_prof" type="checkbox"> Stealth <small>(Dex)</small>
  </td>
  <td class="right">
    <input data-field="skill_stealth" type="text" class="box xs">
  </td>
  <td class="center">
    <button
      data-roll="d20+@skill_stealth+@prof?@skill_stealth_prof"
      data-roll-label="Stealth"
      class="roll-btn">🎲</button>
  </td>
</tr>
```

How it works:
1. User enters their Stealth modifier (e.g. `+2`) in the `skill_stealth` field
2. User checks the `skill_stealth_prof` checkbox if proficient
3. The `prof` field (defined elsewhere) holds the proficiency bonus (e.g. `+3`)
4. Clicking 🎲 rolls: d20 + 2 + 3 (if proficient) or d20 + 2 (if not)

---

## Saving & Loading

### How Data is Stored

- Template structure (HTML) + field values (JSON) are saved together in localStorage
- Each notepad slot has independent storage
- Data persists across browser sessions

### Export Options (💾 button)

In template mode, the save button offers two options:

- **Save data (.json)** — Full backup: template HTML + all field values. Can be loaded back to restore everything exactly.
- **Export as HTML** — Generates a standalone HTML file with all values baked in. Good for printing or sharing outside VTT. Roll buttons are hidden in the exported file.

### Loading Templates

The load button (📂) offers:

- **Local file** — Load `.html` (template or notepad) or `.json` (saved template data) from disk
- **Server template** — Pick a template from `backend/assets/templates/`

When loading a `.json` file, all previously saved field values are restored. When loading an `.html` template, fields start empty (or with their `value` defaults).

---

## Deployment

1. Create your `.html` template file
2. Place it in `backend/assets/templates/`
3. It will appear in the template picker automatically
4. File name becomes the display name (underscores and hyphens are replaced with spaces, first letter capitalized)

Example: `dnd_5e.html` appears as **"Dnd 5e"** in the picker.

---

## Tips

- **Field names must be unique** across the entire template. Use prefixes like `skill_`, `save_`, `atk1_` to avoid collisions.
- **Keep it simple.** The template is just HTML — no scripts, no frameworks. The VTT handles all the interactivity.
- **Test locally.** Open your `.html` file in a browser to check the structure before deploying. Inputs and checkboxes will work, only the dice buttons and styling need the VTT.
- **Use `<small>` for hints** like ability abbreviations: `Stealth <small>(Dex)</small>`.
- **Textarea for long text.** Use `<textarea>` with `rows="N"` instead of text inputs for equipment lists, backstory, notes, etc.
