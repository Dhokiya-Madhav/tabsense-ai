import { callGemini, AppError } from "./gemini";
import type { GroupColor, HistoryEntry, HistoryGroup, Plan, PlanGroup, TabInfo } from "../types";

const COLORS: GroupColor[] = ["blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange"];
export const ALL_COLORS: GroupColor[] = [...COLORS, "grey"];
const MAX_TABS = 150;
const MIN_TABS = 1;

type ChromeTab = chrome.tabs.Tab;
const tabId = (t: ChromeTab) => t.id as number;
const asChromeColor = (c: GroupColor) => c as chrome.tabGroups.ColorEnum;

// ---------- What we send to Gemini: a number, a trimmed title and the domain. ----------
function siteOf(url = ""): string {
  try {
    const u = new URL(url);
    if (u.protocol === "http:" || u.protocol === "https:") return u.hostname.replace(/^www\./, "");
    return "browser";
  } catch {
    return "browser";
  }
}
const clip = (s: string | undefined, n: number) => (s || "").replace(/\s+/g, " ").trim().slice(0, n);

function isOrganizable(t: ChromeTab): boolean {
  if (t.pinned) return false;
  const u = t.url || t.pendingUrl || "";
  if (!u || u.startsWith("chrome://newtab") || u === "about:blank") return false;
  return true;
}

export async function getStats(): Promise<{ tabs: number; groups: number }> {
  const [tabs, groups] = await Promise.all([chrome.tabs.query({}), chrome.tabGroups.query({})]);
  return { tabs: tabs.length, groups: groups.length };
}

interface GroupSummary {
  ref: string;
  id: number;
  title: string;
  color: GroupColor;
  sample: string[];
}

async function groupSummaries(windowId: number, tabs: ChromeTab[]): Promise<GroupSummary[]> {
  const groups = await chrome.tabGroups.query({ windowId });
  return groups.map((g, i) => ({
    ref: "G" + (i + 1),
    id: g.id,
    title: g.title || "",
    color: g.color as GroupColor,
    sample: tabs.filter((t) => t.groupId === g.id).slice(0, 5).map((t) => clip(t.title, 60)),
  }));
}

const SYSTEM = `You organize a person's open browser tabs into groups based on what they are working on (project, task, research topic, activity), NOT merely by website.

Rules:
- Group by context and intent. Tabs from different sites that serve the same goal belong together (e.g. a React repo, React docs, a Stack Overflow React question and a React tutorial video -> "React Development").
- Do not create a group per website. Avoid fragmentation: put related tabs together and prefer fewer, meaningful groups.
- Every tab should end up in a group. A group may contain a single tab: if a tab does not fit with any other tab or existing group, give it its own group with a specific name. Never force unrelated tabs together just to avoid a single-tab group.
- Prefer putting tabs into an existing group (reference it by its ref, e.g. "G2") when it fits, instead of creating a near-duplicate. Never rename existing groups: for existing groups set "name" to the existing name.
- New group names: specific, concise (1-3 words, max 24 characters), Title Case, no emojis. Prefer specific names ("Japan Trip Planning") over generic ones ("Misc", "Research").
- Every tab number may appear in at most one group.`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    groups: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          existingGroup: { type: "STRING", nullable: true },
          tabs: { type: "ARRAY", items: { type: "INTEGER" } },
        },
        required: ["name", "tabs"],
      },
    },
  },
  required: ["groups"],
};

interface GeminiGroups {
  groups?: { name?: string; existingGroup?: string | null; tabs?: number[] }[];
}

// ---------- Build a suggestion (does NOT modify any tab) ----------
export async function suggest(): Promise<Plan> {
  const win = await chrome.windows.getCurrent();
  const all = await chrome.tabs.query({ windowId: win.id });
  const candidates = all.filter((t) => t.groupId === -1 && isOrganizable(t)).slice(0, MAX_TABS);
  if (candidates.length < MIN_TABS) {
    throw new AppError("few", "No ungrouped tabs to organize in this window.");
  }
  const existing = await groupSummaries(win.id as number, all);

  const payload = {
    existingGroups: existing.map((g) => ({ ref: g.ref, name: g.title || "(unnamed)", sampleTabs: g.sample })),
    tabs: candidates.map((t, i) => ({ n: i + 1, title: clip(t.title, 120), site: siteOf(t.url) })),
  };
  const out = await callGemini<GeminiGroups>({
    system: SYSTEM,
    prompt: "Organize these tabs:\n" + JSON.stringify(payload),
    schema: SCHEMA,
  });

  const byRef = new Map(existing.map((g) => [g.ref, g]));
  const used = new Set<number>();
  const groups: PlanGroup[] = [];
  const usedColors = new Set<string>(existing.map((g) => g.color));
  const palette = [...COLORS.filter((c) => !usedColors.has(c)), ...COLORS];
  let ci = 0;

  for (const g of Array.isArray(out.groups) ? out.groups : []) {
    const ids: number[] = [];
    for (const n of g.tabs || []) {
      const t = candidates[n - 1];
      if (t && !used.has(tabId(t))) {
        used.add(tabId(t));
        ids.push(tabId(t));
      }
    }
    if (!ids.length) continue;
    const ex = g.existingGroup ? byRef.get(g.existingGroup) : null;
    if (ex) {
      const prev = groups.find((x) => x.existingGroupId === ex.id);
      if (prev) prev.tabIds.push(...ids);
      else groups.push({ key: "g" + groups.length, name: ex.title || "Group", color: ex.color, existingGroupId: ex.id, tabIds: ids, selected: true });
    } else {
      groups.push({ key: "g" + groups.length, name: clip(g.name, 24) || "Group", color: palette[ci++ % palette.length], existingGroupId: null, tabIds: ids, selected: true });
    }
  }

  const info: Record<number, TabInfo> = {};
  for (const t of candidates) info[tabId(t)] = { title: clip(t.title, 120) || t.url || "", site: siteOf(t.url), icon: t.favIconUrl || "" };
  const plan: Plan = {
    windowId: win.id as number,
    groups,
    ungrouped: candidates.filter((t) => !used.has(tabId(t))).map(tabId),
    info,
  };
  await savePendingPlan(plan);
  return plan;
}

