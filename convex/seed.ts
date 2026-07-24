import { internalMutation, mutation } from "./_generated/server";
// seedDummyUsers is a public mutation so it appears in the Convex dashboard
import { getCurrentUser } from "./users";

// Run once to seed countries_to_regions data (admin only)
export const seedCountries = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUser(ctx);
    if (!me) throw new Error("Not authenticated");
    // Admin-only guard
    const adminIds = (process.env.ADMIN_CLERK_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean);
    if (adminIds.length === 0 || !adminIds.includes(me.clerkId)) {
      throw new Error("Forbidden: admin access required");
    }
    // Check if already seeded
    const existing = await ctx.db.query("countries_to_regions").first();
    if (existing) return { message: "Already seeded" };

    const countries = [
      { countryCode: "US", countryName: "United States", region: "north-america" },
      { countryCode: "CA", countryName: "Canada", region: "north-america" },
      { countryCode: "MX", countryName: "Mexico", region: "latin-america" },
      { countryCode: "GB", countryName: "United Kingdom", region: "europe" },
      { countryCode: "DE", countryName: "Germany", region: "europe" },
      { countryCode: "FR", countryName: "France", region: "europe" },
      { countryCode: "NL", countryName: "Netherlands", region: "europe" },
      { countryCode: "SE", countryName: "Sweden", region: "europe" },
      { countryCode: "PL", countryName: "Poland", region: "europe" },
      { countryCode: "ES", countryName: "Spain", region: "europe" },
      { countryCode: "IT", countryName: "Italy", region: "europe" },
      { countryCode: "PT", countryName: "Portugal", region: "europe" },
      { countryCode: "CH", countryName: "Switzerland", region: "europe" },
      { countryCode: "AT", countryName: "Austria", region: "europe" },
      { countryCode: "BE", countryName: "Belgium", region: "europe" },
      { countryCode: "NO", countryName: "Norway", region: "europe" },
      { countryCode: "DK", countryName: "Denmark", region: "europe" },
      { countryCode: "FI", countryName: "Finland", region: "europe" },
      { countryCode: "IE", countryName: "Ireland", region: "europe" },
      { countryCode: "CZ", countryName: "Czech Republic", region: "europe" },
      { countryCode: "RO", countryName: "Romania", region: "europe" },
      { countryCode: "HU", countryName: "Hungary", region: "europe" },
      { countryCode: "UA", countryName: "Ukraine", region: "europe" },
      { countryCode: "GR", countryName: "Greece", region: "europe" },
      { countryCode: "IN", countryName: "India", region: "asia" },
      { countryCode: "CN", countryName: "China", region: "asia" },
      { countryCode: "JP", countryName: "Japan", region: "asia" },
      { countryCode: "KR", countryName: "South Korea", region: "asia" },
      { countryCode: "SG", countryName: "Singapore", region: "asia" },
      { countryCode: "TW", countryName: "Taiwan", region: "asia" },
      { countryCode: "HK", countryName: "Hong Kong", region: "asia" },
      { countryCode: "TH", countryName: "Thailand", region: "asia" },
      { countryCode: "VN", countryName: "Vietnam", region: "asia" },
      { countryCode: "PH", countryName: "Philippines", region: "asia" },
      { countryCode: "MY", countryName: "Malaysia", region: "asia" },
      { countryCode: "ID", countryName: "Indonesia", region: "asia" },
      { countryCode: "PK", countryName: "Pakistan", region: "asia" },
      { countryCode: "BD", countryName: "Bangladesh", region: "asia" },
      { countryCode: "LK", countryName: "Sri Lanka", region: "asia" },
      { countryCode: "AU", countryName: "Australia", region: "oceania" },
      { countryCode: "NZ", countryName: "New Zealand", region: "oceania" },
      { countryCode: "BR", countryName: "Brazil", region: "latin-america" },
      { countryCode: "AR", countryName: "Argentina", region: "latin-america" },
      { countryCode: "CL", countryName: "Chile", region: "latin-america" },
      { countryCode: "CO", countryName: "Colombia", region: "latin-america" },
      { countryCode: "PE", countryName: "Peru", region: "latin-america" },
      { countryCode: "UY", countryName: "Uruguay", region: "latin-america" },
      { countryCode: "NG", countryName: "Nigeria", region: "africa" },
      { countryCode: "ZA", countryName: "South Africa", region: "africa" },
      { countryCode: "EG", countryName: "Egypt", region: "africa" },
      { countryCode: "KE", countryName: "Kenya", region: "africa" },
      { countryCode: "GH", countryName: "Ghana", region: "africa" },
      { countryCode: "MA", countryName: "Morocco", region: "africa" },
      { countryCode: "TN", countryName: "Tunisia", region: "africa" },
      { countryCode: "ET", countryName: "Ethiopia", region: "africa" },
      { countryCode: "IL", countryName: "Israel", region: "asia" },
      { countryCode: "AE", countryName: "United Arab Emirates", region: "asia" },
      { countryCode: "SA", countryName: "Saudi Arabia", region: "asia" },
      { countryCode: "TR", countryName: "Turkey", region: "europe" },
      { countryCode: "RU", countryName: "Russia", region: "europe" },
    ];

    for (const c of countries) {
      await ctx.db.insert("countries_to_regions", c);
    }
    return { message: `Seeded ${countries.length} countries` };
  },
});

