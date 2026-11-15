import { useCallback, useEffect, useState } from "react";
import { getSettings } from "./lib/gemini";
import { applyPlan, clearPendingPlan, getStats, loadPendingPlan, restoreEntry, savePendingPlan, suggest } from "./lib/tabs";
import type { Plan, ToastType, View } from "./types";
import { History } from "./components/History";
import { Home } from "./components/Home";
import { Logo } from "./components/Icons";
import { Loading } from "./components/Loading";
import { Preview } from "./components/Preview";

const NO_KEY = "No Gemini API key configured. Add VITE_GEMINI_API_KEY to .env and rebuild the extension.";
const LOADING_MESSAGES = ["Analyzing your tabs…", "Finding related topics…", "Naming your groups…", "Almost there…"];
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function App() {
  const [view, setView] = useState<View>("home");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [stats, setStats] = useState<{ tabs: number | string; groups: number | string }>({ tabs: "–", groups: "–" });
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const [loadingText, setLoadingText] = useState(LOADING_MESSAGES[0]);
  const [applying, setApplying] = useState(false);

  const showToast = useCallback((msg: string, type: ToastType = "") => setToast(msg ? { msg, type } : null), []);
  const refreshStats = useCallback(async () => {
    try {
      setStats(await getStats());
    } catch {
      /* stats are cosmetic */
    }
  }, []);

  // Success notices fade after a few seconds.
  useEffect(() => {
    if (toast?.type !== "success") return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Keep the in-progress suggestion so it survives closing the popup.
  useEffect(() => {
    if (plan) void savePendingPlan(plan);
  }, [plan]);

  // On open: stats, resume a pending suggestion for this window, check the key.
  useEffect(() => {
    void (async () => {
      await refreshStats();
      const pending = await loadPendingPlan();
      const win = await chrome.windows.getCurrent();
      if (pending && pending.windowId === win.id) {
        setPlan(pending);
        setView("preview");
      }
      const { apiKey } = await getSettings();
      if (!apiKey) showToast(NO_KEY, "error");
    })();
  }, [refreshStats, showToast]);

  async function organize() {
    showToast("");
    const { apiKey } = await getSettings();
    if (!apiKey) return showToast(NO_KEY, "error");
    setLoadingText(LOADING_MESSAGES[0]);
    setView("loading");
    let i = 0;
    const timer = setInterval(() => {
      i = Math.min(i + 1, LOADING_MESSAGES.length - 1);
      setLoadingText(LOADING_MESSAGES[i]);
    }, 2500);
    try {
      setPlan(await suggest());
      setView("preview");
    } catch (e) {
      setView("home");
      showToast((e as Error).message || "Something went wrong. Your tabs were not changed.", "error");
    } finally {
      clearInterval(timer);
    }
  }

  async function apply() {
    if (!plan) return;
    setApplying(true);
    try {
      const r = await applyPlan(plan);
      setPlan(null);
      setView("home");
      await refreshStats();
      showToast(`Done! Created ${plural(r.groups, "group")} from ${r.tabs} tabs.`, "success");
    } catch (e) {
      showToast((e as Error).message || "Couldn't apply groups.", "error");
    } finally {
      setApplying(false);
    }
  }

  async function discard() {
    await clearPendingPlan();
    setPlan(null);
    showToast("");
    setView("home");
  }

  async function restore(id: string) {
    try {
      const r = await restoreEntry(id);
      await refreshStats();
      setView("home");
      showToast(`Restored ${plural(r.groups, "group")} (${r.tabs} tabs${r.reopened ? `, ${r.reopened} reopened` : ""}).`, "success");
    } catch (e) {
      showToast((e as Error).message, "error");
    }
  }

  return (
    <>
      <header className="top">
        <div className="brand">
          <Logo />
          <h1>TabSense <em>AI</em></h1>
        </div>
      </header>

      {toast && (
        <div id="toast" className={toast.type} role="status" aria-live="polite">
          {toast.msg}
        </div>
      )}

      {view === "home" && (
        <Home
          tabs={stats.tabs}
          groups={stats.groups}
          onOrganize={organize}
          onHistory={() => {
            showToast("");
            setView("history");
          }}
        />
      )}
      {view === "loading" && <Loading text={loadingText} />}
      {view === "preview" && plan && <Preview plan={plan} setPlan={(fn) => setPlan((p) => (p ? fn(p) : p))} applying={applying} onApply={apply} onDiscard={discard} />}
      {view === "history" && (
        <History
          onBack={() => {
            showToast("");
            setView("home");
          }}
          onRestore={restore}
        />
      )}
    </>
  );
}
