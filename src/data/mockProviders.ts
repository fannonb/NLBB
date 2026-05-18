import provider1 from "@/assets/provider-1.jpg";
import provider2 from "@/assets/provider-2.jpg";
import provider3 from "@/assets/provider-3.jpg";
import provider4 from "@/assets/provider-4.jpg";
import provider5 from "@/assets/provider-5.jpg";
import provider6 from "@/assets/provider-6.jpg";
import barbersImg from "@/assets/category-barbers.jpg";
import nailsImg from "@/assets/category-nails.jpg";
import massageImg from "@/assets/category-massage.jpg";
import tattooImg from "@/assets/category-tattoo.jpg";
import salonsImg from "@/assets/category-salons.jpg";

export type Service = {
  name: string;
  duration: string;
  price: string;
};

export type Provider = {
  id: string;
  name: string;
  category: string;
  categorySlug: string;
  rating: number;
  reviews: number;
  distanceKm: number;
  priceRange: string;
  image: string;
  gallery: string[];
  verified: boolean;
  open: boolean;
  location: string;
  address: string;
  about: string;
  phone: string;
  whatsapp: string;
  lat: number;
  lng: number;
  services: Service[];
  hours: { day: string; hours: string }[];
};

export type Category = {
  name: string;
  slug: string;
  image: string;
  count: string;
};

export const categories: Category[] = [
  { name: "Barbers", slug: "barbers", image: barbersImg, count: "120+ pros" },
  { name: "Nails", slug: "nails", image: nailsImg, count: "85+ pros" },
  { name: "Massage", slug: "massage", image: massageImg, count: "60+ pros" },
  { name: "Tattoo", slug: "tattoo", image: tattooImg, count: "45+ pros" },
  { name: "Salons", slug: "salons", image: salonsImg, count: "190+ pros" },
];

const standardHours = [
  { day: "Mon", hours: "9:00 – 19:00" },
  { day: "Tue", hours: "9:00 – 19:00" },
  { day: "Wed", hours: "9:00 – 19:00" },
  { day: "Thu", hours: "9:00 – 20:00" },
  { day: "Fri", hours: "9:00 – 20:00" },
  { day: "Sat", hours: "10:00 – 18:00" },
  { day: "Sun", hours: "Closed" },
];

