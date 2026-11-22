import type { Category, ChoiceGroup, Extra, Menu, MenuItem, Variant } from "@/lib/types";

/**
 * Zaitoon Family Restaurant menu, taken from zaitoonfamilyrestaurant.com/menu
 * (November 2026). Names, descriptions and prices are theirs. Everything here
 * is only the starting data: the admin panel edits the live copy.
 */

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const CATEGORY_LIST: [id: string, name: string, blurb?: string][] = [
  ["soups", "Soups", "Served hot and thick, made on rich chicken stock."],
  ["starters", "Starters", "Crispy favourites to open the table."],
  ["sandwiches", "Steak Sandwiches", "Grilled chicken, cheddar and the chef's own sauce."],
  ["burgers", "Burgers", "Smashed beef and crispy chicken, grilled to order."],
  ["thai-chinese", "Thai & Chinese", "All platter dishes are served with egg fried rice."],
  ["continental", "Pasta & Continental", "Creamy, cheesy and plated to share."],
  ["steaks", "Steaks", "Grilled to perfection with your choice of sauce."],
  ["broast", "Broast", "All chicken broast is served with fries."],
  ["karahi", "Karahi & Handi", "Cooked to order. Ask for desi ghee or butter."],
  ["bbq", "Bar B Q", "Marinated with the chef's secret spices, with mint raita and green imli sauce."],
  ["naan", "Naan, Roti & Sides", "Fresh from the tandoor."],
  ["desserts", "Desserts", "Ice cream creations to finish."],
  ["shakes", "Shakes & Smoothies"],
  ["mocktails", "Mocktails & Margaritas"],
  ["juices", "Fresh Juices", "Seasonal fruit, pressed fresh."],
  ["tea", "Tea & Coffee"],
  ["drinks", "Soft Drinks & Water"],
];

export const CATEGORIES: Category[] = CATEGORY_LIST.map(([id, name, blurb], i) => ({
  id,
  name,
  sort: i,
  blurb,
}));

type Opts = Partial<
  Pick<MenuItem, "desc" | "image" | "popular" | "spicy" | "unit" | "variants" | "choices" | "extras">
>;

const items: MenuItem[] = [];
function add(categoryId: string, name: string, price: number, opts: Opts = {}) {
  const id = `${categoryId}-${slug(name)}`;
  const variants = opts.variants;
  items.push({
    id,
    categoryId,
    name,
    price: variants?.length ? Math.min(...variants.map((v) => v.price)) : price,
    available: true,
    sort: items.length,
    ...opts,
  });
}

const variants = (...list: [string, number][]): Variant[] =>
  list.map(([name, price]) => ({ id: slug(name), name, price }));
const choice = (name: string, ...options: string[]): ChoiceGroup => ({
  id: slug(name),
  name,
  options,
});
const extras = (...list: [string, number][]): Extra[] =>
  list.map(([name, price]) => ({ id: slug(name), name, price }));

const PROTEIN = () => variants(["Chicken", 1450], ["Beef", 1950], ["Prawn", 2350]);
const SPICE = () => choice("Spice level", "Mild", "Medium", "Spicy");
const GHEE = () => extras(["Cook in desi ghee (per kg)", 450], ["Cook in butter (per kg)", 450]);
const SANDWICH_EXTRAS = () => extras(["Extra cheese", 175], ["Extra topping", 175], ["Extra sauce", 75]);
const BURGER_EXTRAS = () =>
  extras(
    ["Extra chicken patty", 450],
    ["Extra beef patty", 550],
    ["Extra cheese slice", 150],
    ["Extra topping", 150],
    ["Extra sauce", 75],
  );
const STEAK_CHOICES = () => [
  choice("Sauce", "Mushroom", "Black Pepper", "Mexican", "Tarragon", "Moroccan"),
  choice("Side", "Jacket potato", "Mashed potato"),
];

