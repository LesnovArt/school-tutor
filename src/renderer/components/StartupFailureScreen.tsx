type Props = { title: string; message: string; hint: string };

export function StartupFailureScreen({ title, message, hint }: Props): React.JSX.Element {
  return (
    <main className="page">
      <section className="card" role="alert">
        <h1>{title}</h1>
        <p>{message}</p>
        <p>{hint}</p>
      </section>
    </main>
  );
}
