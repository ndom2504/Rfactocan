import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { buildGeoSeed } from "../lib/geo";

const prisma = new PrismaClient();

async function seedGeo() {
  const { currencies, languages, countries } = buildGeoSeed();

  for (const lang of languages) {
    await prisma.language.upsert({
      where: { code: lang.code },
      update: { name: lang.name, active: true },
      create: { code: lang.code, name: lang.name, active: true },
    });
  }

  for (const cur of currencies) {
    await prisma.currency.upsert({
      where: { code: cur.code },
      update: {
        name: cur.name,
        symbol: cur.symbol,
        exchangeRate: cur.exchangeRate,
        active: true,
      },
      create: {
        code: cur.code,
        name: cur.name,
        symbol: cur.symbol,
        exchangeRate: cur.exchangeRate,
        active: true,
      },
    });
  }

  for (const country of countries) {
    await prisma.country.upsert({
      where: { code: country.code },
      update: {
        name: country.name,
        continent: country.continent,
        flagEmoji: country.flagEmoji,
        currencyCode: country.currencyCode,
        active: true,
      },
      create: {
        code: country.code,
        name: country.name,
        continent: country.continent,
        flagEmoji: country.flagEmoji,
        currencyCode: country.currencyCode,
        active: true,
      },
    });

    for (const cityName of country.cities) {
      await prisma.city.upsert({
        where: {
          countryCode_name: {
            countryCode: country.code,
            name: cityName,
          },
        },
        update: { active: true },
        create: {
          countryCode: country.code,
          name: cityName,
          active: true,
        },
      });
    }
  }
}

async function main() {
  await seedGeo();

  const demoPasswordHash = await bcrypt.hash("password123", 10);
  const adminEmail = (
    process.env.ADMIN_EMAIL?.trim() || "admin@rfacto.ca"
  ).toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD?.trim() || "password123";
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      status: "ACTIVE",
      verifiedAt: new Date(),
    },
    create: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      displayName: "Admin Rfacto",
      role: "ADMIN",
      status: "ACTIVE",
      verifiedAt: new Date(),
      country: "Canada",
      language: "fr",
      preferredCurrency: "CAD",
      bio: "Administrateur de la plateforme Rfacto.",
    },
  });

  const traveler = await prisma.user.upsert({
    where: { email: "voyageur@rfacto.ca" },
    update: {
      kycStatus: "VERIFIED",
      kycVerifiedAt: new Date(),
      verifiedAt: new Date(),
      role: "BOTH",
      completedDeliveries: 12,
    },
    create: {
      email: "voyageur@rfacto.ca",
      passwordHash: demoPasswordHash,
      displayName: "Amina N.",
      role: "BOTH",
      status: "ACTIVE",
      verifiedAt: new Date(),
      kycStatus: "VERIFIED",
      kycVerifiedAt: new Date(),
      country: "Canada",
      language: "fr",
      preferredCurrency: "CAD",
      bio: "Voyage régulièrement Montréal → Libreville. Peut aussi envoyer des colis.",
      ratingAvg: 4.8,
      ratingCount: 12,
      completedDeliveries: 12,
    },
  });

  const sender = await prisma.user.upsert({
    where: { email: "expediteur@rfacto.ca" },
    update: { role: "BOTH" },
    create: {
      email: "expediteur@rfacto.ca",
      passwordHash: demoPasswordHash,
      displayName: "Marc D.",
      role: "BOTH",
      status: "ACTIVE",
      verifiedAt: new Date(),
      country: "Canada",
      language: "fr",
      preferredCurrency: "CAD",
      bio: "Envoie des colis familiaux et voyage parfois.",
      ratingAvg: 4.5,
      ratingCount: 6,
    },
  });

  await prisma.trip.deleteMany({ where: { userId: traveler.id } });
  await prisma.parcelRequest.deleteMany({ where: { userId: sender.id } });

  const trip = await prisma.trip.create({
    data: {
      userId: traveler.id,
      fromCountry: "CA",
      fromCity: "Montréal",
      toCountry: "GA",
      toCity: "Libreville",
      departAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20),
      weightKg: 18,
      pricePerKgCad: 18,
      currency: "CAD",
      acceptedGoods: "Vêtements, documents, produits non périssables",
      notes: "Bagage soute disponible, objets fragiles acceptés avec emballage.",
      airline: "Air Canada / Ethiopian",
      flightNumber: "AC123",
      status: "OPEN",
    },
  });

  const request = await prisma.parcelRequest.create({
    data: {
      userId: sender.id,
      fromCountry: "CA",
      fromCity: "Montréal",
      toCountry: "GA",
      toCity: "Libreville",
      weightKg: 5,
      description:
        "Documents et vêtements pour la famille. Urgent mais flexible ±3 jours.",
      photosJson: "[]",
      urgency: "HIGH",
      declaredValue: 150,
      desiredDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 18),
      status: "OPEN",
    },
  });

  const corridors = [
    ["CA", "GA"],
    ["CA", "CM"],
    ["CA", "CI"],
    ["CA", "SN"],
    ["CA", "FR"],
    ["FR", "SN"],
    ["FR", "CI"],
    ["BE", "CD"],
    ["US", "NG"],
    ["US", "GH"],
    ["GB", "KE"],
    ["AE", "IN"],
    ["DE", "TN"],
    ["ZA", "CM"],
    ["MA", "SN"],
  ] as const;

  for (const [fromCountry, toCountry] of corridors) {
    const currency =
      ["FR", "BE", "DE", "ES", "IT", "NL", "PT", "SN", "CI", "CM", "GA", "MA", "TN"].includes(
        toCountry
      ) ||
      ["FR", "BE", "DE"].includes(fromCountry)
        ? "eur"
        : ["US", "NG", "GH", "KE", "AE", "IN", "ZA"].includes(toCountry) ||
            fromCountry === "US"
          ? "usd"
          : "cad";
    await prisma.corridorConfig.upsert({
      where: {
        fromCountry_toCountry: { fromCountry, toCountry },
      },
      update: { active: true, feeBps: 1000, currency },
      create: {
        fromCountry,
        toCountry,
        currency,
        feeBps: 1000,
        active: true,
        paymentProvider: "stripe",
      },
    });
  }

  console.log("Seed OK (geo + demo users)");
  console.log({
    admin: admin.email,
    adminPasswordHint: adminPassword === "password123" ? "password123" : "(ADMIN_PASSWORD)",
    traveler: traveler.email,
    sender: sender.email,
    demoPassword: "password123",
    tripId: trip.id,
    requestId: request.id,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
