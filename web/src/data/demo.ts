export type SourceKind = "drive" | "gmail" | "calendar";

export type SourceState =
  | "detected"
  | "authenticating"
  | "syncing"
  | "connected"
  | "indexed";

export type EntityKind = "customer" | "person" | "document" | "email" | "meeting";

export type Permission = "read" | "write" | "execute";

export interface SourceDef {
  kind: SourceKind;
  label: string;
  vendor: string;
  provides: EntityKind[];
}

export const SOURCE_DEFS: SourceDef[] = [
  { kind: "drive", label: "Google Drive", vendor: "google.com", provides: ["document"] },
  { kind: "gmail", label: "Gmail", vendor: "google.com", provides: ["customer", "person", "email"] },
  { kind: "calendar", label: "Google Calendar", vendor: "google.com", provides: ["meeting"] },
];

export interface EntityDef {
  id: string;
  label: string;
  kind: EntityKind;
  from: SourceKind;
}

/** Deterministic fixture company, per the PRD's demo-company section. */
export const ENTITIES: EntityDef[] = [
  { id: "acme", label: "Acme Corp", kind: "customer", from: "gmail" },
  { id: "globex", label: "Globex", kind: "customer", from: "gmail" },
  { id: "wayne", label: "Wayne Logistics", kind: "customer", from: "gmail" },

  { id: "sarah", label: "Sarah", kind: "person", from: "gmail" },
  { id: "david", label: "David", kind: "person", from: "gmail" },
  { id: "mike", label: "Mike", kind: "person", from: "gmail" },

  { id: "email-184", label: "Re: revised pricing", kind: "email", from: "gmail" },
  { id: "email-onboard", label: "Onboarding call", kind: "email", from: "gmail" },

  { id: "acme-proposal", label: "Acme Proposal", kind: "document", from: "drive" },
  { id: "acme-contract", label: "Acme Contract", kind: "document", from: "drive" },
  { id: "pricing-v3", label: "pricing-v3.pdf", kind: "document", from: "drive" },
  { id: "globex-notes", label: "Globex Notes", kind: "document", from: "drive" },
  { id: "wayne-pricing", label: "Wayne Pricing", kind: "document", from: "drive" },

  { id: "mtg-onboard", label: "Acme onboarding", kind: "meeting", from: "calendar" },
  { id: "mtg-globex", label: "Globex review", kind: "meeting", from: "calendar" },
];

/** Business-graph relationships revealed once a source is indexed. */
export const RELATIONS: Array<[string, string, string]> = [
  ["sarah", "acme", "OWNS"],
  ["email-184", "acme", "MENTIONS"],
  ["pricing-v3", "acme", "MENTIONS"],
  ["mtg-onboard", "acme", "DISCUSSED"],
  ["acme-proposal", "acme", "MENTIONS"],
  ["david", "globex", "OWNS"],
  ["globex-notes", "globex", "MENTIONS"],
  ["mtg-globex", "globex", "DISCUSSED"],
  ["mike", "wayne", "OWNS"],
  ["wayne-pricing", "wayne", "MENTIONS"],
];

export interface CommandDef {
  name: string;
  description: string;
  permission: Permission;
  from: SourceKind | "core" | "generated";
}

export const CORE_COMMANDS: CommandDef[] = [
  { name: "ask", description: "Grounded natural-language query over the graph", permission: "read", from: "core" },
  { name: "customer.list", description: "List resolved customers", permission: "read", from: "core" },
  { name: "customer.get", description: "Retrieve complete customer context", permission: "read", from: "core" },
  { name: "audit", description: "Show the operation audit log", permission: "read", from: "core" },
];