// ─── Dummy user definitions ───────────────────────────────────────────────────

type DummyUser = {
  username: string;
  displayName: string;
  bio: string;
  country: string;
  region: string;
  timezone: string;
};

const DUMMY_INDIAN_USERS: DummyUser[] = [
  { username: "aarav_sharma", displayName: "Aarav Sharma", bio: "Full-stack dev from Mumbai", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "vikram_patel", displayName: "Vikram Patel", bio: "AI enthusiast, Bangalore", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "priya_singh", displayName: "Priya Singh", bio: "ML engineer at a startup", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "rahul_kumar", displayName: "Rahul Kumar", bio: "Building the future with AI", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "ananya_jain", displayName: "Ananya Jain", bio: "Backend engineer, Pune", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "arjun_gupta", displayName: "Arjun Gupta", bio: "DevOps and cloud infra", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "kavya_mehta", displayName: "Kavya Mehta", bio: "Frontend developer, Hyderabad", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "rohan_shah", displayName: "Rohan Shah", bio: "Data scientist from Ahmedabad", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "ishaan_nair", displayName: "Ishaan Nair", bio: "Mobile developer, Kochi", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "sneha_rao", displayName: "Sneha Rao", bio: "Product engineer, Chennai", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "karan_verma", displayName: "Karan Verma", bio: "Open source contributor", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "divya_mishra", displayName: "Divya Mishra", bio: "NLP researcher, IIT Delhi", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "amit_agarwal", displayName: "Amit Agarwal", bio: "SaaS founder, Noida", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "pooja_reddy", displayName: "Pooja Reddy", bio: "UX engineer, Hyderabad", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "nikhil_kapoor", displayName: "Nikhil Kapoor", bio: "Systems programmer, Delhi", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "neha_malhotra", displayName: "Neha Malhotra", bio: "Startup CTO, Gurugram", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "aditya_yadav", displayName: "Aditya Yadav", bio: "Game dev enthusiast, Indore", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "anjali_tiwari", displayName: "Anjali Tiwari", bio: "Fullstack React developer", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "siddharth_pandey", displayName: "Siddharth Pandey", bio: "Security researcher, Jaipur", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "shreya_joshi", displayName: "Shreya Joshi", bio: "Data engineer, Bengaluru", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "ravi_bose", displayName: "Ravi Bose", bio: "Blockchain dev, Kolkata", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "nisha_iyer", displayName: "Nisha Iyer", bio: "Platform engineer, Coimbatore", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "varun_pillai", displayName: "Varun Pillai", bio: "Cloud architect, Trivandrum", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "simran_kaur", displayName: "Simran Kaur", bio: "AI researcher, Chandigarh", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "akash_bajaj", displayName: "Akash Bajaj", bio: "Software lead, Lucknow", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "meera_desai", displayName: "Meera Desai", bio: "Product manager turned dev", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "kunal_thakur", displayName: "Kunal Thakur", bio: "Infra engineer, Surat", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "riya_chaudhary", displayName: "Riya Chaudhary", bio: "TypeScript developer", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "manish_khanna", displayName: "Manish Khanna", bio: "Rust enthusiast, Bhopal", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "swati_soni", displayName: "Swati Soni", bio: "DevRel engineer, Bangalore", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "dev_garg", displayName: "Dev Garg", bio: "API platform developer", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "pallavi_dubey", displayName: "Pallavi Dubey", bio: "Tech lead, Nagpur", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "yash_kulkarni", displayName: "Yash Kulkarni", bio: "React Native developer, Pune", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "harsh_jain_dev", displayName: "Harsh Jain", bio: "Open source, Rajasthan", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "tanvi_trivedi", displayName: "Tanvi Trivedi", bio: "ML ops engineer, Vadodara", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "raj_patel_dev", displayName: "Raj Patel", bio: "E-commerce tech, Ahmedabad", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "asha_krishnan", displayName: "Asha Krishnan", bio: "Systems architect, Chennai", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "abhishek_shukla", displayName: "Abhishek Shukla", bio: "Platform dev, Kanpur", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "komal_choudhury", displayName: "Komal Choudhury", bio: "AI developer, Patna", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "gaurav_rastogi", displayName: "Gaurav Rastogi", bio: "Backend Go developer", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "preeti_srivastava", displayName: "Preeti Srivastava", bio: "Data analyst, Allahabad", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "vivek_dixit", displayName: "Vivek Dixit", bio: "Site reliability engineer", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "hina_shukla", displayName: "Hina Shukla", bio: "Product engineer, Agra", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "ajay_bhatt_dev", displayName: "Ajay Bhatt", bio: "Firmware and embedded systems", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "shweta_goel", displayName: "Shweta Goel", bio: "Full-stack, Faridabad", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "rakesh_arora", displayName: "Rakesh Arora", bio: "Tech entrepreneur, Amritsar", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "deepika_mitra", displayName: "Deepika Mitra", bio: "Data scientist, Kolkata", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "suresh_sahoo", displayName: "Suresh Sahoo", bio: "Platform architect, Bhubaneswar", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "puja_bhat", displayName: "Puja Bhat", bio: "Developer advocate, Mangalore", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
  { username: "sanjay_menon", displayName: "Sanjay Menon", bio: "Cloud engineer, Kochi", country: "IN", region: "asia", timezone: "Asia/Kolkata" },
];

const DUMMY_INTL_USERS: DummyUser[] = [
  // United States (10)
  { username: "james_anderson_us", displayName: "James Anderson", bio: "Software engineer, New York", country: "US", region: "north-america", timezone: "America/New_York" },
  { username: "emma_wilson_us", displayName: "Emma Wilson", bio: "AI researcher, San Francisco", country: "US", region: "north-america", timezone: "America/Los_Angeles" },
  { username: "michael_johnson", displayName: "Michael Johnson", bio: "Full-stack dev, Chicago", country: "US", region: "north-america", timezone: "America/Chicago" },
  { username: "olivia_brown_us", displayName: "Olivia Brown", bio: "Platform engineer, Seattle", country: "US", region: "north-america", timezone: "America/Los_Angeles" },
  { username: "william_davis", displayName: "William Davis", bio: "Backend architect, Austin", country: "US", region: "north-america", timezone: "America/Chicago" },
  { username: "sophia_miller", displayName: "Sophia Miller", bio: "ML engineer, Boston", country: "US", region: "north-america", timezone: "America/New_York" },
  { username: "benjamin_jones", displayName: "Benjamin Jones", bio: "DevOps lead, Denver", country: "US", region: "north-america", timezone: "America/Denver" },
  { username: "charlotte_garcia", displayName: "Charlotte Garcia", bio: "Frontend dev, Miami", country: "US", region: "north-america", timezone: "America/New_York" },
  { username: "mason_martinez", displayName: "Mason Martinez", bio: "Data engineer, Phoenix", country: "US", region: "north-america", timezone: "America/Phoenix" },
  { username: "amelia_rodriguez", displayName: "Amelia Rodriguez", bio: "Product engineer, LA", country: "US", region: "north-america", timezone: "America/Los_Angeles" },
  // United Kingdom (8)
  { username: "oliver_taylor_uk", displayName: "Oliver Taylor", bio: "Backend dev, London", country: "GB", region: "europe", timezone: "Europe/London" },
  { username: "isabelle_thomas", displayName: "Isabelle Thomas", bio: "ML researcher, Manchester", country: "GB", region: "europe", timezone: "Europe/London" },
  { username: "harry_white_uk", displayName: "Harry White", bio: "Platform engineer, Bristol", country: "GB", region: "europe", timezone: "Europe/London" },
  { username: "emily_jackson_uk", displayName: "Emily Jackson", bio: "Data scientist, Edinburgh", country: "GB", region: "europe", timezone: "Europe/London" },
  { username: "george_harris_uk", displayName: "George Harris", bio: "Cloud architect, Birmingham", country: "GB", region: "europe", timezone: "Europe/London" },
  { username: "alice_martin_uk", displayName: "Alice Martin", bio: "AI dev, Leeds", country: "GB", region: "europe", timezone: "Europe/London" },
  { username: "charlie_thompson", displayName: "Charlie Thompson", bio: "Systems programmer, Oxford", country: "GB", region: "europe", timezone: "Europe/London" },
  { username: "grace_robinson_uk", displayName: "Grace Robinson", bio: "Product engineer, Cambridge", country: "GB", region: "europe", timezone: "Europe/London" },
  // Germany (7)
  { username: "lukas_mueller", displayName: "Lukas Müller", bio: "Backend engineer, Berlin", country: "DE", region: "europe", timezone: "Europe/Berlin" },
  { username: "anna_schmidt", displayName: "Anna Schmidt", bio: "ML researcher, Munich", country: "DE", region: "europe", timezone: "Europe/Berlin" },
  { username: "felix_becker", displayName: "Felix Becker", bio: "Systems dev, Hamburg", country: "DE", region: "europe", timezone: "Europe/Berlin" },
  { username: "marie_schneider", displayName: "Marie Schneider", bio: "Data engineer, Frankfurt", country: "DE", region: "europe", timezone: "Europe/Berlin" },
  { username: "max_braun_de", displayName: "Max Braun", bio: "Cloud architect, Cologne", country: "DE", region: "europe", timezone: "Europe/Berlin" },
  { username: "lena_wagner", displayName: "Lena Wagner", bio: "AI developer, Stuttgart", country: "DE", region: "europe", timezone: "Europe/Berlin" },
  { username: "thomas_hofmann", displayName: "Thomas Hofmann", bio: "Platform engineer, Düsseldorf", country: "DE", region: "europe", timezone: "Europe/Berlin" },
  // Japan (5)
  { username: "yuki_tanaka", displayName: "Yuki Tanaka", bio: "Software dev, Tokyo", country: "JP", region: "asia", timezone: "Asia/Tokyo" },
  { username: "haruto_suzuki", displayName: "Haruto Suzuki", bio: "AI researcher, Osaka", country: "JP", region: "asia", timezone: "Asia/Tokyo" },
  { username: "sakura_watanabe", displayName: "Sakura Watanabe", bio: "Frontend dev, Kyoto", country: "JP", region: "asia", timezone: "Asia/Tokyo" },
  { username: "ren_ito_jp", displayName: "Ren Ito", bio: "Backend engineer, Yokohama", country: "JP", region: "asia", timezone: "Asia/Tokyo" },
  { username: "aoi_yamamoto", displayName: "Aoi Yamamoto", bio: "Data scientist, Nagoya", country: "JP", region: "asia", timezone: "Asia/Tokyo" },
  // Brazil (5)
  { username: "pedro_silva_br", displayName: "Pedro Silva", bio: "Full-stack dev, São Paulo", country: "BR", region: "latin-america", timezone: "America/Sao_Paulo" },
  { username: "ana_santos_br", displayName: "Ana Santos", bio: "AI engineer, Rio de Janeiro", country: "BR", region: "latin-america", timezone: "America/Sao_Paulo" },
  { username: "lucas_oliveira", displayName: "Lucas Oliveira", bio: "Backend dev, Belo Horizonte", country: "BR", region: "latin-america", timezone: "America/Sao_Paulo" },
  { username: "julia_ferreira", displayName: "Julia Ferreira", bio: "Data engineer, Curitiba", country: "BR", region: "latin-america", timezone: "America/Sao_Paulo" },
  { username: "gabriel_alves_br", displayName: "Gabriel Alves", bio: "Cloud architect, Porto Alegre", country: "BR", region: "latin-america", timezone: "America/Sao_Paulo" },
  // Australia (5)
  { username: "liam_cooper_au", displayName: "Liam Cooper", bio: "Platform engineer, Sydney", country: "AU", region: "oceania", timezone: "Australia/Sydney" },
  { username: "chloe_mitchell", displayName: "Chloe Mitchell", bio: "ML developer, Melbourne", country: "AU", region: "oceania", timezone: "Australia/Melbourne" },
  { username: "noah_campbell_au", displayName: "Noah Campbell", bio: "Systems dev, Brisbane", country: "AU", region: "oceania", timezone: "Australia/Brisbane" },
  { username: "mia_williams_au", displayName: "Mia Williams", bio: "AI researcher, Perth", country: "AU", region: "oceania", timezone: "Australia/Perth" },
  { username: "jackson_wright", displayName: "Jackson Wright", bio: "Data engineer, Adelaide", country: "AU", region: "oceania", timezone: "Australia/Adelaide" },
  // Canada (5)
  { username: "ethan_macdonald", displayName: "Ethan MacDonald", bio: "Backend dev, Toronto", country: "CA", region: "north-america", timezone: "America/Toronto" },
  { username: "ava_graham_ca", displayName: "Ava Graham", bio: "ML engineer, Vancouver", country: "CA", region: "north-america", timezone: "America/Vancouver" },
  { username: "logan_scott_ca", displayName: "Logan Scott", bio: "Cloud dev, Montreal", country: "CA", region: "north-america", timezone: "America/Toronto" },
  { username: "lily_hall_ca", displayName: "Lily Hall", bio: "AI researcher, Calgary", country: "CA", region: "north-america", timezone: "America/Edmonton" },
  { username: "ryan_turner_ca", displayName: "Ryan Turner", bio: "DevOps engineer, Ottawa", country: "CA", region: "north-america", timezone: "America/Toronto" },
  // France (5)
  { username: "pierre_martin_fr", displayName: "Pierre Martin", bio: "Backend dev, Paris", country: "FR", region: "europe", timezone: "Europe/Paris" },
  { username: "claire_bernard", displayName: "Claire Bernard", bio: "AI researcher, Lyon", country: "FR", region: "europe", timezone: "Europe/Paris" },
  { username: "julien_dubois", displayName: "Julien Dubois", bio: "Platform engineer, Marseille", country: "FR", region: "europe", timezone: "Europe/Paris" },
  { username: "marie_leroy_fr", displayName: "Marie Leroy", bio: "Data scientist, Toulouse", country: "FR", region: "europe", timezone: "Europe/Paris" },
  { username: "baptiste_moreau", displayName: "Baptiste Moreau", bio: "Systems dev, Bordeaux", country: "FR", region: "europe", timezone: "Europe/Paris" },
];

const ALL_DUMMY_USERS = [...DUMMY_INDIAN_USERS, ...DUMMY_INTL_USERS];

const PROVIDERS = ["claude", "codex", "gemini", "antigravity", "cursor"] as const;
const AVATAR_COLORS = ["6366f1","f59e0b","10b981","ef4444","3b82f6","8b5cf6","ec4899","14b8a6","f97316","84cc16","0ea5e9","a855f7","e11d48","16a34a","b45309"];
const SOURCES = ["cli", "web"] as const;
const MODELS = [
  ["claude-sonnet-4-6"],
  ["claude-opus-4-8"],
  ["gpt-4o"],
  ["gemini-1.5-pro"],
  ["cursor-gpt4"],
];

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed + Date.now() / 1e9) * 10000;
  return x - Math.floor(x);
}

