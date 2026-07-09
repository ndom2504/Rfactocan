import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@rfacto.ca" },
    update: {},
    create: {
      email: "admin@rfacto.ca",
      passwordHash,
      displayName: "Admin Rfacto",
      role: "ADMIN",
      status: "ACTIVE",
      verifiedAt: new Date(),
      country: "Canada",
      bio: "Administrateur de la plateforme Rfacto.",
    },
  });

  const traveler = await prisma.user.upsert({
    where: { email: "voyageur@rfacto.ca" },
    update: {},
    create: {
      email: "voyageur@rfacto.ca",
      passwordHash,
      displayName: "Amina N.",
      role: "TRAVELER",
      status: "ACTIVE",
      verifiedAt: new Date(),
      country: "Canada",
      bio: "Voyage régulièrement Montréal → Libreville.",
      ratingAvg: 4.8,
      ratingCount: 12,
    },
  });

  const sender = await prisma.user.upsert({
    where: { email: "expediteur@rfacto.ca" },
    update: {},
    create: {
      email: "expediteur@rfacto.ca",
      passwordHash,
      displayName: "Marc D.",
      role: "SENDER",
      status: "ACTIVE",
      verifiedAt: new Date(),
      country: "Canada",
      bio: "Envoie des colis familiaux vers le Gabon.",
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
      description: "Documents et vêtements pour la famille. Urgent mais flexible ±3 jours.",
      photosJson: "[]",
      urgency: "HIGH",
      declaredValue: 150,
      maxPricePerKg: 20,
      desiredDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 18),
      status: "OPEN",
    },
  });

  console.log("Seed OK");
  console.log({
    admin: admin.email,
    traveler: traveler.email,
    sender: sender.email,
    password: "password123",
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