export const SOURCE_COMMANDS: Record<SourceKind, CommandDef[]> = {
  drive: [
    { name: "docs.search", description: "Search indexed documents", permission: "read", from: "drive" },
    { name: "docs.get", description: "Fetch a document by id", permission: "read", from: "drive" },
  ],
  gmail: [
    { name: "email.search", description: "Search mail threads", permission: "read", from: "gmail" },
    { name: "email.thread", description: "Read a full thread", permission: "read", from: "gmail" },
    { name: "email.draft", description: "Create a draft from graph context", permission: "write", from: "gmail" },
    { name: "email.send", description: "Send a draft", permission: "execute", from: "gmail" },
  ],
  calendar: [
    { name: "meeting.list", description: "List upcoming meetings", permission: "read", from: "calendar" },
    { name: "meeting.prepare", description: "Assemble context for a meeting", permission: "read", from: "calendar" },
    { name: "meeting.schedule", description: "Create a calendar event", permission: "execute", from: "calendar" },
  ],
};

export const GENERATED_COMMANDS: CommandDef[] = [
  { name: "driver.list", description: "List delivery drivers", permission: "read", from: "generated" },
  { name: "driver.get", description: "Fetch a driver by id", permission: "read", from: "generated" },
  { name: "driver.scorecard", description: "Fetch a driver scorecard", permission: "read", from: "generated" },
  { name: "route.get", description: "Fetch a delivery route", permission: "read", from: "generated" },
  { name: "message.send", description: "Send a message to a driver", permission: "execute", from: "generated" },
];

export const CONNECTOR_SPEC = {
  path: "./delivery-api.yaml",
  endpoints: 12,
  resources: "drivers, routes, scorecards, messages",
};

export interface AnswerSource {
  kind: string;
  ref: string;
}

export interface Answer {
  title: string;
  points: string[];
  sources: AnswerSource[];
}

export const ACME_WEEK_ANSWER: Answer = {
  title: "Acme had 3 important updates this week",
  points: [
    "Sarah requested an updated pricing proposal by email on Tuesday.",
    "pricing-v3.pdf was uploaded to Drive yesterday at 4:12pm.",
    "Your onboarding call is scheduled for Monday at 2:00pm.",
  ],
  sources: [
    { kind: "Gmail", ref: "#184" },
    { kind: "Drive", ref: "pricing-v3.pdf" },
    { kind: "Calendar", ref: "onboarding" },
  ],
};

export const CUSTOMERS_ANSWER: Answer = {
  title: "3 customers resolved across connected sources",
  points: [
    "Acme Corp — owned by Sarah, 5 linked artifacts, active this week.",
    "Globex — owned by David, quarterly review scheduled.",
    "Wayne Logistics — owned by Mike, pricing sheet on file.",
  ],
  sources: [
    { kind: "Gmail", ref: "org resolution" },
    { kind: "Graph", ref: "customer nodes" },
  ],
};

export function fallbackAnswer(entityCount: number, sourceCount: number): Answer {
  return {
    title: `Grounded in ${entityCount} entities across ${sourceCount} connected sources`,
    points: [
      "I resolve the entities in your question, traverse their relationships in the business graph, then retrieve the original sources.",
      "Try a question about a known entity — for example, what happened with Acme this week.",
    ],
    sources: [{ kind: "Graph", ref: `${entityCount} entities` }],
  };
}

export interface Draft {
  to: string;
  subject: string;
  body: string;
}

export const ACME_DRAFT: Draft = {
  to: "sarah@acme.com",
  subject: "Updated pricing proposal",
  body: `Hi Sarah,

Following up with the revised pricing proposal you asked for on Tuesday. pricing-v3.pdf reflects the adjusted seat tiers and the annual billing option we discussed.

Happy to walk through the changes before Monday's call — let me know what time works.

Best,
Ani`,
};

export const SCORECARD_OUTPUT = `driver      john
period      last 7 days
score       78 / 100   (-12% vs prior week)
on-time     91%
complaints  0
flag        delivery quality trending down`;

export const DRIVER_LIST_OUTPUT = `john    score 78   on-time 91%   flag: quality down
maria   score 84   on-time 96%   3 customer complaints
kevin   score 71   on-time 88%   attendance issue yesterday`;