// ───────────── Soups ─────────────
add("soups", "House Special Soup", 1250, {
  desc: "Fresh prawns with chicken, button mushrooms, black mushrooms and egg, cooked in rich chicken stock.",
});
add("soups", "19 B Special Soup", 1200, {
  desc: "Our famous 19 B soup, a delicious combination of chicken and prawns.",
  popular: true,
});
add("soups", "Special Szechuan Soup", 1200, {
  desc: "Hot and fiery Szechuan-style soup.",
  spicy: true,
  image: "szechuan-soup",
});
add("soups", "Chicken Corn Soup", 1100, { desc: "The family favourite.", image: "corn-soup" });
add("soups", "Hot & Sour Soup", 1100, { spicy: true });
add("soups", "Chicken & Vegetable Soup", 950, { desc: "Light, clear broth." });
add("soups", "Fish Crackers", 600);

// ───────────── Starters ─────────────
add("starters", "House Special Silk Prawns", 2400, {
  desc: "Large fresh prawns, fried and glazed with our smooth house-special mayo sauce, then coated with crispy shredded potato.",
});
add("starters", "Dynamite Prawns", 2100, {
  desc: "Crispy prawns coated in our signature spicy mayo sauce, served with fresh iceberg lettuce.",
  spicy: true,
});
add("starters", "Jumbo Tail Prawns", 2600, {
  desc: "Jumbo fresh prawns, deep-fried with their tails on and served with the chef's special sauce.",
  unit: "4 pcs",
});
add("starters", "Special Fried Prawns", 2400, {
  desc: "Crispy fresh prawns, deep-fried to perfection and served with our house-special sauce. A popular favourite among our guests.",
  popular: true,
});
add("starters", "Chicken Spring Roll", 750, {
  desc: "Tender boneless chicken and vegetables wrapped in thin pastry and deep-fried.",
});
add("starters", "Crispy Chicken Wings", 1150, {
  desc: "Deep-fried and served hot with your choice of sauce.",
  choices: [choice("Sauce", "BBQ", "Hot Chilli", "Mango Habanero")],
});
add("starters", "Finger Fish N' Chips", 2400, {
  desc: "Deep-fried finger fish served with tartar sauce and fries.",
  unit: "8 pcs",
});
add("starters", "Chicken Drumsticks", 1800, {
  desc: "All-time favourite deep-fried chicken drumsticks, served hot with French fries.",
  unit: "6 pcs",
});
add("starters", "Loaded Fries", 950, {
  desc: "Crispy fries topped with melted cheddar, chicken chilli, pickled peppers and garlic mayo.",
});
add("starters", "French Fries", 600);

// ───────────── Sandwiches ─────────────
add("sandwiches", "New York Grilled Sandwich", 950, {
  desc: "Tender grilled chicken topped with cheddar cheese and our homemade chef's special sauce.",
  extras: SANDWICH_EXTRAS(),
});
add("sandwiches", "Smoked California Grilled Chicken Sandwich", 950, {
  desc: "Classic American steak sandwich: boneless chicken breast from the grill, chef's special sauce and cucumber pickles.",
  extras: SANDWICH_EXTRAS(),
});
add("sandwiches", "Grilled Chicken Club Sandwich", 950, {
  desc: "Tender grilled chicken and fresh ingredients for a satisfying bite every time.",
  extras: SANDWICH_EXTRAS(),
});

// ───────────── Burgers ─────────────
add("burgers", "Smokehouse Beef Burger", 750, {
  desc: "A juicy smashed beef patty grilled to perfection and topped with BBQ sauce, cheddar cheese, pickles and fresh lettuce.",
  image: "smokehouse-burger",
  popular: true,
  extras: BURGER_EXTRAS(),
});
add("burgers", "Smash Beef Cheese Burger", 750, {
  desc: "A premium smashed beef patty topped with cheddar cheese, pickles and fresh lettuce.",
  image: "smash-burger",
  extras: BURGER_EXTRAS(),
});
add("burgers", "Mushroom Beef Burger", 750, {
  desc: "Smashed beef patty with sautéed mushrooms, cheddar cheese, jalapeños and fresh lettuce.",
  extras: BURGER_EXTRAS(),
});
add("burgers", "Pappu Burger", 450, {
  desc: "A delicious and authentic Lahori street-style anda shami burger.",
  extras: BURGER_EXTRAS(),
});
add("burgers", "Kings Choice Burger", 750, {
  desc: "A large grilled chicken burger with lettuce, pickles, ketchup, cheddar and our house-special sauce.",
  extras: BURGER_EXTRAS(),
});
add("burgers", "Zinger Cheese Burger", 650, {
  desc: "A crispy chicken fillet topped with cheese, pickles and garlic mayo. An all-time favourite.",
  popular: true,
  extras: BURGER_EXTRAS(),
});
add("burgers", "African Lion Burger", 650, {
  desc: "A spicy deep-fried chicken burger with cheddar, pickles and garlic mayo.",
  spicy: true,
  extras: BURGER_EXTRAS(),
});

