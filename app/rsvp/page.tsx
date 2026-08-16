import { CodeEntryForm } from "./code-entry-form";

export const dynamic = "force-dynamic";

export default function RsvpCodePage() {
  return (
    <main className="centered">
      <section className="card rsvpCard">
        <div className="rsvpIntro">
          <p className="eyebrow">RSVP</p>
          <h1>Enter your code</h1>
          <div className="saveTheDate rsvpDate">
            <span className="dateRule" aria-hidden="true" />
            <p>
              <span>Save the date</span>
              <time dateTime="2026-10-24">October 24th, 2026</time>
            </p>
            <span className="dateRule" aria-hidden="true" />
          </div>
          <p>Enter the 4-character code from your invitation text to continue.</p>
        </div>
        <CodeEntryForm />
      </section>
    </main>
  );
}
