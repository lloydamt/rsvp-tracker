export default function Home() {
  return (
    <main className="centered">
      <section className="card hero welcomeHero">
        <p className="eyebrow">Welcome</p>
        <h1 className="coupleNames">Tadiwa &amp; Adawari</h1>
        <p className="welcomeMessage">We’re so happy you’re here and can’t wait to celebrate with you.</p>
        <a className="moreInfoLink" href="https://www.google.com" target="_blank" rel="noopener noreferrer">
          Click here for more info <span aria-hidden="true">↗</span>
        </a>
      </section>
    </main>
  );
}
