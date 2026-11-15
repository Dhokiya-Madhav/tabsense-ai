import { ChevronRight, HistoryIcon, SparkleIcon } from "./Icons";

interface Props {
  tabs: number | string;
  groups: number | string;
  onOrganize: () => void;
  onHistory: () => void;
}

export function Home({ tabs, groups, onOrganize, onHistory }: Props) {
  return (
    <section className="view">
      <div className="hero">
        <p className="hero-title">
          Your browser,
          <br />
          finally tidy.
        </p>
        <div className="stats">
          <div className="stat">
            <b>{tabs}</b>
            <span>Open tabs</span>
          </div>
          <div className="stat">
            <b>{groups}</b>
            <span>Tab groups</span>
          </div>
        </div>
      </div>

      <button className="primary" onClick={onOrganize}>
        <SparkleIcon size={17} />
        Organize with AI
      </button>

      <button className="navrow" onClick={onHistory}>
        <span className="navicon">
          <HistoryIcon size={16} />
        </span>
        <span className="navtext">
          History<small>Restore a past grouping</small>
        </span>
        <ChevronRight className="chev-r" size={16} />
      </button>

      <p className="eyebrow spaced">How it works</p>
      <ol className="steps">
        <li><i>1</i><b>Read</b><span>AI scans your tab titles</span></li>
        <li><i>2</i><b>Review</b><span>Tweak the suggested groups</span></li>
        <li><i>3</i><b>Apply</b><span>See them in Chrome's tab bar</span></li>
      </ol>
    </section>
  );
}
