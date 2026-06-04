"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import {
  formatAutoCallTaka,
  loadAutoCallSettings,
  loadAutoCallWallet,
  refreshAutoCallAccount,
  saveAutoCallSettings,
  saveAutoCallSettingsToServer,
  testAutoCallViaApi,
  uploadAutoCallAudio,
  removeAutoCallVoiceViaApi,
  type AutoCallDtmfOption,
  type AutoCallSettings,
} from "@/lib/auto-call-store";
import { loadActiveDeliveryMethods } from "@/lib/delivery-methods-store";
import {
  AUTO_CALL_KEY_ORDER_ACTIONS,
  defaultOrderActionForKey,
} from "@/lib/auto-call-key-actions";
import {
  acBtnPrimary,
  acCard,
  acCardSoft,
  acHint,
  acInput,
  acLabel,
  acSectionSub,
  acSectionTitle,
  acTipBox,
} from "@/lib/auto-call-ui";

const inputCls = acInput;
const labelCls = acLabel;

export function AutoCallSetupPanel() {
  const [settings, setSettings] = useState<AutoCallSettings>(() => loadAutoCallSettings());
  const [wallet, setWallet] = useState(() => loadAutoCallWallet());
  const [testPhone, setTestPhone] = useState("");
  const [voiceLabel, setVoiceLabel] = useState("");
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [systemEnabled, setSystemEnabled] = useState(true);
  const [platformDid, setPlatformDid] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [audioDeployWarning, setAudioDeployWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const deliveryMethods = loadActiveDeliveryMethods();

  useEffect(() => {
    void refreshAutoCallAccount().then((data) => {
      if (!data) return;
      setSettings(data.account.settings);
      setWallet({
        balanceTaka: data.account.balanceTaka,
        walletTaka: data.account.walletTaka,
        ratePerMinute: data.callPriceTaka,
        platformDid: data.defaultDid,
      });
      setProviderConfigured(data.providerConfigured);
      setSystemEnabled(data.systemEnabled);
      setPlatformDid(data.defaultDid);
      setAudioDeployWarning(
        data.callAudio?.warning ??
          (data.callAudio?.reachable === false ? data.callAudio.error ?? null : null)
      );
    });

    const refresh = () => {
      const w = loadAutoCallWallet();
      setSettings(loadAutoCallSettings());
      setWallet(w);
      if (w.platformDid) setPlatformDid(w.platformDid);
    };
    window.addEventListener("youraiseller-autocall-updated", refresh);
    return () => window.removeEventListener("youraiseller-autocall-updated", refresh);
  }, []);

  const addDtmf = () => {
    setSettings((s) => {
      const used = new Set(
        s.dtmfOptions
          .map((r) => r.key.trim())
          .filter(Boolean)
      );
      let nextKey = "1";
      for (let i = 1; i <= 9; i += 1) {
        const k = String(i);
        if (!used.has(k)) {
          nextKey = k;
          break;
        }
      }
      return {
        ...s,
        dtmfOptions: [
          ...s.dtmfOptions,
          {
            id: `dtmf-${Date.now()}`,
            key: nextKey,
            voiceLabel: "",
            orderAction: defaultOrderActionForKey(nextKey),
          },
        ],
      };
    });
  };

  const updateDtmf = (id: string, patch: Partial<AutoCallDtmfOption>) => {
    setSettings((s) => ({
      ...s,
      dtmfOptions: s.dtmfOptions.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        if (patch.key != null && patch.orderAction == null) {
          next.orderAction = defaultOrderActionForKey(patch.key);
        }
        if (patch.voiceLabel != null) {
          const voice = s.voices.find((v) => v.label === patch.voiceLabel);
          next.audioUrl = voice?.audioUrl;
        }
        return next;
      }),
    }));
  };

  const removeDtmf = (id: string) => {
    setSettings((s) => ({
      ...s,
      dtmfOptions: s.dtmfOptions.filter((r) => r.id !== id),
    }));
  };

  const handleUploadVoice = async () => {
    if (!voiceFile) {
      setErrors(["Select a .wav or .mp3 file to upload."]);
      return;
    }

    const label =
      voiceLabel.trim() ||
      voiceFile.name.replace(/\.[^.]+$/i, "").trim() ||
      "Voice";

    setUploading(true);
    setErrors([]);
    setUploadSuccess(null);

    const result = await uploadAutoCallAudio({ label, file: voiceFile });
    setUploading(false);

    if (!result.ok || !result.voice) {
      setErrors([result.error ?? "Upload failed"]);
      return;
    }

    if (result.warning) {
      setErrors([result.warning]);
    } else {
      setErrors([]);
    }

    const nextSettings = result.account?.settings ?? {
      ...settings,
      voices: [...settings.voices, result.voice],
      questionVoiceId: settings.questionVoiceId || result.voice.id,
    };
    setSettings(nextSettings);
    saveAutoCallSettings(nextSettings);
    setVoiceLabel("");
    setVoiceFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploadSuccess(`"${result.voice.label}" uploaded successfully.`);
    void refreshAutoCallAccount().then((data) => {
      if (!data) return;
      setAudioDeployWarning(
        data.callAudio?.warning ??
          (data.callAudio?.reachable === false ? data.callAudio.error ?? null : null)
      );
    });
  };

  const handleRemoveVoice = async (id: string) => {
    const result = await removeAutoCallVoiceViaApi(id);
    if (!result.ok) {
      setErrors([result.error ?? "Could not remove voice"]);
      return;
    }
    setSettings(result.account?.settings ?? loadAutoCallSettings());
    setUploadSuccess(null);
  };

  const removeVoice = (id: string) => {
    void handleRemoveVoice(id);
  };

  const handleSave = async () => {
    const nextErrors: string[] = [];
    const voice = settings.voices.find((v) => v.id === settings.questionVoiceId);
    if (!settings.questionVoiceId || !voice?.audioUrl?.trim()) {
      nextErrors.push("Please select a main voice message for calls.");
    }
    if (!settings.defaultDeliveryMethodId) {
      nextErrors.push("Please choose a default delivery method.");
    }
    setErrors(nextErrors);
    if (nextErrors.length > 0) return;

    setSaving(true);
    saveAutoCallSettings(settings);
    const result = await saveAutoCallSettingsToServer(settings);
    setSaving(false);
    if (!result.ok) {
      setErrors([result.error ?? "Save failed"]);
      return;
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const handleTestCall = async () => {
    setTestResult(null);
    if (!testPhone.trim()) {
      setTestResult("Enter a test phone number.");
      return;
    }
    setTesting(true);
    const result = await testAutoCallViaApi(testPhone.trim());
    setTesting(false);
    if (!result.ok) {
      setTestResult(result.error ?? "Test call failed");
      return;
    }
    setTestResult(
      result.campaignId
        ? `Test call started! Your phone should ring shortly.${result.warning ? ` Note: ${result.warning}` : ""}`
        : `${result.message ?? "Test call started!"}${result.warning ? ` · ${result.warning}` : ""}`
    );
  };

  return (
    <div className="space-y-5">
      {audioDeployWarning ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-bold">Voice file not ready yet</p>
          <p className="mt-1 text-xs leading-relaxed">
            Your uploaded voice could not be loaded for calling. Please upload the audio file
            again below. If the problem continues, contact support.
          </p>
        </div>
      ) : null}

      <section className={acCardSoft}>
        <h2 className={acSectionTitle}>Your balance</h2>
        <p className={acSectionSub}>Call minutes are deducted from this balance each time you call.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl bg-violet-50 p-4 ring-1 ring-violet-100">
            <p className="text-xs font-semibold text-violet-600">Available balance</p>
            <p className="text-xl font-bold tabular-nums text-violet-900">
              {formatAutoCallTaka(wallet.balanceTaka)} BDT
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Total recharged</p>
            <p className="text-xl font-bold text-slate-900">
              {formatAutoCallTaka(wallet.walletTaka)} BDT
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Rate</p>
            <p className="text-xl font-bold text-slate-900">
              {formatAutoCallTaka(wallet.ratePerMinute)} BDT/min
            </p>
          </div>
        </div>
        {!systemEnabled ? (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
            Call service is temporarily unavailable.
          </p>
        ) : null}
      </section>

      <section className={acCard}>
        <h2 className={acSectionTitle}>Test your setup</h2>
        <p className={`${acSectionSub} mb-4`}>
          Enter your mobile number and hear exactly what customers will hear on a real order call.
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <span className={labelCls}>Caller number (shown to customer)</span>
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold tabular-nums text-slate-800">
              {platformDid ?? "Not set yet"}
            </p>
            <p className={`${acHint} mt-1.5`}>This is the number customers see when you call them.</p>
          </div>
          <label>
            <span className={labelCls}>Your mobile number</span>
            <div className="flex gap-2">
              <input
                className={inputCls}
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
              />
              <button
                type="button"
                disabled={testing || !providerConfigured || !systemEnabled}
                onClick={() => void handleTestCall()}
                className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-800 disabled:opacity-50"
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Send test call
              </button>
            </div>
            {testResult ? (
              <p className="mt-1 text-xs font-semibold text-slate-600">{testResult}</p>
            ) : null}
          </label>
        </div>
      </section>

      <section className={acCard}>
        <h2 className={acSectionTitle}>Voice messages</h2>
        <p className={`${acSectionSub} mb-3`}>
          Upload the audio customers hear when they pick up. You need at least two files — one
          main question and one for when they press a key.
        </p>
        <div className={acTipBox}>
          <strong>Tip:</strong> Use clear .wav or .mp3 files (max 5 MB). Example: &quot;Your order
          from Adorix — press 1 to confirm, press 2 to cancel.&quot;
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <label className="sm:col-span-1">
            <span className={labelCls}>Name (e.g. Order confirm)</span>
            <input
              className={inputCls}
              value={voiceLabel}
              onChange={(e) => setVoiceLabel(e.target.value)}
              placeholder="Order confirmation"
            />
          </label>
          <label className="sm:col-span-1">
            <span className={labelCls}>Audio file (.wav or .mp3)</span>
            <input
              type="file"
              ref={fileInputRef}
              accept=".wav,.mp3,audio/wav,audio/mpeg"
              className={inputCls}
              onChange={(e) => setVoiceFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <div className="flex items-end sm:col-span-1">
            <button
              type="button"
              disabled={uploading || !systemEnabled}
              onClick={() => void handleUploadVoice()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Upload voice
            </button>
          </div>
        </div>

        {uploadSuccess ? (
          <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
            {uploadSuccess}
          </p>
        ) : null}

        {settings.voices.length > 0 ? (
          <ul className="mb-4 space-y-2">
            {settings.voices.map((v) => (
              <li
                key={v.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-semibold text-slate-800">
                    {v.label}
                    {v.uploaded ? (
                      <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
                        saved
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-slate-400">{v.label}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeVoice(v.id)}
                  className="text-xs font-bold text-rose-600"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <label>
          <span className={labelCls}>Main message (played when customer answers)</span>
          <select
            className={inputCls}
            value={settings.questionVoiceId}
            onChange={(e) =>
              setSettings({ ...settings, questionVoiceId: e.target.value })
            }
          >
            <option value="">Choose a voice message…</option>
            {settings.voices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className={acCard}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className={acSectionTitle}>Keypad responses</h2>
            <p className={acSectionSub}>
              Pick the voice for each key. Auto Call column only shows what the customer
              pressed (Pressed 1, Pressed 2…). You choose below where the order goes.
            </p>
          </div>
          <button
            type="button"
            onClick={addDtmf}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" /> Add key
          </button>
        </div>
        <p className={`${acHint} mb-4`}>
          <strong>Call status</strong> shows: Calling · Pressed 1/2/3 · Rejected (call cut) ·
          No Answer (no key). <strong>Order goes to</strong> is your choice per key — default
          Key 1 → Approved Pending, Key 2 → Cancel.
        </p>
        <div className="space-y-3">
          {settings.dtmfOptions.map((row) => {
            const keyLabel = row.key.trim() ? `Key ${row.key.trim()}` : "Key ?";
            const usedByOthers = new Set(
              settings.dtmfOptions
                .filter((r) => r.id !== row.id)
                .map((r) => r.key.trim())
                .filter(Boolean)
            );

            return (
              <div
                key={row.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3"
              >
                <label className="shrink-0">
                  <span className="sr-only">Phone key</span>
                  <select
                    className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm font-extrabold text-violet-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    value={row.key}
                    onChange={(e) => updateDtmf(row.id, { key: e.target.value })}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((digit) => {
                      const value = String(digit);
                      const taken = usedByOthers.has(value);
                      return (
                        <option key={value} value={value} disabled={taken}>
                          Key {digit}
                          {taken ? " (in use)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </label>

                <label className="min-w-[200px] flex-1">
                  <span className={labelCls}>Voice when customer presses {keyLabel}</span>
                  <select
                    className={inputCls}
                    value={row.voiceLabel}
                    onChange={(e) => updateDtmf(row.id, { voiceLabel: e.target.value })}
                  >
                    <option value="">Choose voice message…</option>
                    {settings.voices.map((v) => (
                      <option key={v.id} value={v.label}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="min-w-[220px] flex-1">
                  <span className={labelCls}>Order goes to when {keyLabel} is pressed</span>
                  <select
                    className={inputCls}
                    value={row.orderAction ?? defaultOrderActionForKey(row.key)}
                    onChange={(e) =>
                      updateDtmf(row.id, {
                        orderAction: e.target.value as AutoCallDtmfOption["orderAction"],
                      })
                    }
                  >
                    {AUTO_CALL_KEY_ORDER_ACTIONS.map((action) => (
                      <option key={action.value} value={action.value}>
                        {action.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] leading-snug text-slate-500">
                    {
                      AUTO_CALL_KEY_ORDER_ACTIONS.find(
                        (a) =>
                          a.value === (row.orderAction ?? defaultOrderActionForKey(row.key))
                      )?.description
                    }
                  </p>
                </label>

                <button
                  type="button"
                  onClick={() => removeDtmf(row.id)}
                  className="inline-flex shrink-0 items-center gap-1 self-end pb-2 text-xs font-bold text-rose-600 hover:text-rose-700"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className={acCard}>
        <h2 className={`${acSectionTitle} mb-4`}>Call preferences</h2>
        <p className={`${acHint} mb-4`}>
          If the customer does not pick up, cuts the call (Rejected), or does not press a key
          (No Answer), we call again — up to <strong>Max call attempts</strong>, waiting{" "}
          <strong>Wait before retry</strong> minutes between tries. Key presses stop retries.
          Enable <strong>Retry if customer does not answer</strong> in Rules.
        </p>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <label className="lg:col-span-2">
            <span className={labelCls}>Default delivery method</span>
            <select
              className={inputCls}
              value={settings.defaultDeliveryMethodId}
              onChange={(e) =>
                setSettings({ ...settings, defaultDeliveryMethodId: e.target.value })
              }
            >
              <option value="">Select delivery method…</option>
              {deliveryMethods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelCls}>Max call attempts</span>
            <input
              type="number"
              min={1}
              max={3}
              className={inputCls}
              value={settings.maxAttempts}
              onChange={(e) =>
                setSettings({ ...settings, maxAttempts: Number(e.target.value) || 1 })
              }
            />
          </label>
          <label>
            <span className={labelCls}>Wait before retry (minutes)</span>
            <input
              type="number"
              min={5}
              max={120}
              className={inputCls}
              value={settings.retryGapMinutes}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  retryGapMinutes: Number(e.target.value) || 15,
                })
              }
            />
          </label>
          <label>
            <span className={labelCls}>Minutes charged per call</span>
            <input
              type="number"
              min={1}
              max={10}
              className={inputCls}
              value={settings.perCallDurationMinutes}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  perCallDurationMinutes: Number(e.target.value) || 3,
                })
              }
            />
          </label>
        </div>
      </section>

      {errors.length > 0 ? (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
          {errors.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        disabled={saving}
        onClick={() => void handleSave()}
        className={acBtnPrimary}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save setup
        {saved ? <span className="text-teal-100">· Saved!</span> : null}
      </button>
    </div>
  );
}
