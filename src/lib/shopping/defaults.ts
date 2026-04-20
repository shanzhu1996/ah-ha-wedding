/**
 * Default shopping-list template.
 *
 * Seeded ONCE per wedding on the couple's first visit to /shopping
 * (gated by `weddings.shopping_seeded_at`). Never regenerated afterward —
 * the couple owns the list and can delete/edit/add freely.
 *
 * Shared between the server-side seed (src/app/(app)/shopping/page.tsx) and
 * the client manager (src/components/shopping/shopping-manager.tsx). The
 * client uses these same constants for the attire picker flow, so keep them
 * exported as-is.
 */

export type AttirePreference =
  | "dress"
  | "suit"
  | "undecided"
  | "mix"
  | "custom"
  | null;

export const DRESS_ITEMS: { name: string; search: string }[] = [
  { name: "Wedding gown", search: "wedding dress bridal gown" },
  { name: "Veil or headpiece", search: "bridal veil headpiece" },
  { name: "Wedding shoes", search: "bridal wedding shoes" },
  { name: "Comfortable backup flats", search: "foldable ballet flats wedding" },
  { name: "Bridal earrings", search: "bridal earrings wedding jewelry" },
  { name: "Bridal necklace", search: "bridal necklace Etsy" },
  { name: "Hair accessories", search: "bridal hair comb pins" },
  { name: "Garter", search: "wedding garter Etsy" },
  { name: "Getting-ready robe", search: "bride getting ready robe satin" },
  { name: "Bridal undergarments", search: "strapless bra shapewear bridal" },
  { name: "Dress hanger (for photos)", search: "personalized bridal dress hanger" },
  { name: "Something old/new/borrowed/blue", search: "something blue bridal charm" },
];

export const SUIT_ITEMS: { name: string; search: string }[] = [
  { name: "Suit or tuxedo", search: "groom wedding suit" },
  { name: "Dress shirt", search: "men's white dress shirt wedding" },
  { name: "Tie or bow tie", search: "groom tie bow tie wedding" },
  { name: "Cufflinks", search: "wedding cufflinks groom" },
  { name: "Dress shoes", search: "men's dress shoes wedding" },
  { name: "Belt or suspenders", search: "groom belt suspenders" },
  { name: "Pocket square", search: "pocket square wedding" },
  { name: "Getting-ready outfit", search: "" },
];

export function getAttireItems(attire: AttirePreference): { name: string; search: string }[] {
  if (attire === "dress") return DRESS_ITEMS;
  if (attire === "suit") return SUIT_ITEMS;
  if (attire === "mix") return [...DRESS_ITEMS, ...SUIT_ITEMS];
  if (attire === "custom") return []; // couple chose to manage themselves
  // undecided or null: show both combined as a sensible first pass until the
  // couple answers the in-product prompt and commits to a style.
  return [...DRESS_ITEMS, ...SUIT_ITEMS];
}

export const STATIC_CATEGORIES = [
  "Stationery",
  "Emergency & Personal Care",
  "Ceremony",
  "Cocktail Hour",
  "Reception Decor",
  "Welcome Table",
  "Signage",
  "Rentals",
  "Welcome Bags",
  "Gifts",
];

export function getCategories(partner1Name: string, partner2Name: string): string[] {
  return [
    `${partner1Name}'s Attire`,
    `${partner2Name}'s Attire`,
    ...STATIC_CATEGORIES,
  ];
}

