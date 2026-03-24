import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support — Marks",
  description: "Get help with the Marks bookmark manager.",
};

export default function SupportPage() {
  return (
    <div className="container" style={{ maxWidth: 640, padding: "40px 20px" }}>
      <h1>Marks — Support</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 32 }}>
        Need help? We&apos;re here to assist you.
      </p>

      <h2>Contact Us</h2>
      <p>
        For any questions, issues, or feedback, email us at{" "}
        <a href="mailto:support@getmarks.sh">support@getmarks.sh</a>. We
        typically respond within 24 hours.
      </p>

      <h2>Common Questions</h2>

      <h3>How do I save a bookmark?</h3>
      <p>
        On the web, use the browser extension or the bookmarklet. On iOS, use
        the share extension — tap the share button in Safari or any app and
        select Marks.
      </p>

      <h3>How does sync work?</h3>
      <p>
        Bookmarks sync automatically between the web app and the iOS app via
        your Marks account. Pull to refresh on iOS to trigger a manual sync.
      </p>

      <h3>Can I export my data?</h3>
      <p>
        Yes. Go to <Link href="/settings">Settings</Link> on the web app to
        export your bookmarks as JSON.
      </p>

      <h3>How do I delete my account?</h3>
      <p>
        You can delete your account directly in the iOS app. Go to the{" "}
        <strong>Settings</strong> tab and tap <strong>Delete Account</strong>.
        This will permanently delete your account and all associated data. You
        can also email{" "}
        <a href="mailto:support@getmarks.sh">support@getmarks.sh</a> to request
        account deletion.
      </p>

      <h2>Report a Bug</h2>
      <p>
        Email us at{" "}
        <a href="mailto:support@getmarks.sh">support@getmarks.sh</a> or open an
        issue on{" "}
        <a
          href="https://github.com/crxnamja/marks/issues"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        .
      </p>
    </div>
  );
}
