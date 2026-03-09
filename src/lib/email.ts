type AuthEmailOptions = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  previewUrl?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHtmlFromText(text: string) {
  const paragraphs = escapeHtml(text)
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("");

  return `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;color:#111827;">${paragraphs}</div>`;
}

export async function sendAuthEmail(options: AuthEmailOptions) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Auth email falling back to log mode because RESEND_API_KEY or EMAIL_FROM is missing.");
      console.log(`AUTH EMAIL to ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(options.text);
      if (options.previewUrl) {
        console.log(`Preview URL: ${options.previewUrl}`);
      }
      return { mode: "log", previewUrl: options.previewUrl ?? null };
    }

    console.warn("Auth email requested but no email transport is configured.");
    return { mode: "noop", previewUrl: null };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [options.to],
      subject: options.subject,
      text: options.text,
      html: options.html ?? renderHtmlFromText(options.text),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Resend email send failed:", errorText);
    throw new Error(`Failed to send auth email via Resend (${response.status}).`);
  }

  const payload = (await response.json()) as { id?: string };

  if (process.env.NODE_ENV !== "production") {
    console.log(`AUTH EMAIL to ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(options.text);
    if (options.previewUrl) {
      console.log(`Preview URL: ${options.previewUrl}`);
    }
    console.log(`Resend message id: ${payload.id ?? "unknown"}`);
  }

  return {
    mode: "resend",
    previewUrl: options.previewUrl ?? null,
    messageId: payload.id ?? null,
  };
}
