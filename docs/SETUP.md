# Phoenix V2 — Setup Guide

Complete installation instructions for **Windows**, **Linux**, and **macOS**.

---

## Before You Start — What You Need

| Requirement | Minimum Version | How to Check |
|---|---|---|
| Node.js | 18.x or higher | `node --version` |
| npm | 9.x or higher | `npm --version` |
| Git | Any recent version | `git --version` |
| Gemini API key | Free tier | [Get one here](#step-1-get-your-gemini-api-key) |
| RAM | 4 GB available | — |
| Disk space | ~500 MB (node_modules) | — |

No GPU required. No Docker required. No cloud account required beyond the Gemini API key.

---

## Step 1 — Get Your Gemini API Key (Free)

1. Open [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey) in your browser
2. Sign in with any Google account
3. Click **Create API key**
4. Select **Create API key in new project** (or use an existing project)
5. Copy the key — it looks like: `AIzaSy...`
6. Keep this key ready for Step 4 below

> **Free tier limits:** The Gemini free tier allows approximately 15 requests per minute and 1,500 requests per day. This is sufficient for normal personal use of Phoenix V2. The Daydream Engine and Subconscious cycle are rate-limited to avoid exceeding these quotas.

---

## Step 2 — Install Node.js

### Windows

1. Go to [https://nodejs.org](https://nodejs.org)
2. Download the **LTS** version (the left button — not "Current")
3. Run the installer — accept all defaults
4. When asked about "Tools for Native Modules", **check the box** — Phoenix V2 uses `better-sqlite3` which requires native compilation
5. Restart your computer after installation
6. Open **PowerShell** and verify:
   ```powershell
   node --version
   npm --version
   ```
   Both should print version numbers without errors.

> **Windows note:** If you already have Node.js installed but it is older than v18, uninstall it first via Settings → Apps, then install the current LTS.

### Linux (Ubuntu / Debian)

```bash
# Using NodeSource repository (recommended — gets latest LTS)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

If you are on a different distribution (Fedora, Arch, etc.), use the equivalent package manager or download from [https://nodejs.org](https://nodejs.org).

### macOS

**Option A — Homebrew (recommended if you have it):**
```bash
brew install node
node --version
```

**Option B — Official installer:**
1. Go to [https://nodejs.org](https://nodejs.org)
2. Download the **LTS** version
3. Run the `.pkg` installer
4. Open **Terminal** and verify:
   ```bash
   node --version
   npm --version
   ```

---

## Step 3 — Clone the Repository

### Windows (PowerShell)

```powershell
# Navigate to where you want to put the project
cd C:\Users\YourName\Documents

# Clone
git clone https://github.com/cleversonbrsantos-art/phoenix-v2.git

# Enter the folder
cd phoenix-v2
```

If you don't have Git, download it from [https://git-scm.com](https://git-scm.com) and install with defaults.  
Alternatively, click the green **Code** button on GitHub and select **Download ZIP**, then extract it.

### Linux / macOS (Terminal)

```bash
# Navigate to where you want to put the project
cd ~/Documents

# Clone
git clone https://github.com/cleversonbrsantos-art/phoenix-v2.git

# Enter the folder
cd phoenix-v2
```

---

## Step 4 — Configure Your API Key

Inside the project folder, there is a file called `.env.example`. You need to copy it and add your key.

### Windows (PowerShell)

```powershell
# Copy the example file
Copy-Item .env.example .env

# Open it in Notepad
notepad .env
```

Inside Notepad, change the first line from:
```
GEMINI_API_KEY="MY_GEMINI_API_KEY"
```
to:
```
GEMINI_API_KEY="AIzaSy...your-actual-key-here..."
```

Save and close Notepad. Leave the other lines as-is.

### Linux / macOS (Terminal)

```bash
# Copy the example file
cp .env.example .env

# Open it in a text editor
nano .env
# or: code .env  (if you have VS Code)
# or: open -e .env  (macOS TextEdit)
```

Change `MY_GEMINI_API_KEY` to your actual key. Save with `Ctrl+O` → `Enter` → `Ctrl+X` (in nano).

> **Security:** The `.gitignore` already excludes `.env` from version control. Your key will never be committed to Git accidentally.

---

## Step 5 — Install Dependencies

This downloads all required packages into the `node_modules` folder (~450 MB).

### All Operating Systems

```bash
npm install
```

This takes 1–3 minutes depending on your internet connection.

**Windows-specific note:** If you see errors mentioning `better-sqlite3` or `node-gyp` during install, it means the native compilation tools are missing. Fix it by running this in PowerShell **as Administrator**:

```powershell
npm install --global windows-build-tools
```

Then run `npm install` again inside the project folder.

---

## Step 6 — Run Phoenix V2

```bash
npm run dev
```

You should see output similar to:

```
Phoenix V2 Brain initializing...
Phoenix V2 Brain is ready.
SubconsciousEngine started.
[Daydream] Engine started. Idle threshold: 120s
Phoenix V2 Server running on http://localhost:3000
```

Open your browser and go to: **[http://localhost:3000](http://localhost:3000)**

The React interface will load. You can start talking to Phoenix immediately.

> **First run:** On the first startup, Phoenix creates the SQLite database at `.data/vault/phoenix_neural_db.sqlite`. This is where all memories, emotional state, and identity data are stored. Do not delete this file — it is Phoenix's long-term memory.

---

## Step 7 — Verify Everything is Working

In the browser, you should see:

- The dark terminal-style interface with a header showing **Phoenix V2**
- A system message: `SYSTEM ONLINE. PHOENIX V2 COGNITIVE CORE INITIALIZED.`
- A greeting message from Phoenix
- A text input at the bottom

Type any message and press Enter. Phoenix should respond within a few seconds.

If the interface loads but Phoenix does not respond, check the terminal where `npm run dev` is running for error messages — the most common cause is an incorrect or missing API key in `.env`.

---

## Stopping the Server

Press `Ctrl+C` in the terminal where `npm run dev` is running.

---

## Restarting

Just run `npm run dev` again. Your conversation history and all memories are preserved in the SQLite database.

---

## Troubleshooting

### "Cannot find module" error on startup

```bash
npm install
```
Run this again — a package may have failed to install.

### "GEMINI_API_KEY is not set" or API errors

Open `.env` and verify:
- The file exists (not just `.env.example`)
- The key is on the first line, inside quotes, with no extra spaces
- The key starts with `AIzaSy`

### Port 3000 already in use

Another application is using port 3000. Either stop it, or change the port in `server.ts`:
```typescript
const PORT = 3001;  // change to any free port
```
Then access the app at `http://localhost:3001`.

### Windows: `better-sqlite3` fails to build

Run PowerShell as Administrator and execute:
```powershell
npm install --global windows-build-tools
```
Then retry `npm install` in the project folder.

### Linux: `EACCES` permission error during npm install

Do not use `sudo npm install`. Instead, fix npm permissions:
```bash
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```
Add the export line to your `~/.bashrc` or `~/.zshrc`, then reload: `source ~/.bashrc`.

### macOS: "node-gyp" or Xcode errors

```bash
xcode-select --install
```
This installs the macOS command-line developer tools required for native module compilation.

---

## Optional — Running the TypeScript Linter

To verify the code has no type errors:

```bash
npm run lint
```

Expected output: nothing (silence = zero errors).

---

## Data Storage

Phoenix stores all persistent data in the `.data/` folder inside the project:

```
phoenix-v2/
└── .data/
    └── vault/
        └── phoenix_neural_db.sqlite   ← all memories, emotions, identity
```

This folder is excluded from Git (listed in `.gitignore`). To reset Phoenix to a blank state, delete the `.data/` folder and restart — a fresh database will be created automatically.

---

## What Each Script Does

| Command | What It Does |
|---|---|
| `npm run dev` | Starts Phoenix in development mode (recommended) |
| `npm run build` | Compiles TypeScript to production-ready JavaScript |
| `npm run start` | Runs the compiled production build (requires `npm run build` first) |
| `npm run lint` | Runs TypeScript type-checking without compiling |
| `npm run clean` | Removes compiled output files |

---

## Reading the Book Alongside the Code

If you are reading *Building Persistent Artificial Intelligence*, the recommended approach is:

1. Keep the project open in VS Code alongside the book
2. Use the chapter map at [`docs/chapter-map.md`](chapter-map.md) to find which file corresponds to what you are reading
3. Run the system with `npm run dev` and observe the terminal logs as you interact — they show exactly which agent is executing and what decisions are being made
4. The logs are intentional — they are the system narrating its own cognition

---

*Having trouble? Open an issue on GitHub with your OS, Node.js version, and the exact error message.*
