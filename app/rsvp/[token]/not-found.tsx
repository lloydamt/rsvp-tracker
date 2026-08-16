import Link from "next/link";

export default function RsvpNotFound() {
  return (
    <main className="centered">
      <section className="card rsvpCard">
        <div className="rsvpIntro">
          <p className="eyebrow">RSVP</p>
          <h1>Code not found</h1>
          <p>That RSVP code is invalid or no longer available.</p>
        </div>
        <footer className="rsvpFooter">
          <Link className="moreInfoLink" href="/rsvp">Try another code <span aria-hidden="true">↗</span></Link>
        </footer>
      </section>
    </main>
  );
}
