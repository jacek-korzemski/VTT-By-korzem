## FreeRoll VTT – simple self‑hosted virtual table

FreeRoll VTT is a **lightweight Virtual TableTop** that you can build once and host on a **simple PHP/Apache (or nginx) server** – no databases, no Docker, no always‑on Node server.

### Key features

- **Scenes & map management**
  - multiple scenes with **create / rename / duplicate / delete**
  - instant **scene switching** for all connected players
  - per‑scene state: background, fog of war, map elements, tokens

- **Background maps**
  - background images prepared for a **64×64 px grid**
  - upload backgrounds to `backend/assets/backgrounds`
  - on‑the‑fly **zoom, offset and reset** of the background (position & scale)

- **Map elements & tokens**
  - separate browsers for **map elements** (`backend/assets/map`) and **tokens** (`backend/assets/tokens`)
  - drag & drop assets onto the grid, snapping to cells
  - **collision checks** so you do not stack multiple tokens/elements on one cell by accident
  - **eraser tool** to quickly remove placed map elements

- **Fog of war (grid‑based)**
  - per‑cell fog of war stored as a bitmap in backend state
  - **edit mode for Game Master only**, with circular brush and configurable size
  - **reveal / hide mode**, including **Reveal all** and **Hide all**
  - optional **50% opacity preview for GM** so you can see both map and fog

- **Dice rolling**
  - standard dice: **d4, d6, d8, d10, d12, d20, d100**, with any number of dice
  - **per‑player name**, saved in browser
  - modifier support and **readable roll history** (shared across clients via backend)
  - optional **Legend of the Five Rings (L5R) module** with correct ring/skill dice faces, explosive dice and totals (success / opportunity / strife)

- **Notepads & templates**
  - up to **3 parallel WYSIWYG notepads** per user
  - **save / load content as JSON** and export as HTML
  - support for **HTML templates from the server** (`backend/assets/templates/*.html`) – great for character sheets
  - central **Notes Template context** so macros can read fields from templates

- **Macro editor**
  - visual editor for **dice macros** using expressions like `2d6+@str`
  - macros can read values from **named fields in notepad templates** (e.g. character sheet stats)
  - sort, edit, import/export macros and run them directly into the dice history

- **PDF reader panel**
  - list and open server PDFs from `backend/assets/papers`
  - **local browser storage** for additional PDFs (per client, no upload required)
  - lazy‑loaded pages for good performance even on large books

- **Ping tool**
  - Game Master can **ping a grid cell**; all players’ views scroll there with an animated highlight
  - optional **clear ping** so new players are not auto‑focused on old pings

- **Uploads from UI**
  - built‑in upload panel for GMs to send **tokens, map elements, backgrounds, templates and PDFs** directly to the server
  - basic validation of file types and size, with detailed error messages

- **Simple auth & GM mode**
  - **player password** and **GM password**, configured at build time
  - login page generated from `index.php.template` with localized text
  - backend keeps track of **GM vs player** and restricts sensitive actions (uploads, fog editing, scene edits, etc.)

- **Multi‑language support (en / pl)**
  - UI strings stored in `frontend/src/lang/translations.json`
  - language chosen at build time (`en` or `pl`) and injected via `VITE_LANGUAGE`

---

## Requirements

### To build the app

- **Node.js 18+** (`https://nodejs.org/`)
- **Windows** (if you want to use the provided `build.bat` / `build_pl.bat` helpers)

### Server to run the built package

- **PHP 7.4+**
- Web server that supports:
  - `.htaccess` files (Apache) **or**
  - equivalent configuration on nginx (rewrites + protection of `.env` and data files)

The final `build` folder is static assets + a small PHP backend, so it can be hosted on most shared PHP hostings.

---

## Fast start on Windows

### 1. Build the package

In the project root run **one** of:

- `build.bat` – interactive build script (prompts in English, default language: **en**)
- `build_pl.bat` – interactive build script (prompts in Polish, default language: **pl**)

The script will ask you for:

- **player password** and **GM password**
- **base path** (e.g. `/vtt/room1/` – where the app will live on your server)
- **UI language** (`en` / `pl`)
- whether to **enable L5R dice module**
- allowed HTTP origins for the API (`ALLOWED_ORIGINS` in backend `.env`)

It will then:

- prepare a fresh `frontend/.env` for the chosen configuration
- run `npm install` (only once, if needed) and `npm run build`
- assemble the `build` folder with:
  - `index.php` generated from `index.php.template`
  - `assets/` with all frontend bundles
  - `backend/` with `api.php`, `.env`, `.htaccess`, `data/`, `assets/…`
  - placeholder `.gitkeep` files for empty asset folders

### 2. Deploy the package

If the build finished successfully, you should see a new `build` folder in the project root.

- **Upload the contents of `build/`** (not the folder itself) to the target directory on your server that matches the base path you chose.
- Put your assets on the server side into:
  - `backend/assets/map/` – map elements
  - `backend/assets/tokens/` – tokens
  - `backend/assets/backgrounds/` – background maps
  - `backend/assets/papers/` – PDFs for the reader
  - `backend/assets/templates/` – HTML templates for notepads / character sheets
- Ensure that `backend/data/` is **writable** by the web server user, e.g. on Linux:
  - `chmod 755 backend/data/` (or more permissive, depending on your hosting)

Then open your configured URL (e.g. `https://yourdomain.com/vtt/room1/`) and log in with the configured player / GM password.

---

## For developers

### Run backend in dev mode (no auth, CORS for localhost)

```bash
cd backend
php -S localhost:8080
```

This starts the PHP built‑in server on `http://localhost:8080` and enables development shortcuts in `api.php` (automatic auth bypass, optional GM override via `?gm=1` or `dev_gm` cookie).

### Run frontend with Vite dev server

```bash
cd frontend
npm install
npm run dev
```

By default the frontend dev server runs on `http://localhost:5173` and talks to the backend at `http://localhost:8080/backend/api.php`. You can change those in your local `.env` / config if needed.
