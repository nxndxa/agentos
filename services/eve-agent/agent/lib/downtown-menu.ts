// Published Downtown ordering-menu snapshot, checked 2026-09-12.
// This is not live stock, a quote, or an allergen-safety guarantee.
export const downtownMenu = {
  location: "downtown",
  source: "https://order.toasttab.com/online/pleasure-pizza-downtown",
  checkedAt: "2026-09-12",
  categories: ["whole pizzas", "slices", "wings", "fries", "cheesy garlic bread", "tenders", "burger", "salads", "drinks"],
  sizes: { wholePizzaInches: [14, 18], glutenFreeCrustInches: 12 },
  examples: [
    { name: "cheese", ingredients: ["cheese"] },
    { name: "pepperoni", ingredients: ["applewood-smoked pepperoni"] },
    { name: "bbq chicken", ingredients: ["chicken", "bbq sauce", "pepper jack", "red onions", "bell peppers", "pineapple"] },
    { name: "greek", ingredients: ["artichokes", "tomatoes", "feta", "olives"], vegetarian: true },
    { name: "veggie", ingredients: ["tomatoes", "red onions", "bell peppers", "mushrooms", "olives"], vegetarian: true },
    { name: "pleasure combo", ingredients: ["sausage", "pepperoni", "salami", "green bell peppers", "red onions", "olives", "mushrooms"] },
  ],
  publishedSlicePricesUsd: { cheese: 5.75, pepperoni: 6.25, pleasureCombo: 7 },
  notes: "Partial menu, not exhaustive. Vegan cheese is listed. Whole-pizza prices and extra-cheese charges are not confirmed in this snapshot. Published prices may change; stock and cross-contact safety are unknown.",
};
