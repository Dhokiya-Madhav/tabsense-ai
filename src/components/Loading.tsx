export function Loading({ text }: { text: string }) {
  return (
    <section className="view">
      <div className="loader">
        <div className="orb">
          <span />
          <span />
          <span />
        </div>
        <p>{text}</p>
        <small>This usually takes a few seconds</small>
      </div>
    </section>
  );
}
