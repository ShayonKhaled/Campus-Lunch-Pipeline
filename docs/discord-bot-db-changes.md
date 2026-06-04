# Discord Bot — Database Changes Summary

This file is for the Claude Code instance in the Discord bot repository. It documents changes made to the shared PostgreSQL database so the Discord poster can be updated accordingly.

## New Campus: Kameoka

The `menu_items` table now contains data for **two campuses**:

| campus | Category Style | Categories |
|---|---|---|
| `'Uzumasa'` | Set Meals, A La Carte, Noodles, Sides | Unchanged |
| `'Kameoka'` | Set, Live Kitchen, Curry, Ramen, Side Dish | New |

## Kameoka Menu Structure

```
Set
  ├── A          (5 dishes/week)
  └── B          (5 dishes/week)
Live Kitchen
  └── Live Kitchen  (5 dishes/week)
Curry
  ├── A (Original Curry)     (5 dishes/week)
  ├── B (Cardamon Curry)     (5 dishes/week)
  └── C (Dry Curry w/ Meat)  (5 dishes/week)
Ramen
  └── Ramen      (5 dishes/week)
Side Dish
  ├── A          (5 dishes/week)
  ├── B          (5 dishes/week)
  ├── C          (5 dishes/week)
  └── Salad      (5 dishes/week)
```

Total: ~60 Kameoka rows per week.

## New Column: price

```sql
ALTER TABLE menu_items ADD COLUMN price integer;
```

- `price` is an integer (yen), nullable
- Only populated for Kameoka items (Uzumasa remains NULL)
- Added to the Kameoka scraper workflow

## Query Changes Needed

**Current query** (likely):
```sql
SELECT * FROM menu_items WHERE menu_date = CURRENT_DATE::text;
```

**Should become** — either:
```sql
-- Option A: Query per campus (separate messages)
SELECT * FROM menu_items WHERE campus = 'Kameoka' AND menu_date = CURRENT_DATE::text;
SELECT * FROM menu_items WHERE campus = 'Uzumasa' AND menu_date = CURRENT_DATE::text;

-- Option B: Query both, group in code
SELECT * FROM menu_items WHERE menu_date = CURRENT_DATE::text ORDER BY campus, category, subcategory;
```

## Category Display Names

Kameoka uses shorter names than Uzumasa — display them as-is (Title Case):
- "Set" (not "Set Meals")
- "Live Kitchen"
- "Curry"
- "Ramen"
- "Side Dish"

## Price Display

When `price` is not null, display it in the Discord embed (e.g., `¥500`).

## Deduplication

The unique constraint `(campus, menu_date, dish_name, subcategory)` prevents duplicates. No changes needed on the insert side.

## Files in This Repo

- `n8n-workflows/workflow-1-menu-scraper.json` — Uzumasa scraper
- `n8n-workflows/workflow-1-menu-scraper-kameoka.json` — Kameoka scraper
- `database/schema.sql` — DB schema (note: `price` column is added via ALTER, not in schema.sql yet)
