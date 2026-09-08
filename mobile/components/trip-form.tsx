import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Chip, ChipRow } from "@/components/chip";
import { CorridorFields } from "@/components/geo-fields";
import { Button, ErrorText, Field, Muted } from "@/components/ui";
import { mediaUrl, uploadFile } from "@/lib/api";
import { IOS_IMAGE_PICKER, prepareImageUpload } from "@/lib/prepare-image";
import {
  CURRENCY_OPTIONS,
  resolveCheckoutCurrency,
  type MoneyCurrency,
} from "@/lib/currency";
import { useI18n } from "@/lib/i18n";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";
import {
  TRANSPORT_MODES,
  defaultTransportType,
  maxWeightForMode,
  normalizeTransportMode,
  normalizeTransportType,
  transportTypesForMode,
  type TransportMode,
} from "@/lib/transport";
import {
  loadUserIntent,
  saveUserIntent,
  type CarrierType,
} from "@/lib/user-intent";
import {
  encodeNotesWithCommercial,
  encodeNotesWithVehicle,
  parseCarrierFromNotes,
  type CommercialDetails,
  type VehicleDetails,
} from "@/lib/vehicle-notes";

export type TripFormPayload = {
  fromCountry: string;
  fromCity: string;
  toCountry: string;
  toCity: string;
  departAt: string;
  arriveAt: string;
  weightKg: number;
  pricePerKgCad: number;
  currency: string;
  transportMode: TransportMode;
  transportType: string;
  acceptedGoods: string;
  notes?: string;
  priceNegotiable: boolean;
};

