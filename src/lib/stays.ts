// Javni smještaj (stays.sarajevopropertymanagement.ba) — popis apartmana koji se mogu rezervisati.
// Sadržaj je na engleskom jer je stranica za strane goste. Činjenice su iz Airbnb oglasa i Rentlia (ne izmišljati).

export interface AmenityGroup {
  title: string;
  items: string[];
}

export interface Stay {
  slug: string;
  name: string;
  tagline: string;
  rentlioPropertyId: number;
  rentlioUnitTypeId: number;
  maxGuests: number;
  currency: string;
  facts: string[]; // kratki red ispod naslova
  description: string[];
  highlights: string[];
  amenities: AmenityGroup[];
  notes: string[]; // dodatno "Good to know" (npr. kućni ljubimci, kamere)
  freeCancellationDays: number;
}

export const STAYS: Stay[] = [
  {
    slug: "grbavica-lux",
    name: "Grbavica Lux",
    tagline: "A fully equipped one-bedroom apartment in Sarajevo",
    rentlioPropertyId: 31314,
    rentlioUnitTypeId: 63801,
    maxGuests: 3,
    currency: "EUR",
    facts: ["Up to 3 guests", "1 bedroom", "1 bed", "1 bathroom"],
    description: [
      "A private one-bedroom apartment in Sarajevo for up to three guests, with a full kitchen, air conditioning and everything you need for a comfortable stay.",
      "Book direct for the best price and instant confirmation.",
    ],
    highlights: ["Best price when you book direct", "Instant confirmation", "Free cancellation up to 5 days before arrival", "Host greets you"],
    amenities: [
      { title: "Comfort", items: ["Air conditioning", "Central heating", "Wifi", "TV", "Elevator", "Free street parking"] },
      {
        title: "Kitchen",
        items: ["Full kitchen", "Refrigerator", "Stove and oven", "Microwave", "Dishwasher", "Coffee maker", "Hot water kettle", "Dishes and silverware", "Dining table", "Coffee"],
      },
      { title: "Bathroom and laundry", items: ["Hair dryer", "Shampoo", "Body soap", "Shower gel", "Cleaning products", "Washer", "Bed linens"] },
    ],
    notes: [],
    freeCancellationDays: 5,
  },
  {
    slug: "skyline-apartment",
    name: "Skyline Apartment",
    tagline: "A two-bedroom apartment with a private balcony in Sarajevo",
    rentlioPropertyId: 32843,
    rentlioUnitTypeId: 67399,
    maxGuests: 5,
    currency: "EUR",
    facts: ["Up to 5 guests", "2 bedrooms", "2 beds", "1.5 bathrooms"],
    description: [
      "A private two-bedroom apartment in Sarajevo for up to five guests, with a balcony, a washer and a dryer.",
      "Book direct for the best price and instant confirmation.",
    ],
    highlights: ["Best price when you book direct", "Instant confirmation", "Free cancellation up to 5 days before arrival", "Host greets you"],
    amenities: [
      { title: "Comfort", items: ["Private patio or balcony", "Heating", "Wifi", "TV", "Elevator", "Free street parking", "Pets allowed"] },
      { title: "Kitchen", items: ["Full kitchen", "Microwave", "Oven"] },
      {
        title: "Bathroom and laundry",
        items: ["Hair dryer", "Shampoo", "Body soap", "Shower gel", "Hot water", "Washer", "Dryer", "Iron", "Bed linens", "Clothing storage"],
      },
    ],
    notes: ["Exterior security cameras on the property."],
    freeCancellationDays: 5,
  },
  {
    slug: "green-nest",
    name: "Green Nest",
    tagline: "A cosy one-bedroom apartment with free parking in Sarajevo",
    rentlioPropertyId: 32598,
    rentlioUnitTypeId: 66934,
    maxGuests: 2,
    currency: "EUR",
    facts: ["Up to 2 guests", "1 bedroom", "1 bed", "1 bathroom"],
    description: [
      "A private one-bedroom apartment in Sarajevo for up to two guests, with a kitchen, air conditioning and free street parking.",
      "Book direct for the best price and instant confirmation.",
    ],
    highlights: ["Best price when you book direct", "Instant confirmation", "Free cancellation up to 5 days before arrival", "Free street parking"],
    amenities: [
      { title: "Comfort", items: ["Air conditioning", "Heating", "Wifi", "TV", "Free street parking"] },
      { title: "Kitchen", items: ["Full kitchen", "Mini fridge", "Hot water kettle", "Dining table", "Coffee"] },
      { title: "Bathroom and linens", items: ["Hair dryer", "Shampoo", "Hot water", "Iron", "Bed linens"] },
    ],
    notes: [],
    freeCancellationDays: 5,
  },
  {
    slug: "apartment-bulbul",
    name: "Apartment Bulbul",
    tagline: "A one-bedroom apartment in Sarajevo",
    rentlioPropertyId: 31177,
    rentlioUnitTypeId: 63554,
    maxGuests: 2,
    currency: "EUR",
    facts: ["Up to 2 guests", "1 bedroom", "1 bed", "1 bathroom"],
    description: [
      "A private one-bedroom apartment in Sarajevo for up to 2 guests, with air conditioning.",
      "Book direct for the best price and instant confirmation.",
    ],
    highlights: ["Best price when you book direct", "Instant confirmation", "Free cancellation up to 5 days before arrival", "Private and fully equipped"],
    amenities: [
        {
              "title": "Comfort",
              "items": [
                    "TV",
                    "Air conditioning",
                    "Heating",
                    "Wifi",
                    "Private BBQ grill"
              ]
        },
        {
              "title": "Kitchen",
              "items": [
                    "Kitchen",
                    "Refrigerator"
              ]
        },
        {
              "title": "Bathroom and laundry",
              "items": [
                    "Hair dryer",
                    "Body soap"
              ]
        }
],
    notes: [],
    freeCancellationDays: 5,
  },
  {
    slug: "cozy-coco",
    name: "Cozy Coco",
    tagline: "A one-bedroom apartment in Sarajevo",
    rentlioPropertyId: 33577,
    rentlioUnitTypeId: 69081,
    maxGuests: 4,
    currency: "EUR",
    facts: ["Up to 4 guests", "1 bedroom", "1 bed", "1 bathroom"],
    description: [
      "A private one-bedroom apartment in Sarajevo for up to 4 guests, with a washer.",
      "Book direct for the best price and instant confirmation.",
    ],
    highlights: ["Best price when you book direct", "Instant confirmation", "Free cancellation up to 5 days before arrival", "Private and fully equipped"],
    amenities: [
        {
              "title": "Comfort",
              "items": [
                    "TV",
                    "Heating",
                    "Wifi",
                    "Paid parking on premises"
              ]
        },
        {
              "title": "Kitchen",
              "items": [
                    "Kitchen",
                    "Refrigerator",
                    "Microwave",
                    "Cooking basics",
                    "Dishes and silverware",
                    "Dishwasher",
                    "Stove",
                    "Oven",
                    "Dining table",
                    "Coffee"
              ]
        },
        {
              "title": "Bathroom and laundry",
              "items": [
                    "Hair dryer",
                    "Shampoo",
                    "Hot water",
                    "Shower gel",
                    "Washer",
                    "Dryer",
                    "Bed linens",
                    "Iron"
              ]
        }
],
    notes: [],
    freeCancellationDays: 5,
  },
  {
    slug: "apartment-verde",
    name: "Apartment Verde",
    tagline: "A one-bedroom apartment with free parking in Sarajevo",
    rentlioPropertyId: 35224,
    rentlioUnitTypeId: 73046,
    maxGuests: 3,
    currency: "EUR",
    facts: ["Up to 3 guests", "1 bedroom", "1 bed", "1 bathroom"],
    description: [
      "A private one-bedroom apartment in Sarajevo for up to 3 guests, with air conditioning, a washer and free parking.",
      "Book direct for the best price and instant confirmation.",
    ],
    highlights: ["Best price when you book direct", "Instant confirmation", "Free cancellation up to 5 days before arrival", "Self check-in"],
    amenities: [
        {
              "title": "Comfort",
              "items": [
                    "TV",
                    "Air conditioning",
                    "Heating",
                    "Wifi",
                    "Private entrance",
                    "Free parking on premises",
                    "Self check-in",
                    "Lockbox"
              ]
        },
        {
              "title": "Kitchen",
              "items": [
                    "Kitchen",
                    "Refrigerator",
                    "Cooking basics",
                    "Dishes and silverware",
                    "Dishwasher",
                    "Stove",
                    "Oven",
                    "Hot water kettle",
                    "Coffee maker",
                    "Dining table",
                    "Coffee"
              ]
        },
        {
              "title": "Bathroom and laundry",
              "items": [
                    "Hair dryer",
                    "Cleaning products",
                    "Shampoo",
                    "Body soap",
                    "Hot water",
                    "Shower gel",
                    "Washer",
                    "Bed linens",
                    "Iron",
                    "Drying rack for clothing",
                    "Clothing storage"
              ]
        }
],
    notes: [],
    freeCancellationDays: 5,
  },
  {
    slug: "presidential-apartment",
    name: "Presidential Apartment",
    tagline: "A two-bedroom apartment in Sarajevo",
    rentlioPropertyId: 35306,
    rentlioUnitTypeId: 73230,
    maxGuests: 4,
    currency: "EUR",
    facts: ["Up to 4 guests", "2 bedrooms", "2 beds", "1 bathroom"],
    description: [
      "A private two-bedroom apartment in Sarajevo for up to 4 guests, with a washer.",
      "Book direct for the best price and instant confirmation.",
    ],
    highlights: ["Best price when you book direct", "Instant confirmation", "Free cancellation up to 5 days before arrival", "Private and fully equipped"],
    amenities: [
        {
              "title": "Comfort",
              "items": [
                    "TV",
                    "Heating",
                    "Wifi",
                    "Private entrance"
              ]
        },
        {
              "title": "Kitchen",
              "items": [
                    "Kitchen",
                    "Refrigerator",
                    "Cooking basics",
                    "Dishes and silverware",
                    "Dishwasher",
                    "Stove",
                    "Oven",
                    "Hot water kettle",
                    "Coffee maker",
                    "Toaster",
                    "Dining table",
                    "Coffee"
              ]
        },
        {
              "title": "Bathroom and laundry",
              "items": [
                    "Hair dryer",
                    "Cleaning products",
                    "Shampoo",
                    "Body soap",
                    "Hot water",
                    "Shower gel",
                    "Free washer",
                    "Bed linens",
                    "Iron",
                    "Clothing storage"
              ]
        },
        {
              "title": "Safety",
              "items": [
                    "Carbon monoxide alarm"
              ]
        }
],
    notes: ["Exterior security cameras on the property."],
    freeCancellationDays: 5,
  },
  {
    slug: "five-points-studio-ii",
    name: "Five Points Studio II",
    tagline: "A studio apartment with free parking in Sarajevo",
    rentlioPropertyId: 35349,
    rentlioUnitTypeId: 73353,
    maxGuests: 2,
    currency: "EUR",
    facts: ["Up to 2 guests", "Studio", "1 bed", "1 bathroom"],
    description: [
      "A private studio in Sarajevo for up to 2 guests, with a balcony or patio, air conditioning and free parking.",
      "Book direct for the best price and instant confirmation.",
    ],
    highlights: ["Best price when you book direct", "Instant confirmation", "Free cancellation up to 5 days before arrival", "Self check-in"],
    amenities: [
        {
              "title": "Comfort",
              "items": [
                    "TV",
                    "Air conditioning",
                    "Wifi",
                    "Private entrance",
                    "Patio or balcony",
                    "Free parking on premises",
                    "Self check-in",
                    "Lockbox"
              ]
        },
        {
              "title": "Kitchen",
              "items": [
                    "Microwave",
                    "Mini fridge",
                    "Hot water kettle",
                    "Coffee maker",
                    "Coffee"
              ]
        },
        {
              "title": "Bathroom and laundry",
              "items": [
                    "Cleaning products",
                    "Shampoo",
                    "Body soap",
                    "Hot water",
                    "Shower gel",
                    "Bed linens",
                    "Clothing storage"
              ]
        }
],
    notes: [],
    freeCancellationDays: 5,
  },
  {
    slug: "five-points-studio-iv",
    name: "Five Points Studio IV",
    tagline: "A studio apartment with free parking in Sarajevo",
    rentlioPropertyId: 35350,
    rentlioUnitTypeId: 73354,
    maxGuests: 2,
    currency: "EUR",
    facts: ["Up to 2 guests", "Studio", "1 bed", "1 bathroom"],
    description: [
      "A private studio in Sarajevo for up to 2 guests, with a balcony or patio, air conditioning and free parking.",
      "Book direct for the best price and instant confirmation.",
    ],
    highlights: ["Best price when you book direct", "Instant confirmation", "Free cancellation up to 5 days before arrival", "Self check-in"],
    amenities: [
        {
              "title": "Comfort",
              "items": [
                    "TV",
                    "Air conditioning",
                    "Wifi",
                    "Private entrance",
                    "Shared patio or balcony",
                    "Free parking on premises",
                    "Self check-in",
                    "Lockbox"
              ]
        },
        {
              "title": "Kitchen",
              "items": [
                    "Microwave",
                    "Mini fridge",
                    "Hot water kettle",
                    "Coffee maker",
                    "Coffee"
              ]
        },
        {
              "title": "Bathroom and laundry",
              "items": [
                    "Cleaning products",
                    "Shampoo",
                    "Hot water",
                    "Shower gel",
                    "Bed linens",
                    "Clothing storage"
              ]
        },
        {
              "title": "Safety",
              "items": [
                    "Fire extinguisher"
              ]
        }
],
    notes: [],
    freeCancellationDays: 5,
  },
  {
    slug: "five-points-2br",
    name: "Five Points 2BR Apartment",
    tagline: "A two-bedroom apartment with free parking in Sarajevo",
    rentlioPropertyId: 35348,
    rentlioUnitTypeId: 73352,
    maxGuests: 5,
    currency: "EUR",
    facts: ["Up to 5 guests", "2 bedrooms", "2 beds", "2 bathrooms"],
    description: [
      "A private two-bedroom apartment in Sarajevo for up to 5 guests, with a balcony or patio, air conditioning, a washer and free parking.",
      "Book direct for the best price and instant confirmation.",
    ],
    highlights: ["Best price when you book direct", "Instant confirmation", "Free cancellation up to 5 days before arrival", "Self check-in"],
    amenities: [
        {
              "title": "Comfort",
              "items": [
                    "TV",
                    "Air conditioning",
                    "Heating",
                    "Wifi",
                    "Private entrance",
                    "Patio or balcony",
                    "Free parking on premises",
                    "Self check-in",
                    "Lockbox"
              ]
        },
        {
              "title": "Kitchen",
              "items": [
                    "Kitchen",
                    "Refrigerator",
                    "Cooking basics",
                    "Dishes and silverware",
                    "Dishwasher",
                    "Stove",
                    "Oven",
                    "Hot water kettle",
                    "Coffee maker",
                    "Coffee"
              ]
        },
        {
              "title": "Bathroom and laundry",
              "items": [
                    "Hair dryer",
                    "Cleaning products",
                    "Shampoo",
                    "Body soap",
                    "Hot water",
                    "Shower gel",
                    "Washer",
                    "Bed linens",
                    "Iron",
                    "Clothing storage"
              ]
        },
        {
              "title": "Safety",
              "items": [
                    "Fire extinguisher"
              ]
        }
],
    notes: [],
    freeCancellationDays: 5,
  },
  {
    slug: "cable-car-apartment",
    name: "Cable Car Apartment",
    tagline: "A one-bedroom apartment in Sarajevo",
    rentlioPropertyId: 33033,
    rentlioUnitTypeId: 67816,
    maxGuests: 3,
    currency: "EUR",
    facts: ["Up to 3 guests", "1 bedroom", "1 bed", "1 bathroom"],
    description: [
      "A private one-bedroom apartment in Sarajevo for up to 3 guests, with air conditioning and a washer.",
      "Book direct for the best price and instant confirmation.",
    ],
    highlights: ["Best price when you book direct", "Instant confirmation", "Free cancellation up to 5 days before arrival", "Self check-in"],
    amenities: [
        {
              "title": "Comfort",
              "items": [
                    "TV",
                    "Air conditioning",
                    "Heating",
                    "Wifi",
                    "Self check-in",
                    "Lockbox"
              ]
        },
        {
              "title": "Kitchen",
              "items": [
                    "Kitchen",
                    "Refrigerator",
                    "Cooking basics",
                    "Dishes and silverware",
                    "Oven",
                    "Dining table",
                    "Coffee"
              ]
        },
        {
              "title": "Bathroom and laundry",
              "items": [
                    "Hair dryer",
                    "Shampoo",
                    "Body soap",
                    "Hot water",
                    "Shower gel",
                    "Washer",
                    "Bed linens",
                    "Clothing storage"
              ]
        }
],
    notes: [],
    freeCancellationDays: 5,
  },
  {
    slug: "luxury-loft",
    name: "Luxury Loft",
    tagline: "A one-bedroom apartment with free parking in Sarajevo",
    rentlioPropertyId: 32709,
    rentlioUnitTypeId: 67170,
    maxGuests: 2,
    currency: "EUR",
    facts: ["Up to 2 guests", "1 bedroom", "1 bed", "1 bathroom"],
    description: [
      "A private one-bedroom apartment in Sarajevo for up to 2 guests, with air conditioning, a washer and free parking.",
      "Book direct for the best price and instant confirmation.",
    ],
    highlights: ["Best price when you book direct", "Instant confirmation", "Free cancellation up to 5 days before arrival", "Free parking"],
    amenities: [
        {
              "title": "Comfort",
              "items": [
                    "Bathtub",
                    "TV",
                    "Travel crib",
                    "Air conditioning",
                    "Heating",
                    "Wifi",
                    "Free parking on premises"
              ]
        },
        {
              "title": "Kitchen",
              "items": [
                    "Kitchen",
                    "Refrigerator",
                    "Cooking basics",
                    "Dishes and silverware",
                    "Freezer",
                    "Dishwasher",
                    "Stove",
                    "Oven",
                    "Dining table",
                    "Coffee"
              ]
        },
        {
              "title": "Bathroom and laundry",
              "items": [
                    "Hair dryer",
                    "Cleaning products",
                    "Shampoo",
                    "Body soap",
                    "Hot water",
                    "Shower gel",
                    "Washer",
                    "Dryer",
                    "Bed linens",
                    "Iron",
                    "Clothing storage"
              ]
        },
        {
              "title": "Safety",
              "items": [
                    "Smoke alarm"
              ]
        }
],
    notes: ["Exterior security cameras on the property."],
    freeCancellationDays: 5,
  },
  {
    slug: "spacious-2br-titova",
    name: "Spacious 2BR on Titova",
    tagline: "A two-bedroom apartment in Sarajevo",
    rentlioPropertyId: 35254,
    rentlioUnitTypeId: 73118,
    maxGuests: 5,
    currency: "EUR",
    facts: ["Up to 5 guests", "2 bedrooms", "2 beds", "1 bathroom"],
    description: [
      "A private two-bedroom apartment in Sarajevo for up to 5 guests, with air conditioning and a washer.",
      "Book direct for the best price and instant confirmation.",
    ],
    highlights: ["Best price when you book direct", "Instant confirmation", "Free cancellation up to 5 days before arrival", "Private and fully equipped"],
    amenities: [
        {
              "title": "Comfort",
              "items": [
                    "Bathtub",
                    "TV",
                    "Air conditioning",
                    "Heating",
                    "Wifi",
                    "Private entrance"
              ]
        },
        {
              "title": "Kitchen",
              "items": [
                    "Kitchen",
                    "Refrigerator",
                    "Cooking basics",
                    "Dishes and silverware",
                    "Dishwasher",
                    "Stove",
                    "Oven",
                    "Hot water kettle",
                    "Dining table",
                    "Coffee"
              ]
        },
        {
              "title": "Bathroom and laundry",
              "items": [
                    "Hair dryer",
                    "Cleaning products",
                    "Shampoo",
                    "Body soap",
                    "Hot water",
                    "Shower gel",
                    "Washer",
                    "Bed linens",
                    "Iron",
                    "Clothing storage"
              ]
        }
],
    notes: [],
    freeCancellationDays: 5,
  },
];

export function getStay(slug: string): Stay | undefined {
  return STAYS.find((s) => s.slug === slug);
}

// Promo kodovi: env STAYS_PROMO_CODES="WELCOME10:10,FRIEND10:10" (kod:postotak popusta)
export function promoPercent(code: string | undefined | null): number {
  if (!code) return 0;
  const wanted = code.trim().toUpperCase();
  for (const entry of (process.env.STAYS_PROMO_CODES ?? "").split(",")) {
    const [c, pct] = entry.split(":");
    if (c && c.trim().toUpperCase() === wanted) {
      const n = Number(pct);
      if (n > 0 && n < 100) return n;
    }
  }
  return 0;
}