// ───────────── Thai & Chinese ─────────────
add("thai-chinese", "Szechuan", 0, {
  desc: "A famous, mouth-watering spicy dish with julienne-cut vegetables, bell peppers and green and red chillies in Szechuan sauce.",
  image: "szechuan",
  popular: true,
  spicy: true,
  variants: PROTEIN(),
});
add("thai-chinese", "Cashew Nut", 0, {
  desc: "A popular Thai dish with roasted cashew nuts and fresh vegetables cooked in dark soy and fish sauce.",
  image: "cashew-nut",
  variants: PROTEIN(),
});
add("thai-chinese", "Dry Chilli", 0, {
  desc: "A mouth-watering Thai dish with green chillies, cooked in fish sauce and oyster sauce.",
  image: "dry-chilli",
  spicy: true,
  variants: PROTEIN(),
});
add("thai-chinese", "Kung Pao", 0, {
  desc: "Mixed vegetables in a mildly spicy, tangy sauce.",
  image: "kung-pao",
  variants: PROTEIN(),
});
add("thai-chinese", "Manchurian", 0, {
  desc: "Cooked in a spicy tomato sauce with garlic and chilli, served on a sizzling platter.",
  image: "manchurian",
  variants: PROTEIN(),
});
add("thai-chinese", "Oyster Sauce", 0, {
  desc: "Cooked with selected vegetables in oyster sauce.",
  image: "oyster-sauce",
  variants: PROTEIN(),
});
add("thai-chinese", "Black Pepper", 0, {
  desc: "Julienne-cut vegetables in a crushed black pepper sauce.",
  variants: PROTEIN(),
});
add("thai-chinese", "Garlic", 0, {
  desc: "Cooked with fresh chopped garlic and soy sauce.",
  variants: PROTEIN(),
});
add("thai-chinese", "Dragon", 0, {
  desc: "Bell peppers, onions, carrots and red chillies in dragon and oyster sauce.",
  spicy: true,
  variants: PROTEIN(),
});
add("thai-chinese", "Mongolian", 0, {
  desc: "Bell peppers, onions and tomatoes cooked in oyster sauce and HP sauce.",
  variants: PROTEIN(),
});
add("thai-chinese", "Chicken Chow Mein", 2550, {
  desc: "Homemade noodles stir-fried with chicken and fresh vegetables.",
  image: "chow-mein",
});
add("thai-chinese", "Chicken Shashlik", 2550, {
  desc: "Asian-style shashlik with fragrant steamed rice, tender chicken and colourful vegetables in a sweet and tangy sauce.",
  image: "chicken-shashlik",
  unit: "Serves 2",
});

// ───────────── Pasta & Continental ─────────────
add("continental", "Stuffed Chicken and Cheese", 1950, {
  desc: "Chicken breast stuffed with olives, mushrooms, spinach and cheese, with sautéed vegetables and a creamy cheese sauce.",
  image: "stuffed-chicken",
  popular: true,
});
add("continental", "Swiss Polo Chicken", 1950, {
  desc: "Tender stuffed chicken filled with jalapeños, olives and mushrooms, topped with creamy cheese sauce.",
  image: "swiss-polo",
});
add("continental", "Fettuccine Alfredo", 0, {
  desc: "Flat pasta in a smooth, creamy sauce with butter, Parmesan and mozzarella.",
  variants: variants(["Chicken", 1650], ["Prawn", 2350]),
});
add("continental", "Spicy Chicken Pasta", 1550, {
  desc: "Flat noodles cooked in a spicy chilli sauce with chicken, bell peppers and fish sauce.",
  image: "spicy-pasta",
  spicy: true,
});

