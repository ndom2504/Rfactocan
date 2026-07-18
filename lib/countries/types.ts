import type { MoneyCurrency } from "@/lib/currency";
import type { TransportMode } from "@/lib/transport";
import type { PayoutProvider } from "@/lib/user-intent";

/** Catégories de services collaboratifs (vision Rfacto). */
export type ServiceCategory =
  | "colis"
  | "transport"
  | "transitaire"
  | "hotel"
  | "autre";

/** Moyens de paiement / réception activés pour un pays. */
export type CountryPayment =
  | "stripe"
  | "bank"
  | PayoutProvider;

export type CountryFeatures = {
  kycRequired: boolean;
  escrow: boolean;
};

export type CountryConfig = {
  code: string;
  name: string;
  currency: MoneyCurrency;
  cities: string[];
  services: ServiceCategory[];
  payments: CountryPayment[];
  transportModes: TransportMode[];
  /** Nom du groupe WhatsApp public officiel. */
  communityWhatsApp: string;
  features: CountryFeatures;
};

export type CountryConfigInput = Omit<CountryConfig, "features"> & {
  features?: Partial<CountryFeatures>;
};
