import { useEffect, useMemo, useState } from "react";
import { clearHistory, deleteHistoryEntry, getHistory } from "../lib/tabs";
import type { HistoryEntry } from "../types";
import { EmptyState } from "./EmptyState";
import { EntryMenu } from "./EntryMenu";
import { SearchIcon } from "./Icons";

interface Props {
  onBack: () => void;
  onRestore: (id: string) => void;
}

export function History({ onBack, onRestore }: Props) {
  const [all, setAll] = useState<HistoryEntry[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getHistory().then(setAll);
  }, []);

  const q = query.trim().toLowerCase();
  const list = useMemo(
    () =>
      !q
        ? all
        : all.filter((e) =>
            e.groups.some((g) => g.name.toLowerCase().includes(q) || g.tabs.some((t) => (t.title || "").toLowerCase().includes(q) || (t.site || "").toLowerCase().includes(q)))
          ),
    [all, q]
  );

  const remove = async (id: string) => {
    await deleteHistoryEntry(id);
    setAll((a) => a.filter((x) => x.id !== id));
  };
  const clearAll = async () => {
    await clearHistory();
    setAll([]);
  };

  return (
    <section className="view">
      <div className="preview-head">
        <h2>History</h2>
        <span>{all.length ? `${all.length} saved` : ""}</span>
      </div>

      {all.length >= 2 && (
        <label className="search">
          <SearchIcon size={15} />
          <input type="search" placeholder="Search groups or tabs…" autoComplete="off" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      )}

      <div className="groups">
        {!all.length && <EmptyState icon="🗂️" title="No history yet" text="Organized sessions will show up here so you can restore them later." />}
        {all.length > 0 && !list.length && <EmptyState icon="🔍" title="No matches" text={`Nothing in history matches "${query.trim()}".`} />}
        {list.map((e) => {
          const n = e.groups.reduce((a, g) => a + g.tabs.length, 0);
          const d = new Date(e.at);
          return (
            <div className="hist" key={e.id}>
              <div className="hist-top">
                <div className="tt">
                  <b>
                    {d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                  </b>
                  <span>{e.groups.length} group{e.groups.length === 1 ? "" : "s"} · {n} tabs</span>
                </div>
                <EntryMenu onRestore={() => onRestore(e.id)} onDelete={() => remove(e.id)} />
              </div>
              <div className="hist-groups">
                {e.groups.map((g, i) => (
                  <span key={i} className={`chip c-${g.color}`} title={g.tabs.map((t) => t.title).join("\n")}>
                    <i />
                    {g.name} ({g.tabs.length})
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="actions">
        <button className="ghost" onClick={onBack}>Back</button>
        {all.length > 0 && <button className="ghost danger" onClick={clearAll}>Clear history</button>}
      </div>
    </section>
  );
}