// ───────────── Steaks ─────────────
add("steaks", "Beef Steak", 2450, {
  desc: "Tender beef fillet, grilled to perfection, with stir-fried vegetables and your choice of side and sauce.",
  image: "beef-steak",
  popular: true,
  choices: STEAK_CHOICES(),
});
add("steaks", "Chicken Steak", 1750, {
  desc: "Boneless chicken breast from the grill, with stir-fried vegetables and your choice of side and sauce.",
  image: "chicken-steak",
  choices: STEAK_CHOICES(),
});

// ───────────── Broast ─────────────
// Prices exactly as listed on the restaurant's website.
add("broast", "Quarter Chicken Broast", 1400, { desc: "Served with fries." });
add("broast", "Half Chicken Broast", 1200, { desc: "Served with fries.", image: "broast" });
add("broast", "Full Broast", 1200, { desc: "Served with fries.", image: "full-broast" });

// ───────────── Karahi & Handi ─────────────
add("karahi", "Karahi Chicken", 0, {
  desc: "Cooked with aromatic herbs and our chef's secret spices. Choose your spice level.",
  image: "karahi-chicken",
  popular: true,
  variants: variants(["Full", 2200], ["Half", 1300]),
  choices: [SPICE()],
  extras: GHEE(),
});
add("karahi", "Desi Karahi Chicken", 0, {
  desc: "Desi chicken, slow-cooked the traditional way.",
  image: "desi-karahi",
  variants: variants(["Full", 4200], ["Half", 2300]),
  choices: [SPICE()],
  extras: GHEE(),
});
add("karahi", "Chicken White Karahi", 0, {
  desc: "Creamy white karahi with green chillies and black pepper.",
  variants: variants(["Full", 2350], ["Half", 1400]),
  choices: [SPICE()],
  extras: GHEE(),
});
add("karahi", "Mutton Karahi", 0, {
  desc: "Tender mutton in a rich tomato and ginger masala.",
  image: "mutton-karahi",
  variants: variants(["Full", 5500], ["Half", 3000]),
  choices: [SPICE()],
  extras: GHEE(),
});
add("karahi", "Mutton White Karahi", 0, {
  variants: variants(["Full", 5650], ["Half", 3100]),
  choices: [SPICE()],
  extras: GHEE(),
});
add("karahi", "Special Boneless Chicken Karahi Qeema", 3500, {
  desc: "Hand-made qeema.",
  choices: [SPICE()],
  extras: GHEE(),
});
add("karahi", "Special Boneless Mutton Karahi Qeema", 7500, {
  desc: "Hand-made qeema.",
  choices: [SPICE()],
  extras: GHEE(),
});
const HANDI = (): Opts["choices"] => [choice("Meat", "Chicken", "Mutton"), SPICE()];
add("karahi", "Amritsaria Handi", 2350, {
  desc: "Boneless handi cooked in rich Amritsari spices and served in an authentic handi.",
  image: "handi",
  choices: HANDI(),
  extras: GHEE(),
});
add("karahi", "Hyderabadi Handi", 2350, {
  desc: "Aromatic spices and succulent meat in a rich Hyderabadi-style handi.",
  choices: HANDI(),
  extras: GHEE(),
});
add("karahi", "Achari Handi", 2350, {
  desc: "Spicy, tangy pickle flavours infused into juicy meat.",
  spicy: true,
  choices: HANDI(),
  extras: GHEE(),
});
add("karahi", "Rajasthani Handi", 2350, {
  desc: "Slow-cooked with aromatic spices, butter and a touch of cream.",
  choices: HANDI(),
  extras: GHEE(),
});
add("karahi", "Madrasi Handi", 2350, {
  desc: "South Indian-style handi with coconut milk and aromatic spices.",
  choices: HANDI(),
  extras: GHEE(),
});

