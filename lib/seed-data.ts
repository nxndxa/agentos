export type ToolKey = "gmail" | "drive" | "docs" | "sheets" | "calendar";

export type SeedEntity = {
  id: string;
  kind: string;
  label: string;
  meta?: string;
};

// Stagnant (seed) data for Pleasure Pizza — local pizza shop next to campus.
// Each entry is what a freshly connected account would expose in the graph.
export const seedData: Record<ToolKey, SeedEntity[]> = {
  gmail: [
    { id: "theta-chi-catering", kind: "Email", label: "Theta Chi — Friday catering", meta: "Unread · 2h ago" },
    { id: "marco-cheese", kind: "Email", label: "Marco's Cheese — weekly invoice", meta: "Auto-sent Mon" },
    { id: "mom-feedback", kind: "Email", label: "Mom — feedback on new menu item", meta: "3d ago" },
    { id: "delivery-roster", kind: "Email", label: "Delivery driver roster", meta: "From Aisha" },
    { id: "health-inspector", kind: "Email", label: "Health inspector follow-up", meta: "Awaiting reply" },
  ],
  drive: [
    { id: "menu-v7", kind: "PDF", label: "Pleasure Pizza Menu v7.pdf", meta: "Updated yesterday" },
    { id: "supplier-list", kind: "Document", label: "Supplier list — Q4", meta: "Owned by Aisha" },
    { id: "marketing-flyer", kind: "PDF", label: "Finals week flyer", meta: "Shared with team" },
    { id: "dough-recipe", kind: "PDF", label: "Pizza dough recipe (master)", meta: "Last edited Sep" },
    { id: "allergen-sheet", kind: "Document", label: "Allergen info sheet", meta: "Posted on counter" },
  ],
  docs: [
    { id: "new-hire-training", kind: "Doc", label: "New hire training", meta: "12 sections" },
    { id: "opening-checklist", kind: "Doc", label: "Opening checklist", meta: "Used daily" },
    { id: "closing-checklist", kind: "Doc", label: "Closing checklist", meta: "Used daily" },
    { id: "pizza-station-sop", kind: "Doc", label: "Pizza station SOP", meta: "v3.2" },
    { id: "cash-handling", kind: "Doc", label: "Cash handling guide", meta: "Reviewed Sep" },
  ],
  sheets: [
    { id: "inventory-oct", kind: "Sheet", label: "Inventory tracker — Oct", meta: "Auto-updating" },
    { id: "weekly-sales", kind: "Sheet", label: "Weekly sales", meta: "52 weeks" },
    { id: "staff-schedule", kind: "Sheet", label: "Staff schedule — Oct", meta: "Owned by Marco" },
    { id: "top-sellers", kind: "Sheet", label: "Top sellers by week", meta: "Live" },
    { id: "catering-orders", kind: "Sheet", label: "Catering orders", meta: "Q4" },
  ],
  calendar: [
    { id: "shift-marco", kind: "Event", label: "Marco — opening shift", meta: "Mon · 10:00" },
    { id: "dough-delivery", kind: "Event", label: "Dough delivery", meta: "Wed · 06:00" },
    { id: "theta-chi-pickup", kind: "Event", label: "Theta Chi — pickup", meta: "Fri · 19:30" },
    { id: "health-inspection", kind: "Event", label: "Health inspection", meta: "Oct 22 · 11:00" },
    { id: "staff-meeting", kind: "Event", label: "Weekly staff meeting", meta: "Sun · 17:00" },
  ],
};