export type TripFormInitial = {
  fromCountry?: string;
  fromCity?: string;
  toCountry?: string;
  toCity?: string;
  departAt?: string;
  arriveAt?: string | null;
  weightKg?: number;
  pricePerKgCad?: number;
  currency?: string;
  transportMode?: string | null;
  transportType?: string | null;
  acceptedGoods?: string;
  notes?: string | null;
  priceNegotiable?: boolean;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function localDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function localTime(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function combineDateAndTime(date: string, time: string): Date | null {
  const d = date.trim();
  const t = (time.trim() || "12:00").slice(0, 5);
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  if (!/^\d{2}:\d{2}$/.test(t)) return null;
  const parsed = new Date(`${d}T${t}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function fromIsoDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : localDate(d);
}

function fromIsoTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : localTime(d);
}

function defaultDepart() {
  const d = new Date(Date.now() + 7 * 86400000);
  d.setHours(10, 0, 0, 0);
  return d;
}

function defaultArrive(depart: Date) {
  const d = new Date(depart.getTime() + 8 * 3600000);
  return d;
}

export function TripForm({
  mode,
  initial,
  submitting,
  onSubmit,
}: {
  mode: "create" | "edit";
  initial?: TripFormInitial;
  submitting: boolean;
  onSubmit: (payload: TripFormPayload) => Promise<void>;
}) {
  const { t, locale } = useI18n();
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const parsed = useMemo(
    () => parseCarrierFromNotes(initial?.notes),
    [initial?.notes]
  );

  const [carrierType, setCarrierType] = useState<CarrierType>(
    parsed.commercial ? "commercial" : "particulier"
  );
  const [transportMode, setTransportMode] = useState<TransportMode>(
    normalizeTransportMode(initial?.transportMode)
  );
  const [transportType, setTransportType] = useState(
    normalizeTransportType(
      normalizeTransportMode(initial?.transportMode),
      initial?.transportType
    )
  );
  const [fromCountry, setFromCountry] = useState(initial?.fromCountry ?? "CA");
  const [fromCity, setFromCity] = useState(initial?.fromCity ?? "Montréal");
  const [toCountry, setToCountry] = useState(initial?.toCountry ?? "GA");
  const [toCity, setToCity] = useState(initial?.toCity ?? "Libreville");
  const departDefault = initial?.departAt
    ? new Date(initial.departAt)
    : defaultDepart();
  const arriveDefault = initial?.arriveAt
    ? new Date(initial.arriveAt)
    : defaultArrive(
        Number.isNaN(departDefault.getTime()) ? defaultDepart() : departDefault
      );
  const [departDate, setDepartDate] = useState(
    initial?.departAt ? fromIsoDate(initial.departAt) : localDate(departDefault)
  );
  const [departTime, setDepartTime] = useState(
    initial?.departAt ? fromIsoTime(initial.departAt) : localTime(departDefault)
  );
  const [arriveDate, setArriveDate] = useState(
    initial?.arriveAt || initial?.departAt
      ? fromIsoDate(initial.arriveAt || initial.departAt)
      : localDate(arriveDefault)
  );
  const [arriveTime, setArriveTime] = useState(
    initial?.arriveAt || initial?.departAt
      ? fromIsoTime(initial.arriveAt || initial.departAt)
      : localTime(arriveDefault)
  );
  const [weightKg, setWeightKg] = useState(
    initial?.weightKg != null ? String(initial.weightKg) : "10"
  );
  const [pricePerKgCad, setPricePerKgCad] = useState(
    initial?.pricePerKgCad != null ? String(initial.pricePerKgCad) : "20"
  );
  const [currency, setCurrency] = useState<MoneyCurrency>(
    (["CAD", "USD", "EUR", "XOF", "XAF"] as const).includes(
      (initial?.currency as MoneyCurrency) ?? "CAD"
    )
      ? ((initial?.currency as MoneyCurrency) ??
        resolveCheckoutCurrency(fromCountry, toCountry))
      : resolveCheckoutCurrency(fromCountry, toCountry)
  );
  const [priceNegotiable, setPriceNegotiable] = useState(
    Boolean(initial?.priceNegotiable)
  );
  const [acceptedGoods, setAcceptedGoods] = useState(
    initial?.acceptedGoods ?? t("goods_placeholder")
  );
  const [notes, setNotes] = useState(parsed.userNotes);
  const [vehiclePlate, setVehiclePlate] = useState(parsed.vehicle?.plate ?? "");
  const [vehicleLicense, setVehicleLicense] = useState(
    parsed.vehicle?.licenseNumber ?? ""
  );
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState<string | null>(
    parsed.vehicle?.photoUrl || null
  );
  const [companyName, setCompanyName] = useState(parsed.commercial?.company ?? "");
  const [companyMatricule, setCompanyMatricule] = useState(
    parsed.commercial?.matricule ?? ""
  );
  const [companyInsurance, setCompanyInsurance] = useState(
    parsed.commercial?.insurance ?? ""
  );
  const [companyBase, setCompanyBase] = useState(parsed.commercial?.base ?? "");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const needsVehicle = carrierType === "particulier" && transportMode === "ROAD";
  const needsCommercial = carrierType === "commercial";
  const typeOptions = transportTypesForMode(transportMode);
  const maxKg = maxWeightForMode(transportMode);

  useEffect(() => {
    if (mode !== "create") return;
    void loadUserIntent().then((prefs) => setCarrierType(prefs.carrierType));
  }, [mode]);

  useEffect(() => {
    setCurrency(resolveCheckoutCurrency(fromCountry, toCountry));
  }, [fromCountry, toCountry]);

  function changeMode(next: TransportMode) {
    setTransportMode(next);
    setTransportType(defaultTransportType(next));
  }

  async function pickVehiclePhoto() {
    setError("");
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError(t("vehicle_photo_denied"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync(IOS_IMAGE_PICKER);
    if (result.canceled) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const uploaded = await uploadFile(
        "/api/upload",
        await prepareImageUpload({
          ...asset,
          fileName: asset.fileName || `vehicle-${Date.now()}.jpg`,
        })
      );
      setVehiclePhotoUrl(uploaded.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    setError("");
    const from = fromCountry.trim().toUpperCase();
    const to = toCountry.trim().toUpperCase();
    if (!from || !to) {
      setError(t("trip_need_countries"));
      return;
    }
    if (!fromCity.trim() || !toCity.trim()) {
      setError(t("trip_need_cities"));
      return;
    }
    const departAt = combineDateAndTime(departDate, departTime);
    const arriveAt = combineDateAndTime(arriveDate, arriveTime);
    if (!departAt) {
      setError(t("trip_need_depart"));
      return;
    }
    if (!arriveAt) {
      setError(t("trip_need_arrive"));
      return;
    }
    if (arriveAt.getTime() < departAt.getTime()) {
      setError(t("trip_arrive_after"));
      return;
    }
    const weight = Number(weightKg.replace(",", "."));
    if (!Number.isFinite(weight) || weight <= 0) {
      setError(t("trip_need_weight"));
      return;
    }
    if (weight > maxKg) {
      setError(t("trip_weight_max").replace("{max}", String(maxKg)));
      return;
    }
    const price = Number(pricePerKgCad.replace(",", "."));
    if (!Number.isFinite(price) || price <= 0) {
      setError(t("trip_need_price"));
      return;
    }
    if (acceptedGoods.trim().length < 2) {
      setError(t("trip_need_goods"));
      return;
    }

    if (needsVehicle) {
      if (!vehiclePlate.trim() || !vehicleLicense.trim() || !vehiclePhotoUrl) {
        setError(t("vehicle_required"));
        return;
      }
    }
    if (needsCommercial) {
      if (!companyName.trim() || !companyMatricule.trim() || !companyBase.trim()) {
        setError(t("commercial_required"));
        return;
      }
    }

    await saveUserIntent({ carrierType });

    const vehicle: VehicleDetails | null = needsVehicle
      ? {
          plate: vehiclePlate,
          licenseNumber: vehicleLicense,
          photoUrl: vehiclePhotoUrl!,
        }
      : null;
    const commercial: CommercialDetails | null = needsCommercial
      ? {
          company: companyName,
          matricule: companyMatricule,
          insurance: companyInsurance,
          base: companyBase,
        }
      : null;

    let encoded = encodeNotesWithVehicle(notes, vehicle);
    encoded = encodeNotesWithCommercial(encoded, commercial);

    await onSubmit({
      fromCountry: from,
      fromCity: fromCity.trim(),
      toCountry: to,
      toCity: toCity.trim(),
      departAt: departAt.toISOString(),
      arriveAt: arriveAt.toISOString(),
      weightKg: weight,
      pricePerKgCad: price,
      currency,
      transportMode,
      transportType,
      acceptedGoods: acceptedGoods.trim(),
      notes: encoded,
      priceNegotiable,
    });
  }

  return (
    <View>
      <Text
        style={{
          color: colors.foreground,
          fontWeight: "600",
          marginTop: 8,
          marginBottom: 6,
        }}
      >
        {t("carrier_type")}
      </Text>
      <Muted>{t("carrier_hint")}</Muted>
      <ChipRow>
        <Chip
          label={t("carrier_particulier")}
          selected={carrierType === "particulier"}
          onPress={() => setCarrierType("particulier")}
        />
        <Chip
          label={t("carrier_commercial")}
          selected={carrierType === "commercial"}
          onPress={() => setCarrierType("commercial")}
        />
      </ChipRow>

      <Text
        style={{
          color: colors.foreground,
          fontWeight: "600",
          marginTop: 8,
          marginBottom: 6,
        }}
      >
        {t("transport_mode")}
      </Text>
      <ChipRow>
        {TRANSPORT_MODES.map((m) => (
          <Chip
            key={m.code}
            label={locale === "en" ? m.labelEn : m.labelFr}
            selected={transportMode === m.code}
            onPress={() => changeMode(m.code)}
          />
        ))}
      </ChipRow>
      <ChipRow>
        {typeOptions.map((opt) => (
          <Chip
            key={opt.code}
            label={locale === "en" ? opt.labelEn : opt.labelFr}
            selected={transportType === opt.code}
            onPress={() => setTransportType(opt.code)}
          />
        ))}
      </ChipRow>

      {needsVehicle ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>
            {t("vehicle_section")}
          </Text>
          <Muted>{t("vehicle_section_hint")}</Muted>
          <Field
            label={t("vehicle_plate")}
            value={vehiclePlate}
            onChangeText={setVehiclePlate}
            autoCapitalize="characters"
          />
          <Field
            label={t("vehicle_license")}
            value={vehicleLicense}
            onChangeText={setVehicleLicense}
            autoCapitalize="characters"
          />
          <Button
            label={
              uploading
                ? t("uploading")
                : vehiclePhotoUrl
                  ? t("change_photo")
                  : t("vehicle_photo")
            }
            variant="outline"
            onPress={() => void pickVehiclePhoto()}
            loading={uploading}
          />
          {vehiclePhotoUrl ? (
            <View style={{ marginTop: 8, marginBottom: 8 }}>
              <Image
                source={{ uri: mediaUrl(vehiclePhotoUrl) }}
                style={{ width: "100%", height: 140, borderRadius: 10 }}
              />
              <Pressable onPress={() => setVehiclePhotoUrl(null)} style={{ marginTop: 8 }}>
                <Text style={{ color: colors.danger, fontWeight: "700" }}>
                  {t("remove_photo")}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      {needsCommercial ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: colors.foreground, fontWeight: "700", marginBottom: 6 }}>
            {t("commercial_section")}
          </Text>
          <Field
            label={t("commercial_company")}
            value={companyName}
            onChangeText={setCompanyName}
          />
          <Field
            label={t("commercial_matricule")}
            value={companyMatricule}
            onChangeText={setCompanyMatricule}
          />
          <Field
            label={`${t("commercial_insurance")} (${t("optional")})`}
            value={companyInsurance}
            onChangeText={setCompanyInsurance}
          />
          <Field
            label={t("commercial_base")}
            value={companyBase}
            onChangeText={setCompanyBase}
            placeholder={t("commercial_base_ph")}
          />
        </View>
      ) : null}

      <CorridorFields
        fromCountry={fromCountry}
        fromCity={fromCity}
        toCountry={toCountry}
        toCity={toCity}
        onFromCountry={setFromCountry}
        onFromCity={setFromCity}
        onToCountry={setToCountry}
        onToCity={setToCity}
      />

      <Field
        label={t("departure_date")}
        value={departDate}
        onChangeText={setDepartDate}
        placeholder="AAAA-MM-JJ"
        autoCapitalize="none"
      />
      <Field
        label={t("departure_time")}
        value={departTime}
        onChangeText={setDepartTime}
        placeholder="HH:mm"
        autoCapitalize="none"
      />
      <Field
        label={t("arrival_date")}
        value={arriveDate}
        onChangeText={setArriveDate}
        placeholder="AAAA-MM-JJ"
        autoCapitalize="none"
      />
      <Field
        label={t("arrival_time")}
        value={arriveTime}
        onChangeText={setArriveTime}
        placeholder="HH:mm"
        autoCapitalize="none"
      />

      <Field
        label={t("weight_available")}
        keyboardType="decimal-pad"
        value={weightKg}
        onChangeText={setWeightKg}
      />
      <Muted>
        {t("trip_weight_max").replace("{max}", String(maxKg))}
      </Muted>
      <Field
        label={t("price_per_kg")}
        keyboardType="decimal-pad"
        value={pricePerKgCad}
        onChangeText={setPricePerKgCad}
      />
      <Text
        style={{
          color: colors.foreground,
          fontWeight: "600",
          marginTop: 8,
          marginBottom: 6,
        }}
      >
        {t("currency")}
      </Text>
      <ChipRow>
        {CURRENCY_OPTIONS.map((code) => (
          <Chip
            key={code}
            label={code}
            selected={currency === code}
            onPress={() => setCurrency(code)}
          />
        ))}
      </ChipRow>

      <Text
        style={{
          color: colors.foreground,
          fontWeight: "600",
          marginTop: 8,
          marginBottom: 6,
        }}
      >
        {t("price_policy")}
      </Text>
      <ChipRow>
        <Chip
          label={t("price_fixed")}
          selected={!priceNegotiable}
          onPress={() => setPriceNegotiable(false)}
        />
        <Chip
          label={t("price_negotiable")}
          selected={priceNegotiable}
          onPress={() => setPriceNegotiable(true)}
        />
      </ChipRow>
      <Muted>
        {priceNegotiable ? t("price_negotiable_hint") : t("price_fixed_hint")}
      </Muted>

      <Field
        label={t("accepted_goods")}
        value={acceptedGoods}
        onChangeText={setAcceptedGoods}
        multiline
      />
      <Field
        label={t("trip_notes")}
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      <ErrorText>{error}</ErrorText>
      <Button
        label={mode === "edit" ? t("save") : t("publish")}
        onPress={() => void submit()}
        loading={submitting || uploading}
        disabled={submitting || uploading}
      />
    </View>
  );
}