// ───────────── Bar B Q ─────────────
add("bbq", "BBQ Mix Platter (Serves 2)", 3800, { popular: true });
add("bbq", "BBQ Mix Platter (Serves 4)", 7500);
add("bbq", "Chicken Tikka Boti", 1200, { unit: "12 pcs", image: "tikka-boti" });
add("bbq", "Chicken Malai Boti", 1250, { unit: "12 pcs" });
add("bbq", "Chicken Reshmi Kabab", 1250, { unit: "4 pcs" });
add("bbq", "Chicken Seekh Kabab", 1250, { unit: "4 pcs" });
add("bbq", "Chicken Cheese Kabab", 1550, { unit: "4 pcs" });
add("bbq", "Chicken Hari Bhari Kabab", 1250, { unit: "4 pcs" });
add("bbq", "Chicken Piece", 650, { desc: "Leg or breast.", choices: [choice("Piece", "Leg", "Breast")] });
add("bbq", "Beef Kabab", 1400, { unit: "4 pcs" });
add("bbq", "Mutton Seekh Kabab", 1800, { unit: "4 pcs" });
add("bbq", "Mutton Boti Tikka", 2850, { unit: "12 pcs" });
add("bbq", "Mutton Namkeen Tikka", 2850, { unit: "12 pcs" });
add("bbq", "Mutton Chops", 1800, { unit: "4 pcs" });
add("bbq", "Fish Tikka", 1800, { unit: "12 pcs" });
add("bbq", "Grilled Fish", 1750, { desc: "Seasonal.", unit: "per kg" });

// ───────────── Naan, Roti & Sides ─────────────
add("naan", "Roti", 100, { unit: "per person" });
add("naan", "Khamiri Roti", 50);
add("naan", "Plain Naan", 75);
add("naan", "Roghani Naan", 100);
add("naan", "Kalonji Naan", 100);
add("naan", "Garlic Naan", 100);
add("naan", "Afghani Naan", 300);
add("naan", "Cheese Naan", 450);
add("naan", "Chicken Qeema Naan", 550);
add("naan", "Beef Qeema Naan", 650);
add("naan", "Mutton Qeema Naan", 1050);
add("naan", "Salad Bar", 550, { unit: "per plate" });

// ───────────── Desserts ─────────────
add("desserts", "Cold Stone", 150);
add("desserts", "Feast of Chocolate", 250);
add("desserts", "Smooth Sensation", 350);
add("desserts", "Sweet Memories", 350);
add("desserts", "Strawberry Kingdom", 350);
add("desserts", "Awesome Treat", 450);

// ───────────── Shakes & Smoothies (bar menu prices) ─────────────
for (const name of [
  "Bounty Choco Shake",
  "Peanut Butter Shake",
  "Chocolate Shake",
  "Banana Shake",
  "Vanilla Shake",
  "Oreo Shake",
  "Caramel Shake",
]) {
  add("shakes", name, 500);
}
add("shakes", "Kit Kat Shake", 600);
add("shakes", "Mango Smoothie", 500);
add("shakes", "Strawberry Smoothie", 500);

// ───────────── Mocktails ─────────────
add("mocktails", "Mint Margarita", 350, { image: "mint-margarita", popular: true });
add("mocktails", "Pina Colada", 550);
add("mocktails", "White Margarita", 400);
add("mocktails", "Mango Margarita", 400);
add("mocktails", "Orange Margarita", 400, { image: "orange-margarita" });
add("mocktails", "Peach Margarita", 400);
add("mocktails", "Pomegranate Margarita", 650);

// ───────────── Fresh juices ─────────────
add("juices", "Orange Juice", 400, { image: "orange-juice" });
add("juices", "Apple Juice", 400);
add("juices", "Peach Juice", 400);
add("juices", "Falsa Juice", 400);
add("juices", "Pomegranate Juice", 500);
add("juices", "Blueberry Juice", 500);

// ───────────── Tea & coffee ─────────────
add("tea", "Coffee", 195);
add("tea", "Mix Tea", 195);
add("tea", "Black Tea", 175);
add("tea", "Green Tea", 175);
add("tea", "Ice Tea", 175);
add("tea", "Lime Tea", 175);

// ───────────── Soft drinks ─────────────
add("drinks", "Coke", 275, { unit: "can" });
add("drinks", "Diet Coke", 275, { unit: "can" });
add("drinks", "Sprite", 275, { unit: "can" });
add("drinks", "Fanta", 275, { unit: "can" });
add("drinks", "Mineral Water (Large)", 275);
add("drinks", "Mineral Water (Small)", 125);

export const MENU_ITEMS: MenuItem[] = items;

export function seedMenu(): Menu {
  // Deep copy so callers can never mutate the seed.
  return JSON.parse(JSON.stringify({ categories: CATEGORIES, items: MENU_ITEMS }));
}
