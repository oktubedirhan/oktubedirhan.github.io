---
title: Ev Bütçem
---

Ev Bütçem ("my household budget" in Turkish) is an app I'm writing for keeping a household's money together from two phones. Each category reads like a utility bill: this month's amount, small bars for the last six months and a dashed budget line. Right now it's a web app that runs on the phone (a PWA). It's being prepared for the app stores, so it isn't available to download yet.

## What it does

- **First-run setup:** It asks for your salary, rent and the money you have today in three steps; salary and rent are then added every month on their own.
- **Recurring records and instalments:** "1,200 ₺ in 6 instalments" is split across six months and shows up as planned in the months ahead. Leftover kuruş go into the last instalment, so the instalments add up exactly.
- **Accounts:** Cash, bank and credit card are kept apart. Spending on the card raises the card debt instead of lowering the money on hand, and paying the card isn't counted as spending.
- **Coach:** A balance score out of 100 (spending pace, budget overruns, safety margin) and short comments written by an AI model. The coach only talks about spending habits; it gives no advice on investing, loans or currency.
- **Adding from a screenshot:** Transactions are read from a screenshot of a banking app, and nothing is added until you confirm it.
- **Quick entry and search:** Category guesses from the note (typing "Migros" picks Groceries), repeating the last record, and searching records by text, date range or amount.
- **Household sharing:** No account or email. One phone creates a household and the code it gets is entered on the other phone.

## Privacy

- Records stay on the phone. When household sharing is on they're synced through Supabase's server in Frankfurt; the server keeps only the SHA-256 hash of the household code, never the code. The tables are closed to the outside, and the phone can call only three functions.
- The coach never receives individual records, notes or the money on hand, only monthly category totals and ratios.

## How it's tested

- The money logic (budgets, instalments, the balance score, balances) lives in pure functions kept apart from the interface, covered by 350 unit tests.
- The coach's answers are scored against a set of 30 prepared scenarios: the numbers must be right and forbidden advice must be zero. A model or prompt only changes if the score doesn't drop.
- Screens are checked in light and dark themes at phone width.

## Roadmap

| Task | Status |
|---|---|
| Summary, Months and Records screens, budgets | Done |
| Household sync between two phones | Done |
| Coach: balance score, comments, daily note, questions | Done |
| Setup, recurring records, instalments, category management | Done |
| Accounts, quick entry, search | Done |
| Tags, subscription finder, weekly summary, notifications | Next |
| Store release, Google Play first | Next |
