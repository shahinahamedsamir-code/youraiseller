# Deploy YourAI Seller to 182.48.90.163 (one-time server setup)
#
# You need SSH access to the server. From your PC (PowerShell):
#
# 1) Copy project to server (adjust user/path):
#    scp -r I:\youraiseller user@182.48.90.163:~/youraiseller
#
# 2) SSH in and run deploy script:
#    ssh user@182.48.90.163
#    cd ~/youraiseller && bash scripts/deploy-production.sh
#
# 3) On server .env.local must include (same secret as local dev):
#    NEXT_PUBLIC_APP_URL=http://182.48.90.163:3000
#    AUTO_CALL_AUDIO_SYNC_SECRET=youraiseller-audio-sync-2026
#    TEAMITQAN_AUDIO_API_KEY=...
#    TEAMITQAN_AUDIO_DID=09643331101
#
# 4) Restart local dev server — uploads auto-sync to production.
#
# 5) Sync existing local audio files once:
#    POST /api/auto-call/sync-audio  { "scope": "U-002" }
