// Builds the options passed to openComposer() for reply / reply all / forward.

import { uniqueEmails } from "./recipients";

export function buildReply(message) {
  return {
    to: message.sender,
    subject: `Re: ${message.subject || ""}`,
  };
}

export function buildReplyAll(message, selfEmail = "") {
  const self = selfEmail.toLowerCase();

  const to = uniqueEmails([
    message.sender,
    ...(Array.isArray(message.recipients) ? message.recipients : []),
  ]).filter((address) => address !== self);

  const cc = uniqueEmails(
    Array.isArray(message.cc) ? message.cc : []
  ).filter((address) => address !== self);

  return {
    to,
    cc,
    subject: `Re: ${message.subject || ""}`,
  };
}

export function buildForward(message) {
  return {
    to: message.sender,
    subject: `Fwd: ${message.subject || ""}`,
    body: `\n\n---------- Forwarded message ----------\nFrom: ${
      message.sender || ""
    }\nSubject: ${message.subject || "(No subject)"}\n\n${
      message.bodyText || message.body_text || ""
    }`,
  };
}