export const providers: Provider[] = [
  {
    id: "amani-braids",
    name: "Amani Braids Studio",
    category: "Salon",
    categorySlug: "salons",
    rating: 4.9,
    reviews: 218,
    distanceKm: 1.2,
    priceRange: "Ksh 1,500 – 6,000",
    image: provider1,
    gallery: [provider1, provider3, provider6],
    verified: true,
    open: true,
    location: "Westlands, Nairobi",
    address: "Mpaka Road, Westlands, Nairobi",
    about:
      "Specialists in protective styles, braids and natural hair care. Premium products, gentle hands, and zero rush.",
    phone: "+254 712 345 678",
    whatsapp: "+254 712 345 678",
    lat: -1.2676,
    lng: 36.8108,
    services: [
      { name: "Knotless Braids", duration: "4 hr", price: "Ksh 4,500" },
      { name: "Cornrows", duration: "1.5 hr", price: "Ksh 1,500" },
      { name: "Silk Press", duration: "2 hr", price: "Ksh 3,000" },
      { name: "Deep Conditioning", duration: "45 min", price: "Ksh 1,800" },
    ],
    hours: standardHours,
  },
  {
    id: "kevs-cuts",
    name: "Kev's Cuts Barbershop",
    category: "Barber",
    categorySlug: "barbers",
    rating: 4.8,
    reviews: 412,
    distanceKm: 2.4,
    priceRange: "Ksh 500 – 1,800",
    image: provider2,
    gallery: [provider2, provider5],
    verified: true,
    open: true,
    location: "Kilimani, Nairobi",
    address: "Argwings Kodhek Rd, Kilimani",
    about:
      "Classic and modern fades, beard sculpting, and hot-towel finishes. Walk-ins welcome but bookings get priority.",
    phone: "+254 722 111 222",
    whatsapp: "+254 722 111 222",
    lat: -1.2921,
    lng: 36.7836,
    services: [
      { name: "Signature Cut", duration: "45 min", price: "Ksh 800" },
      { name: "Beard Trim", duration: "20 min", price: "Ksh 500" },
      { name: "Cut + Beard", duration: "1 hr", price: "Ksh 1,200" },
      { name: "Kids Cut", duration: "30 min", price: "Ksh 600" },
    ],
    hours: standardHours,
  },
  {
    id: "nlbb-nails",
    name: "NLBB Nail Bar",
    category: "Nails",
    categorySlug: "nails",
    rating: 4.9,
    reviews: 156,
    distanceKm: 0.8,
    priceRange: "Ksh 1,000 – 3,500",
    image: provider3,
    gallery: [provider3, provider1],
    verified: true,
    open: true,
    location: "Lavington, Nairobi",
    address: "Lavington Mall, Nairobi",
    about:
      "Gel, acrylic, and BIAB specialists. Sterilised tools, premium polishes, and nail art that lasts.",
    phone: "+254 733 555 444",
    whatsapp: "+254 733 555 444",
    lat: -1.2806,
    lng: 36.7707,
    services: [
      { name: "Gel Manicure", duration: "1 hr", price: "Ksh 1,500" },
      { name: "Acrylic Full Set", duration: "2 hr", price: "Ksh 3,000" },
      { name: "Pedicure Spa", duration: "1.5 hr", price: "Ksh 2,000" },
      { name: "Nail Art", duration: "30 min", price: "Ksh 800" },
    ],
    hours: standardHours,
  },
  {
    id: "serene-spa",
    name: "Serene Spa & Massage",
    category: "Massage",
    categorySlug: "massage",
    rating: 4.7,
    reviews: 302,
    distanceKm: 3.1,
    priceRange: "Ksh 2,500 – 8,000",
    image: provider4,
    gallery: [provider4],
    verified: true,
    open: false,
    location: "Karen, Nairobi",
    address: "Karen Road, Nairobi",
    about:
      "Therapeutic and relaxation massage in a calm, private setting. Couples rooms available on request.",
    phone: "+254 700 888 999",
    whatsapp: "+254 700 888 999",
    lat: -1.319,
    lng: 36.7062,
    services: [
      { name: "Swedish Massage", duration: "1 hr", price: "Ksh 3,500" },
      { name: "Deep Tissue", duration: "1 hr", price: "Ksh 4,500" },
      { name: "Aromatherapy", duration: "1.5 hr", price: "Ksh 5,500" },
      { name: "Hot Stone", duration: "1.5 hr", price: "Ksh 6,500" },
    ],
    hours: standardHours,
  },
  {
    id: "ink-iron",
    name: "Ink & Iron Tattoo",
    category: "Tattoo",
    categorySlug: "tattoo",
    rating: 4.9,
    reviews: 187,
    distanceKm: 4.2,
    priceRange: "Ksh 3,000 – 25,000",
    image: provider5,
    gallery: [provider5, provider2],
    verified: true,
    open: true,
    location: "Ngong Road, Nairobi",
    address: "Ngong Road, Adams Arcade",
    about:
      "Custom black-and-grey, fine line, and traditional work. Sterile studio, single-use needles, free consults.",
    phone: "+254 711 222 333",
    whatsapp: "+254 711 222 333",
    lat: -1.3003,
    lng: 36.7689,
    services: [
      { name: "Small Tattoo (consult)", duration: "1 hr", price: "From Ksh 3,000" },
      { name: "Half-Sleeve", duration: "4 hr", price: "From Ksh 15,000" },
      { name: "Touch-up", duration: "30 min", price: "Ksh 2,000" },
      { name: "Free Consultation", duration: "20 min", price: "Free" },
    ],
    hours: standardHours,
  },
  {
    id: "maison-hair",
    name: "Maison Hair Atelier",
    category: "Salon",
    categorySlug: "salons",
    rating: 4.8,
    reviews: 264,
    distanceKm: 1.9,
    priceRange: "Ksh 2,000 – 9,500",
    image: provider6,
    gallery: [provider6, provider1, provider3],
    verified: true,
    open: true,
    location: "Riverside, Nairobi",
    address: "Riverside Drive, Nairobi",
    about:
      "Full-service salon: colour, cuts, treatments, and bridal styling. Senior stylists with 8+ years experience.",
    phone: "+254 798 654 321",
    whatsapp: "+254 798 654 321",
    lat: -1.2685,
    lng: 36.8019,
    services: [
      { name: "Cut & Style", duration: "1 hr", price: "Ksh 2,500" },
      { name: "Full Colour", duration: "3 hr", price: "Ksh 7,500" },
      { name: "Highlights", duration: "3.5 hr", price: "Ksh 9,500" },
      { name: "Bridal Trial", duration: "2 hr", price: "Ksh 6,000" },
    ],
    hours: standardHours,
  },
];

// Backwards compatibility for existing imports
export const featuredProviders = providers;

export function getProviderById(id: string): Provider | undefined {
  return providers.find((p) => p.id === id);
}

export function getProvidersByCategory(slug: string): Provider[] {
  return providers.filter((p) => p.categorySlug === slug);
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