export const loadPendingPlan = async (): Promise<Plan | null> =>
  ((await chrome.storage.session.get("pendingPlan")).pendingPlan as Plan | undefined) || null;
export const savePendingPlan = (plan: Plan) => chrome.storage.session.set({ pendingPlan: plan });
export const clearPendingPlan = () => chrome.storage.session.remove("pendingPlan");

// ---------- Apply selected groups ----------
export async function applyPlan(plan: Plan): Promise<{ groups: number; tabs: number }> {
  const live = await chrome.tabs.query({ windowId: plan.windowId });
  const liveById = new Map(live.map((t) => [tabId(t), t]));
  const liveGroups = new Set((await chrome.tabGroups.query({ windowId: plan.windowId })).map((g) => g.id));

  const work: { g: PlanGroup; ids: number[] }[] = [];
  for (const g of plan.groups) {
    if (!g.selected) continue;
    const ids = g.tabIds.filter((id) => liveById.get(id)?.groupId === -1 && !liveById.get(id)?.pinned);
    if (!ids.length) continue;
    work.push({ g, ids });
  }
  if (!work.length) throw new AppError("nothing", "Nothing to apply. Select at least one group.");

  const affected = work.flatMap((w) => w.ids);

  let groupsApplied = 0;
  for (const { g, ids } of work) {
    if (g.existingGroupId && liveGroups.has(g.existingGroupId)) {
      await chrome.tabs.group({ groupId: g.existingGroupId, tabIds: ids });
    } else {
      const gid = await chrome.tabs.group({ tabIds: ids, createProperties: { windowId: plan.windowId } });
      await chrome.tabGroups.update(gid, { title: g.name.trim().slice(0, 40), color: asChromeColor(g.color) });
    }
    groupsApplied++;
  }
  await recordHistory(
    work.map(({ g, ids }): HistoryGroup => ({
      name: g.name.trim().slice(0, 40) || "Group",
      color: g.color,
      existing: !!g.existingGroupId,
      tabs: ids.map((id) => {
        const t = liveById.get(id) as ChromeTab;
        return { url: (t.url || "").slice(0, 500), title: clip(t.title, 120), site: siteOf(t.url) };
      }),
    }))
  );
  await clearPendingPlan();
  return { groups: groupsApplied, tabs: affected.length };
}

// ---------- History (stored locally, capped) ----------
const HISTORY_MAX = 30;

export async function getHistory(): Promise<HistoryEntry[]> {
  return ((await chrome.storage.local.get({ history: [] })).history as HistoryEntry[]) || [];
}

async function recordHistory(groups: HistoryGroup[]) {
  const history = await getHistory();
  history.unshift({ id: String(Date.now()), at: Date.now(), groups });
  await chrome.storage.local.set({ history: history.slice(0, HISTORY_MAX) });
}

export async function deleteHistoryEntry(id: string) {
  await chrome.storage.local.set({ history: (await getHistory()).filter((h) => h.id !== id) });
}
export const clearHistory = () => chrome.storage.local.set({ history: [] });

// Re-create a past grouping from currently open tabs whose URLs match the saved ones.
export async function restoreEntry(id: string): Promise<{ groups: number; tabs: number; reopened: number }> {
  const entry = (await getHistory()).find((h) => h.id === id);
  if (!entry) throw new AppError("gone", "That history entry no longer exists.");
  const win = await chrome.windows.getCurrent();
  const windowId = win.id as number;
  const tabs = await chrome.tabs.query({ windowId });
  const free = tabs.filter((t) => t.groupId === -1 && !t.pinned);
  const liveGroups: { id: number; title?: string }[] = await chrome.tabGroups.query({ windowId });
  let reopened = 0;
  let groups = 0;
  let moved = 0;

  for (const g of entry.groups) {
    const ids: number[] = [];
    for (const saved of g.tabs) {
      const i = free.findIndex((t) => (t.url || "") === saved.url);
      if (i >= 0) {
        const t = free.splice(i, 1)[0];
        ids.push(tabId(t));
      } else if (saved.url) {
        // Tab isn't open any more: reopen it in the background.
        try {
          const t = await chrome.tabs.create({ windowId, url: saved.url, active: false });
          reopened++;
          ids.push(tabId(t));
        } catch {
          /* skip tabs that can't be reopened */
        }
      }
    }
    if (!ids.length) continue;
    const existing = liveGroups.find((x) => x.title === g.name);
    if (existing) await chrome.tabs.group({ groupId: existing.id, tabIds: ids });
    else {
      const gid = await chrome.tabs.group({ tabIds: ids, createProperties: { windowId } });
      await chrome.tabGroups.update(gid, { title: g.name, color: asChromeColor(g.color) });
      liveGroups.push({ id: gid, title: g.name });
    }
    groups++;
    moved += ids.length;
  }
  if (!groups) throw new AppError("nothing", "Couldn't restore any tabs from that entry.");
  return { groups, tabs: moved, reopened };
}
