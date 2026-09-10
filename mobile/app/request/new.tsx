import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text } from "react-native";
import { Chip, ChipRow } from "@/components/chip";
import { CorridorFields, CountryCityFields } from "@/components/geo-fields";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import {
  JOB_EXPERIENCE_LEVELS,
  JOB_SECTORS,
} from "@/lib/jobs-catalog";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";
import {
  Button,
  ErrorText,
  Field,
  Muted,
  Screen,
  Title,
} from "@/components/ui";

export default function NewRequestScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const params = useLocalSearchParams<{ need?: string }>();
  const isJobOffer = String(params.need || "").toUpperCase() === "JOB_OFFER";

  const [fromCountry, setFromCountry] = useState("CA");
  const [fromCity, setFromCity] = useState("Montréal");
  const [toCountry, setToCountry] = useState("GA");
  const [toCity, setToCity] = useState("Libreville");
  const [weightKg, setWeightKg] = useState("5");
  const [description, setDescription] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobSector, setJobSector] = useState<(typeof JOB_SECTORS)[number]["id"]>(
    JOB_SECTORS[0].id
  );
  const [jobExperience, setJobExperience] = useState<
    (typeof JOB_EXPERIENCE_LEVELS)[number]["id"]
  >(JOB_EXPERIENCE_LEVELS[0].id);
  const [jobDiploma, setJobDiploma] = useState("");
  const [jobCountry, setJobCountry] = useState("CA");
  const [jobCity, setJobCity] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitParcel() {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ request: { id: string } }>("/api/requests", {
        method: "POST",
        body: JSON.stringify({
          needType: "PARCEL",
          fromCountry: fromCountry.trim().toUpperCase(),
          fromCity: fromCity.trim(),
          toCountry: toCountry.trim().toUpperCase(),
          toCity: toCity.trim(),
          weightKg: Number(weightKg),
          description: description.trim(),
          urgency: "NORMAL",
        }),
      });
      router.replace(`/request/${data.request.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function submitJobOffer() {
    if (jobTitle.trim().length < 2) {
      setError("Indiquez l’intitulé du poste.");
      return;
    }
    if (!jobCountry.trim() || jobCity.trim().length < 2) {
      setError("Indiquez le pays et la ville.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await api<{ request: { id: string } }>("/api/requests", {
        method: "POST",
        body: JSON.stringify({
          needType: "JOB_OFFER",
          jobTitle: jobTitle.trim(),
          jobSector,
          jobExperience,
          jobDiploma: jobDiploma.trim() || undefined,
          country: jobCountry.trim().toUpperCase(),
          city: jobCity.trim(),
          description: description.trim(),
          urgency: "NORMAL",
        }),
      });
      router.replace(`/request/${data.request.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          {isJobOffer ? (
            <>
              <Title>{t("order_need_job_offer")}</Title>
              <Muted>{t("order_need_job_offer_hint")}</Muted>
              <Field
                label={t("job_title_offer")}
                value={jobTitle}
                onChangeText={(v) => setJobTitle(v.slice(0, 120))}
                placeholder="Ex. Développeur full-stack"
              />
              <Text
                style={{
                  fontWeight: "700",
                  color: colors.foreground,
                  marginTop: 6,
                  marginBottom: 8,
                }}
              >
                {t("job_sector")}
              </Text>
              <ChipRow>
                {JOB_SECTORS.map((item) => (
                  <Chip
                    key={item.id}
                    label={locale === "en" ? item.labelEn : item.labelFr}
                    selected={jobSector === item.id}
                    onPress={() => setJobSector(item.id)}
                  />
                ))}
              </ChipRow>
              <Text
                style={{
                  fontWeight: "700",
                  color: colors.foreground,
                  marginTop: 10,
                  marginBottom: 8,
                }}
              >
                {t("job_experience")}
              </Text>
              <ChipRow>
                {JOB_EXPERIENCE_LEVELS.map((item) => (
                  <Chip
                    key={item.id}
                    label={locale === "en" ? item.labelEn : item.labelFr}
                    selected={jobExperience === item.id}
                    onPress={() => setJobExperience(item.id)}
                  />
                ))}
              </ChipRow>
              <Field
                label={t("job_diploma")}
                value={jobDiploma}
                onChangeText={(v) => setJobDiploma(v.slice(0, 160))}
                placeholder={t("job_diploma_placeholder")}
              />
              <CountryCityFields
                country={jobCountry}
                city={jobCity}
                onCountry={setJobCountry}
                onCity={setJobCity}
              />
              <Field
                label={t("description")}
                value={description}
                onChangeText={setDescription}
                multiline
                placeholder="Missions, profil recherché…"
              />
              <ErrorText>{error}</ErrorText>
              <Button
                label={t("publish")}
                onPress={() => void submitJobOffer()}
                loading={loading}
              />
            </>
          ) : (
            <>
              <Title>Nouvelle demande</Title>
              <Muted>Décrivez le colis à envoyer.</Muted>
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
                label="Poids (kg)"
                keyboardType="decimal-pad"
                value={weightKg}
                onChangeText={setWeightKg}
              />
              <Field
                label="Description"
                value={description}
                onChangeText={setDescription}
                multiline
                placeholder="Documents et vêtements pour la famille…"
              />
              <ErrorText>{error}</ErrorText>
              <Button label="Publier" onPress={submitParcel} loading={loading} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