// ─── Seed 100 dummy users (visible + callable from Convex dashboard) ─────────
export const seedDummyUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();
    const alreadySeeded = allUsers.filter((u) => u.referralSource === "dummy_seed");
    if (alreadySeeded.length >= 100) {
      return { message: `Already seeded (${alreadySeeded.length} dummy users exist)` };
    }

    const today = todayStr();
    let created = 0;

    for (let i = 0; i < ALL_DUMMY_USERS.length; i++) {
      const u = ALL_DUMMY_USERS[i];
      // Skip if username already exists
      const existing = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", u.username))
        .first();
      if (existing) continue;

      const provider = PROVIDERS[i % PROVIDERS.length];
      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName)}&background=${AVATAR_COLORS[i % AVATAR_COLORS.length]}&color=fff&size=128&bold=true&rounded=false`;
      const userId = await ctx.db.insert("users", {
        clerkId: `dummy_${u.username}`,
        username: u.username,
        displayName: u.displayName,
        bio: u.bio,
        avatarUrl,
        country: u.country,
        region: u.region,
        timezone: u.timezone,
        isPublic: true,
        defaultAiProvider: provider,
        emailNotificationsEnabled: false,
        referralSource: "dummy_seed",
      });

      // Seed initial usage for today
      const r = seededRandom(i);
      const inputTokens = Math.floor(r * 80000 + 10000);
      const outputTokens = Math.floor(r * 30000 + 2000);
      const costUsd = inputTokens * 0.000003 + outputTokens * 0.000015;

      await ctx.db.insert("daily_usage", {
        userId,
        date: today,
        provider,
        costUsd,
        inputTokens,
        outputTokens,
        cacheCreationTokens: Math.floor(r * 8000),
        cacheReadTokens: Math.floor(r * 15000),
        models: MODELS[i % MODELS.length],
        source: SOURCES[i % 2],
      });

      created++;
    }

    return { message: `Created ${created} dummy users with initial usage` };
  },
});

// ─── Backfill avatars for already-created dummy users ────────────────────────
export const patchDummyUserAvatars = mutation({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();
    const dummyUsers = allUsers.filter((u) => u.referralSource === "dummy_seed");
    let patched = 0;
    for (let i = 0; i < dummyUsers.length; i++) {
      const user = dummyUsers[i];
      const name = encodeURIComponent(user.displayName ?? user.username);
      const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
      const avatarUrl = `https://ui-avatars.com/api/?name=${name}&background=${color}&color=fff&size=128&bold=true&rounded=false`;
      await ctx.db.patch(user._id, { avatarUrl });
      patched++;
    }
    return { message: `Patched ${patched} dummy users with avatars` };
  },
});

