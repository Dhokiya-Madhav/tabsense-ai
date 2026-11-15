# TabSense AI

> Turn a messy pile of open tabs into clean, named, color-coded Chrome tab groups, in one click, using Google Gemini.

Built with **React + TypeScript + Vite** as a Manifest V3 Chrome extension.

---

## The problem it solves

If you work in a browser all day, your tab bar quickly turns into a mess:

- **Dozens of tabs, no structure.** Research, work, shopping, social media and docs are all mixed together, and finding the one you need means clicking through tiny titles.
- **Grouping by hand is tedious.** Chrome has tab groups, but creating, naming and coloring each one takes many clicks, so most people never bother.
- **Simple sorting is not enough.** Grouping by website is not helpful. A React repo, the React docs, a Stack Overflow question and a tutorial video are on four different sites but belong to **one task**.
- **A cluttered browser slows you down.** More tabs means more time hunting, more context switching and more memory use.

## How TabSense AI solves it

TabSense AI reads the **titles and domains** of your open tabs and asks Gemini to group them by **what you are working on** (the project, task or topic), not just by website. It then shows you the suggestions so **you stay in control**, and only changes your tab bar when you click Apply.

- **Groups by intent:** related tabs from different sites end up together (for example "React Development", "Japan Trip Planning").
- **Review before anything changes:** rename groups, change colors, move tabs between groups, or untick groups you do not want.
- **Uses your existing groups:** tabs can be added to groups you already have instead of creating duplicates, and existing groups are never renamed.
- **Creates real Chrome tab groups:** they show up in the normal tab bar, with names and colors.
- **History and restore:** each applied grouping is saved locally so you can restore it later (closed tabs are reopened).
- **Private by design:** only a number, a shortened tab title and the domain are sent to Gemini. Page content and full URLs are never sent.

---

## How to use it

### 1. Organize your tabs

1. Open the tabs you want to tidy up in one Chrome window.
2. Click the **TabSense AI** icon in the Chrome toolbar (pin it from the puzzle-piece menu for quick access).
3. Click **Organize with AI**. Wait a few seconds while Gemini analyzes your tabs.
4. **Review the suggestions.** Each card is a proposed group:
   - Tick or untick the checkbox to include or skip a group (use **Select all / Deselect all** at the top).
   - Click the colored dot to change the group's color.
   - Click the group name to rename it.
   - Click the card (or the arrow) to see its tabs. Use **Move to…** to send a tab to another group, or **×** to take it out of the group.
5. Click **Apply**. Your tabs are now grouped in Chrome's tab bar.

Click **Discard** if you do not like the result. Nothing changes until you press Apply.

### 2. Restore a past grouping

1. On the home screen click **History**.
2. Use the search box to find an entry by group name, tab title or site.
3. Click the **…** (three dots) on an entry and choose **Restore groups**. Matching open tabs are regrouped, and tabs you closed are reopened.
4. Choose **Delete entry** in the same menu to remove it, or **Clear history** to remove all entries.

### What it skips

- Pinned tabs and blank new tabs.
- Tabs that are already in a group (it can still add new tabs to those existing groups).
- Only one browser window is processed at a time (the one you opened the popup in), up to 150 tabs per run.

---

## Setup for developers

You need [Node.js](https://nodejs.org) 18+ and a free Gemini API key.

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Add your API key.** Get a key at <https://aistudio.google.com/apikey>, copy the example file and edit it:
   ```bash
   cp .env.example .env
   ```
   ```env
   VITE_GEMINI_API_KEY=your_key_here
   ```
3. **Build the extension**
   ```bash
   npm run build
   ```
4. **Load it in Chrome**
   1. Open `chrome://extensions`
   2. Turn on **Developer mode** (top right)
   3. Click **Load unpacked**
   4. Select the **`dist`** folder (not the project folder)
5. After any code change, run `npm run build` again and click the reload icon on the extension card. `npm run dev` rebuilds automatically on every change.

### Scripts

| Command | What it does |
|---|---|
| `npm run build` | Type-check, then build the extension into `dist/` |
| `npm run dev` | Rebuild into `dist/` whenever a file changes |
| `npm run typecheck` | Type-check only |

### Project structure

```
├── public/            manifest.json and icons (copied into dist/)
├── src/
│   ├── lib/
│   │   ├── gemini.ts  Gemini API client (retries, model fallback, error handling)
│   │   └── tabs.ts    Reading tabs, building the plan, applying groups, history
│   ├── components/    React screens: Home, Loading, Preview, History, ...
│   ├── App.tsx        App state and flow
│   ├── types.ts       Shared TypeScript types
│   └── styles.css     Light/dark styling (follows your system theme)
├── popup.html         Vite entry for the popup
└── .env.example       Template for your API key
```

### Models

The extension tries `gemini-3.5-flash-lite` first. If Gemini is overloaded or rate-limited, it retries once and then falls back to `gemini-3.1-flash-lite` and `gemini-3.5-flash`. Change them in `src/lib/gemini.ts`.

---

## Security notes

- Your key lives in `.env`, which is listed in `.gitignore`, so it is **not committed** to Git.
- Vite copies `VITE_*` variables into the built JavaScript, so the key is **inside `dist/`**. Never share, zip or publish `dist/` with a real key in it.
- For a public release (for example the Chrome Web Store), do not ship a key inside the extension. Put the key behind a small backend proxy or let each user enter their own key.
- If a key is ever exposed, delete it at <https://aistudio.google.com/apikey> and create a new one.

## Troubleshooting

| Problem | Fix |
|---|---|
| "No Gemini API key configured" | Add `VITE_GEMINI_API_KEY` to `.env`, run `npm run build`, then reload the extension. |
| "API key looks invalid / permission denied" | Check the key in `.env`, rebuild, and reload the extension. |
| "Rate limit or quota reached" | Wait a minute and try again. |
| "No ungrouped tabs to organize" | The window has only pinned, blank or already-grouped tabs. |
| Changes don't show up | Rebuild with `npm run build`, then click reload on the extension at `chrome://extensions`. |
| Chrome says the manifest is missing | You selected the project folder. Select the **`dist`** folder instead. |

## Tech stack

React 18 · TypeScript · Vite · lucide-react icons · Chrome Extensions Manifest V3 (`tabs`, `tabGroups`, `storage`) · Google Gemini API
