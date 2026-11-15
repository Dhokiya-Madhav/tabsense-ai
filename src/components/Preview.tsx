import { useState } from "react";
import { ALL_COLORS } from "../lib/tabs";
import { ChevronRight, X } from "./Icons";
import type { Plan, PlanGroup, TabInfo } from "../types";

const UNGROUPED = "_u";

interface Props {
  plan: Plan;
  setPlan: (update: (p: Plan) => Plan) => void;
  applying: boolean;
  onApply: () => void;
  onDiscard: () => void;
}

export function Preview({ plan, setPlan, applying, onApply, onDiscard }: Props) {
  const selected = plan.groups.filter((g) => g.selected);
  const n = selected.reduce((a, g) => a + g.tabIds.length, 0);
  const allSelected = selected.length === plan.groups.length;

  const patchGroup = (key: string, patch: Partial<PlanGroup>) =>
    setPlan((p) => ({ ...p, groups: p.groups.map((g) => (g.key === key ? { ...g, ...patch } : g)) }));

  const toggleAll = () =>
    setPlan((p) => {
      const all = p.groups.every((g) => g.selected);
      return { ...p, groups: p.groups.map((g) => ({ ...g, selected: !all })) };
    });

  const moveTab = (id: number, from: string, to: string) => {
    if (!to || to === from) return;
    setPlan((p) => {
      let ungrouped = p.ungrouped;
      let groups = p.groups;
      if (from === UNGROUPED) ungrouped = ungrouped.filter((x) => x !== id);
      else groups = groups.map((g) => (g.key === from ? { ...g, tabIds: g.tabIds.filter((x) => x !== id) } : g));
      if (to === UNGROUPED) ungrouped = [...ungrouped, id];
      else groups = groups.map((g) => (g.key === to ? { ...g, tabIds: [...g.tabIds, id] } : g));
      // A group left with no tabs disappears; single-tab groups are fine.
      groups = groups.filter((g) => g.tabIds.length);
      return { ...p, groups, ungrouped };
    });
  };

  const count = plan.groups.length;
  return (
    <section className="view">
      <div className="preview-head">
        <h2>{count ? `${count} group${count > 1 ? "s" : ""} suggested` : "No clear groups found"}</h2>
        {count > 0 && (
          <button className="link" type="button" onClick={toggleAll}>
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        )}
      </div>

      <div className="groups">
        {plan.groups.map((g) => (
          <GroupCard key={g.key} group={g} plan={plan} onPatch={(patch) => patchGroup(g.key, patch)} onMove={moveTab} />
        ))}
        {plan.ungrouped.length > 0 && <UngroupedCard plan={plan} onMove={moveTab} />}
      </div>

      <div className="actions">
        <button className="ghost" onClick={onDiscard}>Discard</button>
        <button className="primary small" onClick={onApply} disabled={!n || applying}>
          {n ? `Apply ${selected.length} group${selected.length > 1 ? "s" : ""} (${n} tabs)` : "Apply"}
        </button>
      </div>
    </section>
  );
}

type MoveFn = (id: number, from: string, to: string) => void;

function Fav({ info }: { info: TabInfo }) {
  return info.icon ? (
    <img className="fav" src={info.icon} alt="" onError={(e) => e.currentTarget.removeAttribute("src")} />
  ) : (
    <span className="fav" />
  );
}

function TabRow({ id, currentKey, plan, onMove }: { id: number; currentKey: string; plan: Plan; onMove: MoveFn }) {
  const info: TabInfo = plan.info[id] || { title: "(closed tab)", site: "", icon: "" };
  return (
    <div className="tab">
      <Fav info={info} />
      <div className="tt">
        <b title={info.title}>{info.title}</b>
        <span>{info.site}</span>
      </div>
      <select title="Move to…" value="" onChange={(e) => onMove(id, currentKey, e.target.value)}>
        <option value="">Move to…</option>
        {plan.groups.filter((g) => g.key !== currentKey).map((g) => (
          <option key={g.key} value={g.key}>{g.name || "Group"}</option>
        ))}
        {currentKey !== UNGROUPED && <option value={UNGROUPED}>Ungrouped</option>}
      </select>
      {currentKey !== UNGROUPED && (
        <button className="x" title="Remove from group" onClick={() => onMove(id, currentKey, UNGROUPED)}><X size={14} /></button>
      )}
    </div>
  );
}

function GroupCard({ group: g, plan, onPatch, onMove }: { group: PlanGroup; plan: Plan; onPatch: (p: Partial<PlanGroup>) => void; onMove: MoveFn }) {
  const [open, setOpen] = useState(false);
  const existing = !!g.existingGroupId;
  const cycleColor = () => onPatch({ color: ALL_COLORS[(ALL_COLORS.indexOf(g.color) + 1) % ALL_COLORS.length] });

  return (
    <div className={`card c-${g.color}${g.selected ? "" : " off"}${open ? " open" : ""}`}>
      <div
        className="card-head"
        onClick={(e) => {
          const el = e.target as HTMLElement;
          if (e.target === e.currentTarget || el.classList.contains("badge")) setOpen((o) => !o);
        }}
      >
        <input type="checkbox" checked={g.selected} title="Include this group" onChange={(e) => onPatch({ selected: e.target.checked })} />
        <button className="dot" disabled={existing} title={existing ? "Existing group color" : "Click to change color"} onClick={cycleColor} />
        <input
          className="name"
          value={g.name}
          maxLength={40}
          disabled={existing}
          title={existing ? "Existing group (not renamed)" : "Rename"}
          onChange={(e) => onPatch({ name: e.target.value })}
        />
        {existing && <span className="badge">existing</span>}
        <span className="badge">{g.tabIds.length} tab{g.tabIds.length === 1 ? "" : "s"}</span>
        <button className="chev" title="Show tabs" onClick={() => setOpen((o) => !o)}><ChevronRight size={16} /></button>
      </div>
      <div className="tabs">
        {g.tabIds.map((id) => (
          <TabRow key={id} id={id} currentKey={g.key} plan={plan} onMove={onMove} />
        ))}
      </div>
    </div>
  );
}

function UngroupedCard({ plan, onMove }: { plan: Plan; onMove: MoveFn }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`card c-grey${open ? " open" : ""}`}>
      <div className="card-head">
        <span className="dot" />
        <span className="name" style={{ fontWeight: 600 }}>Left ungrouped</span>
        <span className="badge">{plan.ungrouped.length}</span>
        <button className="chev" title="Show tabs" onClick={() => setOpen((o) => !o)}><ChevronRight size={16} /></button>
      </div>
      <div className="tabs">
        {plan.ungrouped.map((id) => (
          <TabRow key={id} id={id} currentKey={UNGROUPED} plan={plan} onMove={onMove} />
        ))}
      </div>
    </div>
  );
}
