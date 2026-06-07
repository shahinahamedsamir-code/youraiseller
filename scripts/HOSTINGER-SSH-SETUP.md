# Hostinger — persistent data setup (u436250536)

SSH details (from hPanel):

| Field | Value |
|-------|--------|
| IP | `195.35.39.220` |
| Port | `65002` |
| User | `u436250536` |

**Never paste your SSH password in chat.** Use it only in your own terminal when prompted.

---

## Step 1 — Connect from your PC (PowerShell)

```powershell
ssh -p 65002 u436250536@195.35.39.220
```

Enter password when asked (Hostinger → SSH details → Change if needed).

---

## Step 2 — Go to your app folder

Try one of these (whichever has `package.json`):

```bash
cd ~/youraiseller
# OR
cd ~/domains/youraiseller.com/public_html
```

Check:

```bash
ls package.json
```

---

## Step 3 — Run the setup script

If the repo is already on the server:

```bash
bash scripts/setup-hostinger-persistent.sh
```

If app is in a custom path:

```bash
bash scripts/setup-hostinger-persistent.sh /home/u436250536/your/path
```

---

## Step 4 — hPanel environment variables

Websites → youraiseller → **Node.js** or **Advanced** → **Environment variables**

Add:

```env
SELLER_DATA_DIR=/home/u436250536/persistent/data/seller
PLATFORM_DATA_DIR=/home/u436250536/persistent/data/platform
APP_DATA_DIR=/home/u436250536/persistent/data
```

---

## Step 5 — Restart app

```bash
pm2 restart youraiseller
```

Or restart from Hostinger hPanel.

---

## Step 6 — Verify

```bash
ls -la /home/u436250536/persistent/data/seller/
cat /home/u436250536/persistent/data/seller/U-002/autocall-wallet.json 2>/dev/null || echo "wallet created on first recharge/call"
```

Open site → Auto Call balance + SMS balance should stay after next git deploy.

---

## If repo is not on server yet

From your PC (after SSH works):

```powershell
scp -P 65002 -r I:\youraiseller u436250536@195.35.39.220:~/youraiseller
```

Then SSH in and run Step 3.
