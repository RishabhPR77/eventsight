import { useEffect } from "react";
import MarketingLayout from "@/components/layout/MarketingLayout";

const LAST_UPDATED = "1 November 2026";
const CONTACT = "Reply to any email from SponsorWise and we'll get back to you.";

const DOCUMENTS = {
  privacy: {
    title: "Privacy Policy",
    intro: "This page explains what SponsorWise collects, why, and who else handles it.",
    sections: [
      {
        heading: "What we collect",
        items: [
          "Account details: your username, email address, role and password. Passwords are stored only as a secure hash, so nobody can read them.",
          "Brand profiles: brand name, logo, description, goals and target cities.",
          "Events: names, dates, cities, budgets, audience details, social accounts and images.",
          "Deals: offers, counter-offers, confirmations, cancellation reasons and ratings.",
          "Messages: chat messages and any files you attach to them.",
        ],
      },
      {
        heading: "How we use it",
        items: [
          "To run your account and show your events, offers and messages to the people involved.",
          "To produce AI analysis of how well an event fits a brand.",
          "To send verification codes, password resets and deal alerts. You can turn alerts off in Settings.",
        ],
      },
      {
        heading: "What other users can see",
        items: [
          "Published events are visible to signed-in sponsors.",
          "Organizers see your brand profile and offers when you apply to their event.",
          "Chats are visible only to the organizer and sponsor in that conversation.",
          "Sponsor ratings of organizers feed into the scores other sponsors see.",
        ],
      },
      {
        heading: "Services that handle your data",
        items: [
          "Vercel serves the website, and Render runs the servers.",
          "MongoDB Atlas stores the database.",
          "Cloudinary stores images and chat attachments.",
          "Brevo sends email, so it receives your email address and the message.",
          "Groq runs the AI analysis, so it receives brand and event details. It doesn't receive your password or chats.",
        ],
      },
      {
        heading: "Cookies and browser storage",
        items: [
          "We use cookies only to keep you signed in, and a small browser note so the site opens faster.",
          "We don't use advertising or analytics cookies.",
        ],
      },
      {
        heading: "Keeping and deleting data",
        items: [
          "You can delete your account in Settings once your accepted sponsorships are finished or cancelled.",
          "Deleting your account removes your login, and hides your brand profile and events.",
          "Feedback and finished deals are kept, because other users' scores and history depend on them. Messages you sent stay with the person you sent them to.",
          "Saved AI analyses are removed automatically after 7 days.",
        ],
      },
      { heading: "Questions or requests", body: `To ask what we hold about you, or to have it corrected or removed: ${CONTACT}` },
    ],
  },
  terms: {
    title: "Terms of Use",
    intro: "By using SponsorWise you agree to these terms. They're written to be read, so please do.",
    sections: [
      {
        heading: "What SponsorWise does",
        body: "SponsorWise helps event organizers and brand sponsors find each other, agree deals and judge the fit using AI. We aren't a party to any deal you make here.",
      },
      {
        heading: "Your account",
        items: [
          "Give accurate details and keep your password private.",
          "You're responsible for what happens under your account.",
        ],
      },
      {
        heading: "Deals and payments",
        items: [
          "SponsorWise doesn't handle money. Organizers and sponsors arrange payment and any contract directly with each other.",
          "An accepted offer is an agreement between the two of you. We don't check that either side keeps it.",
        ],
      },
      {
        heading: "Cancelling and confirming",
        items: [
          "Either side can cancel an accepted sponsorship, with a reason, until both sides have confirmed it.",
          "After the event, both sides confirm that it happened. Feedback opens once they have.",
          "If one side confirms and the other doesn't reply within 7 days, the sponsorship is confirmed automatically.",
          "If neither side confirms within 30 days of the event, the sponsorship is closed.",
        ],
      },
      {
        heading: "AI analysis",
        body: "Predictions of turnout, fit and deal chances are estimates. They can be wrong, and they're no guarantee of any result, so check for yourself before spending money.",
      },
      {
        heading: "Fair use",
        items: [
          "Don't publish fake events, make offers you don't intend to honour, or send spam or abuse.",
          "Don't try to break, overload or get around the security of the service.",
          "We may remove content or accounts that break these rules.",
        ],
      },
      {
        heading: "Your content",
        body: "What you upload stays yours. You let us store and show it as needed to run SponsorWise, and you confirm you have the right to share it.",
      },
      {
        heading: "Availability and liability",
        body: "SponsorWise is provided as it is, and it may be slow, unavailable, changed or stopped at any time. As far as the law allows, we aren't liable for lost money, failed deals or other losses from using it.",
      },
      { heading: "Changes and contact", body: `If these terms change, we'll update the date on this page. ${CONTACT}` },
    ],
  },
};

export default function LegalPage({ document: name }) {
  const { title, intro, sections } = DOCUMENTS[name];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [name]);

  return (
    <MarketingLayout signUpTo="/">
      <article className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
        <h1 className="text-4xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-ink-faint">Last updated {LAST_UPDATED}</p>
        <p className="mt-5 text-lg text-ink-soft">{intro}</p>

        {sections.map((section) => (
          <section key={section.heading} className="mt-8">
            <h2 className="text-xl font-bold">{section.heading}</h2>
            {section.body ? <p className="mt-2 text-ink-soft">{section.body}</p> : null}
            {section.items ? (
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink-soft">
                {section.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            ) : null}
          </section>
        ))}
      </article>
    </MarketingLayout>
  );
}