export function getDefaultItems(
  partner1Name: string,
  partner2Name: string,
  partner1Attire: AttirePreference,
  partner2Attire: AttirePreference,
): Record<string, { name: string; search: string }[]> {
  return {
    [`${partner1Name}'s Attire`]: getAttireItems(partner1Attire),
    [`${partner2Name}'s Attire`]: getAttireItems(partner2Attire),
    "Stationery": [
      { name: "Save-the-dates", search: "save the date cards Etsy" },
      { name: "Wedding invitations", search: "wedding invitation suite Etsy" },
      { name: "RSVP cards + envelopes", search: "RSVP cards wedding" },
      { name: "Detail / enclosure cards", search: "wedding detail cards" },
      { name: "Postage stamps", search: "USPS wedding stamps" },
      { name: "Thank-you cards", search: "wedding thank you cards" },
    ],
    "Emergency & Personal Care": [
      { name: "Bridal emergency kit (pre-assembled)", search: "bridal emergency kit pre made Amazon" },
      { name: "Groom emergency kit", search: "groom emergency kit" },
      { name: "Stain pen (Tide To Go)", search: "Tide to go stain remover pen" },
      { name: "Safety pins (assorted sizes)", search: "safety pins assorted" },
      { name: "Sewing kit (white + colored thread)", search: "mini sewing kit travel" },
      { name: "Double-sided fashion tape", search: "fashion tape double sided bridal" },
      { name: "Blister bandaids / moleskin", search: "blister bandages heel" },
      { name: "Bobby pins + hair ties", search: "bobby pins pack" },
      { name: "Hairspray / setting spray", search: "bridal hair setting spray" },
      { name: "Deodorant (travel size)", search: "travel deodorant" },
      { name: "Mints / breath freshener", search: "Altoids tin wedding" },
      { name: "Pain relievers (Advil / Tylenol)", search: "travel size advil" },
      { name: "Tampons / pads", search: "travel size tampons" },
      { name: "Makeup touch-up kit", search: "bridal makeup touch up kit" },
      { name: "Lint roller", search: "lint roller travel size" },
      { name: "Static guard spray", search: "static guard spray dress" },
      { name: "Backup shirt (groom)", search: "" },
      { name: "Backup tie / cufflinks (groom)", search: "" },
    ],
    "Ceremony": [
      { name: "Welcome sign + easel", search: "wedding welcome sign acrylic Etsy" },
      { name: "Guest book + pen", search: "wedding guest book alternative" },
      { name: "Card box", search: "wedding card box lock Etsy" },
      { name: "Ceremony arch/arbor decor", search: "wedding arch decor" },
      { name: "Aisle runner", search: "wedding aisle runner" },
      { name: "Unity ceremony items", search: "unity candle sand ceremony set" },
      { name: "Ring pillow or ring box", search: "ring bearer pillow box" },
      { name: "Flower girl basket + petals", search: "flower girl basket petals" },
      { name: "Flower girl crown / halo", search: "flower girl crown halo wedding" },
      { name: "Programs", search: "wedding ceremony programs" },
      { name: "Reserved seating signs", search: "reserved wedding sign" },
      { name: "Unplugged ceremony sign", search: "unplugged ceremony sign" },
      { name: "Parents' corsages & boutonnieres", search: "" },
      { name: "Grandparents' corsages & boutonnieres", search: "" },
      { name: "Bridal party bouquets", search: "" },
      { name: "Groomsmen boutonnieres", search: "" },
    ],
    "Cocktail Hour": [
      { name: "Signature cocktail sign", search: "signature cocktail sign wedding" },
      { name: "Bar menu sign", search: "bar menu sign wedding" },
      { name: "Photo booth props", search: "wedding photo booth props" },
      { name: "Lawn games", search: "wedding lawn games cornhole" },
    ],
    "Reception Decor": [
      { name: "Centerpieces", search: "wedding centerpiece" },
      { name: "Candles + holders", search: "wedding candles votive holders bulk" },
      { name: "Table numbers", search: "wedding table numbers acrylic Etsy" },
      { name: "Table number holders / stands", search: "table number holder stand wedding" },
      { name: "Table linens", search: "wedding table runner linen" },
      { name: "Napkins", search: "wedding cloth napkins" },
      { name: "Charger plates", search: "wedding charger plates gold" },
      { name: "Place cards", search: "wedding place cards Etsy" },
      { name: "Menu cards", search: "wedding menu cards" },
      { name: "Cake topper", search: "wedding cake topper Etsy" },
      { name: "Cake cutting set", search: "wedding cake cutting set" },
      { name: "Cake stand", search: "wedding cake stand" },
      { name: "Toasting flutes", search: "wedding toasting glasses" },
      { name: "Sweetheart table decor", search: "sweetheart table decor" },
      { name: "String lights", search: "string lights wedding reception" },
      { name: "Wedding favors", search: "wedding favors" },
      { name: "Sparklers / exit items", search: "wedding sparklers send off" },
      { name: "Kids' activity bags", search: "wedding kids activity bag favor" },
      { name: "Crayons & coloring books", search: "wedding kids coloring book" },
      { name: "Kids' menu cards", search: "kids menu card wedding" },
    ],
    "Welcome Table": [
      { name: "Welcome sign", search: "wedding welcome sign" },
      { name: "Framed photos", search: "gold photo frames wedding" },
      { name: "Escort card display", search: "escort card display wedding" },
      { name: "Memorial table items", search: "in loving memory wedding frame" },
    ],
    "Signage": [
      { name: "Seating chart display", search: "wedding seating chart sign" },
      { name: "Hashtag sign", search: "wedding hashtag sign" },
      { name: "Directional signs", search: "wedding directional signs" },
      { name: "Cards & gifts sign", search: "cards and gifts sign wedding" },
      { name: "Guest book sign", search: "guest book sign wedding" },
    ],
    "Rentals": [
      { name: "Tables", search: "" },
      { name: "Chairs", search: "" },
      { name: "Place settings (china, flatware, glassware)", search: "" },
      { name: "Dance floor", search: "" },
      { name: "Tent / canopy", search: "" },
      { name: "Lighting (uplights, chandeliers)", search: "" },
      { name: "Lounge furniture", search: "" },
      { name: "Audio equipment", search: "" },
    ],
    "Welcome Bags": [
      { name: "Tote bags", search: "wedding welcome bag tote" },
      { name: "Water bottles", search: "personalized water bottle labels wedding" },
      { name: "Snacks & local treats", search: "" },
      { name: "Itinerary cards", search: "wedding weekend itinerary card" },
      { name: "Hangover kit items", search: "wedding hangover kit supplies" },
    ],
    "Gifts": [
      { name: "Wedding party gifts", search: "wedding party gift box set" },
      { name: "Parents gifts", search: "parent gift wedding" },
      { name: "Flower girl gift", search: "flower girl gift" },
      { name: "Ring bearer gift", search: "ring bearer gift" },
      { name: "Officiant gift + thank-you card", search: "officiant thank you gift" },
    ],
  };
}
