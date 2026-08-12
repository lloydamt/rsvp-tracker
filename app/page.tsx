export default function Home() {
  const informationUrl = process.env.CEREMONY_RECEPTION_INFO_URL;

  if (!informationUrl) {
    throw new Error("CEREMONY_RECEPTION_INFO_URL is missing.");
  }

  return (
    <main className="centered homePage">
      <section className="card hero welcomeHero">
        <div className="heroOrnament" aria-hidden="true">
          <span />
          <i>◇</i>
          <span />
        </div>
        <h1 className="coupleNames" aria-label="Tadiwa and Adawari">
          <span>Tadiwa</span>
          <span className="ampersand">&amp;</span>
          <span>Adawari</span>
        </h1>
        <div className="saveTheDate">
          <span className="dateRule" aria-hidden="true" />
          <p>
            <span>Save the date</span>
            <time dateTime="2026-10-24">October 24th, 2026</time>
          </p>
          <span className="dateRule" aria-hidden="true" />
        </div>
        <p className="welcomeMessage">We’re so happy you’re here and can’t wait to celebrate with you.</p>
        <a className="moreInfoLink homeInfoLink" href={informationUrl} target="_blank" rel="noopener noreferrer">
          <span>Discover the celebration</span>
          <span className="linkArrow" aria-hidden="true">↗</span>
        </a>
      </section>
    </main>
  );
}
