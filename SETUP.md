# 5-Minute Setup Guide

Everything you need to run the starter template locally.

---

## Prerequisites

You need three things installed on your computer. If you already have them, skip to **Step 3**.

### 1. Node.js (v18 or newer)

Node.js is the runtime that executes your code. Download the **LTS** version:

👉 https://nodejs.org

**Check if you have it:** open a terminal and run:
```
node --version
```
If it says `v18.x.x` or higher, you're good.

### 2. npm (comes with Node.js)

npm is the package manager that installs your project's dependencies. It installs automatically with Node.js.

**Check if you have it:**
```
npm --version
```

### 3. Git (optional but recommended)

Git is for version control and cloning repos. You probably already have it.

**Check if you have it:**
```
git --version
```

If not: https://git-scm.com/downloads

---

## Step 1 — Get the code

**Option A — Clone via git (recommended):**
```bash
git clone https://github.com/hollowtradr/sticker-galaxy-arcade-starter
cd sticker-galaxy-arcade-starter
```

**Option B — Download ZIP:**
Go to the GitHub repo → Code → Download ZIP → unzip it → open the folder in your terminal.

---

## Step 2 — Install dependencies

```bash
npm install
```

This downloads Vite (the development server) and TypeScript (the language compiler). It takes about 30 seconds.

---

## Step 3 — Start the dev server

```bash
npm run dev
```

You should see something like:
```
  VITE v5.x.x  ready in 300ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## Step 4 — Open the game

Open your browser and go to: **http://localhost:5173**

You should see the Cantina Dice game UI with:
- "Dev Player" as the player name
- 1,000 midi balance
- 3/3 daily plays remaining
- A canvas with two dice

---

## Step 5 — Test the full mock flow

1. Set the slider to a wager amount (e.g., 50 midi)
2. Click **Roll Dice**
3. Watch the dice animate, then see the result
4. Check that the midi balance updated
5. Roll two more times (you have 3 daily plays)
6. On the 4th roll attempt, you should see "No plays remaining today"

If all that works: **you're set up**. Now go read `BUILD_WITH_AI.md`.

---

## Resetting dev state

The mock player's midi balance and plays are stored in your browser's localStorage. To reset:

Open browser DevTools (F12 → Console tab) and run:
```js
window.__mockReset()
```

Or manually: DevTools → Application → Local Storage → delete `sg_arcade_mock_state`.

---

## Recommended editor: Cursor

[Cursor](https://cursor.sh) is VS Code with Claude/GPT built in. It's the fastest way to build a Sticker Galaxy game because you can paste the SDK docs directly into its context and describe what you want to build.

If you prefer plain VS Code, that works too — you won't have the AI chat built in, but you can copy-paste prompts to Claude or ChatGPT manually.

---

## What `npm run build` does

```bash
npm run build
```

This compiles and bundles your game into the `dist/` folder. The output is plain HTML/CSS/JS that you can deploy anywhere:

- **Vercel:** push to GitHub → import project → auto-deploys
- **Netlify:** drag `dist/` folder to the Netlify dashboard
- **GitHub Pages:** push `dist/` to the `gh-pages` branch

Your deployed URL goes in `manifest.json` under `"url"`.

---

## Troubleshooting

**"npm install" fails:**
- Make sure you're using Node.js v18+: `node --version`
- Try deleting `node_modules/` and `package-lock.json`, then re-running `npm install`

**Page won't load / blank screen:**
- Open browser DevTools (F12) → check the Console tab for errors
- Make sure `npm run dev` is still running in your terminal

**Mock player shows wrong balance:**
- Run `window.__mockReset()` in the browser console to reset
- Or clear localStorage: DevTools → Application → Local Storage

**TypeScript errors in editor:**
- Run `npm install` if you haven't
- Restart your TypeScript language server: Ctrl+Shift+P → "TypeScript: Restart TS Server"

---

*Once you're running, go to `BUILD_WITH_AI.md` to start building your actual game.*
