import { Composio } from "@composio/core";

// Server-only Composio helper. Never import this from a "use client" file —
// the COMPOSIO_API_KEY must stay on the server.

let cachedClient: Composio | null = null;

export function getComposio(): Composio {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    throw new Error("COMPOSIO_API_KEY is not set in the server environment.");
  }
  cachedClient = new Composio({ apiKey });
  return cachedClient;
}

// Maps the in-app ToolKey to the Composio toolkit slug for that integration.
// These slugs must match auth configs that have been created in the
// Composio dashboard with the correct OAuth scopes.
export const TOOLKIT_SLUGS = {
  gmail: "gmail",
  drive: "googledrive",
  docs: "googledocs",
  sheets: "googlesheets",
  calendar: "googlecalendar",
} as const;

export type ToolKey = keyof typeof TOOLKIT_SLUGS;
export const TOOL_KEYS = Object.keys(TOOLKIT_SLUGS) as ToolKey[];

export function isToolKey(value: string): value is ToolKey {
  return value in TOOLKIT_SLUGS;
}

// Single shared entity for the Pleasure Pizza demo. In production this
// would be the authenticated business owner (per-user connection scope).
export const DEMO_ENTITY_ID = "pleasure-pizza-owner";