// ─── Internal: update dummy user usage every 6 hours (called by cron) ────────
export const updateDummyUsersUsage = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();
    const dummyUsers = allUsers.filter((u) => u.referralSource === "dummy_seed");
    if (dummyUsers.length === 0) return { updated: 0 };

    const today = todayStr();

    for (let i = 0; i < dummyUsers.length; i++) {
      const user = dummyUsers[i];
      const r = Math.random();
      const provider = PROVIDERS[Math.floor(r * PROVIDERS.length)];
      const source = SOURCES[Math.floor(r * 2) as 0 | 1];

      const inputTokens = Math.floor(r * 40000 + 2000);
      const outputTokens = Math.floor(r * 15000 + 500);
      const cacheCreationTokens = Math.floor(r * 4000);
      const cacheReadTokens = Math.floor(r * 8000);
      const addedCost = inputTokens * 0.000003 + outputTokens * 0.000015;

      const existing = await ctx.db
        .query("daily_usage")
        .withIndex("by_user_date_provider_source", (q) =>
          q
            .eq("userId", user._id)
            .eq("date", today)
            .eq("provider", provider)
            .eq("source", source)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          costUsd: existing.costUsd + addedCost,
          inputTokens: existing.inputTokens + inputTokens,
          outputTokens: existing.outputTokens + outputTokens,
          cacheCreationTokens: existing.cacheCreationTokens + cacheCreationTokens,
          cacheReadTokens: existing.cacheReadTokens + cacheReadTokens,
        });
      } else {
        await ctx.db.insert("daily_usage", {
          userId: user._id,
          date: today,
          provider,
          costUsd: addedCost,
          inputTokens,
          outputTokens,
          cacheCreationTokens,
          cacheReadTokens,
          models: MODELS[i % MODELS.length],
          source,
        });
      }
    }

    return { updated: dummyUsers.length };
  },
});
