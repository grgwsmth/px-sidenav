# Claude Debug Log

## Session: 2026-03-20

### Changes made in this session

#### Bug Fix 1 — Collapsed variant not applying to SideNav Items
**File:** `code.ts` / `code.js`

`setProperties()` was called with a boolean `true` instead of the string `"True"`. Figma's component API expects string values for variant properties, so the call was silently failing (caught by a try/catch that only logged a warning). None of the nested `[PX] SideNav Item` instances were being set to their collapsed state when the `Collapsed=True` variant of `[PX] SideNav-MySideNav` was created.

```diff
- "Collapsed": true
+ "Collapsed": "True"
```

---

#### Bug Fix 2 — SideNav Control not set to "Expand-Closed" variant
**File:** `code.ts` / `code.js`

The `setProperties({})` call for the collapsed `[PX] SideNav Control` instance was empty. The comment in the code even said "Set the Variant property to Expand-Closed" but the object body was left as a placeholder comment. The control was rendering in its default (non-collapsed) variant.

```diff
  collapsedControlInstance.setProperties({
-   // No variant properties for placeholder components
+   "Variant": "Expand-Closed"
  });
```

---

#### Bug Fix 3 — Font key split broken for hyphenated font family names
**File:** `code.ts`

`loadComponentFonts` was building a deduplication key as `"Family-Style"` (e.g. `"DM Sans-Regular"`) and then splitting on `-` to recover the family and style. This breaks for any font family with a hyphen in its name (e.g. `"Source-Serif-Pro"`). Replaced with a `Map<string, FontName>` keyed on `"Family::Style"`, storing the full `FontName` object directly — no split needed.

```diff
- const fontsToLoad = new Set<string>();
- textNodes.forEach(textNode => {
-     const fontKey = `${textNode.fontName.family}-${textNode.fontName.style}`;
-     fontsToLoad.add(fontKey);
- });
- for (const fontKey of fontsToLoad) {
-     const [family, style] = fontKey.split('-');
-     await figma.loadFontAsync({ family, style });
- }
+ const fontsToLoad = new Map<string, FontName>();
+ textNodes.forEach(textNode => {
+     const fontKey = `${textNode.fontName.family}::${textNode.fontName.style}`;
+     fontsToLoad.set(fontKey, textNode.fontName as FontName);
+ });
+ for (const font of fontsToLoad.values()) {
+     await figma.loadFontAsync(font);
+ }
```

---

#### Bug Fix 4 — `parent` variable shadowing outer loop variable
**File:** `code.ts`

Inside `for (const parent of data.parents)`, the `components.forEach` callback re-declared `let parent: any` and re-derived the parent via `data.parents.find(...)`. Since `components` is built entirely within the outer loop iteration, the outer `parent` is always already correct. The inner re-lookup was redundant and could silently fail for edge cases (e.g. a child label matching a parent label), causing the entire `forEach` iteration to return early with no properties set.

Removed the inner `let parent` declaration and all re-lookup logic. The callback now uses the outer `parent` directly.

---

#### Bug Fix 5 — Unreachable branches in `components.forEach`
**File:** `code.ts`

The property-assignment loop contained branches handling `Variant=${parent.label} collapsed`, `Variant=${parent.label} current collapsed`, and collapsed child-specific variants. None of those component names are ever created — the component-creation loop only produces `Variant=${parent.label}`, `Variant=${parent.label} current`, and `Variant=${child.label}`. These dead branches were removed.

---

#### Bug Fix 6 — Conflicting `addComponentProperty("Collapsed", "BOOLEAN", false)`
**File:** `code.ts`

After `figma.combineAsVariants([expandedVariant, collapsedVariant])`, the variants are named `Collapsed=True` and `Collapsed=False`, which causes Figma to automatically derive a variant property `Collapsed` as a string enum. Calling `addComponentProperty("Collapsed", "BOOLEAN", false)` on the resulting component set then creates a duplicate/conflicting property. This line was removed.

---

#### Bug Fix 7 — Inconsistent fallback fill colors
**File:** `code.ts`

Three separate error/fallback paths in the design token lookup used different colors:
- Token not found → `{ r: 12/255, g: 12/255, b: 12/255 }` (near-black — a debugging artifact)
- Collection not found → `{ r: 1, g: 1, b: 1 }` (white)
- General error → `{ r: 1, g: 1, b: 1 }` (white)

Standardized all three to white `{ r: 1, g: 1, b: 1 }`.

---

#### Bug Fix 8 — Two separate `setProperties` calls on the same instance
**File:** `code.ts`

For child-specific variants, the parent instance's properties were set in two sequential calls:
```diff
- item.setProperties({ "isCurrent": "True" });
- item.setProperties({ "Child Active": "True" });
+ item.setProperties({ "isCurrent": "True", "Child Active": "True" });
```
Merged into a single call for consistency and correctness.

---

#### Bug Fix 9 — Missing `layoutAlign` on `collapsedSideNavInstance`
**File:** `code.ts`

The expanded instance correctly set `layoutAlign = "STRETCH"`, but the collapsed clone did not. Added to match.

```diff
  if (collapsedSideNavInstance.type === "INSTANCE") {
+     collapsedSideNavInstance.layoutAlign = "STRETCH";
      collapsedSideNavInstance.counterAxisSizingMode = "AUTO";
```

---

#### Dead Code Removed
**File:** `code.ts`

| Item | Reason |
|---|---|
| `debugAvailableComponents()` | Never called; debugging scaffold |
| `logComponentProperties()` | Entire body commented out; never called |
| `createdNodes` object | Declared, never read or written |
| `VariantProperty` interface | Defined, never used |
| `inspectSelectedComponent()` | Large block wrapped in `/* */`; never called |

**Line count:** ~912 → 718 lines after cleanup.
