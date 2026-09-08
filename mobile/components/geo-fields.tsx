import { useMemo, useState, type ReactNode } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "@/lib/i18n";
import {
  citiesInRegion,
  countriesForRegion,
  getCities,
  getCountryName,
  useCorridors,
} from "@/lib/corridors";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

function useColors() {
  return useOptionalTheme()?.colors ?? lightColors;
}

function PickerField({
  label,
  display,
  placeholder,
  onPress,
}: {
  label: string;
  display: string;
  placeholder: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: colors.foreground, fontWeight: "600", marginBottom: 6 }}>
        {label}
      </Text>
      <Pressable
        onPress={onPress}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 14,
        }}
      >
        <Text style={{ color: display ? colors.foreground : colors.muted, fontSize: 16 }}>
          {display || placeholder}
        </Text>
      </Pressable>
    </View>
  );
}

function SearchModal({
  visible,
  title,
  query,
  onQuery,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  query: string;
  onQuery: (value: string) => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const colors = useColors();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "800", color: colors.foreground }}>
          {title}
        </Text>
        <TextInput
          value={query}
          onChangeText={onQuery}
          placeholder={t("geo_search_placeholder")}
          placeholderTextColor={colors.muted}
          autoFocus
          autoCorrect={false}
          style={{
            marginTop: 12,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 12,
            color: colors.foreground,
            fontSize: 16,
          }}
        />
        <View style={{ flex: 1, marginTop: 8 }}>{children}</View>
        <Pressable
          onPress={onClose}
          style={{
            paddingVertical: 16,
            marginBottom: insets.bottom + 8,
            alignItems: "center",
          }}
        >
          <Text style={{ color: colors.accent, fontWeight: "700" }}>{t("close")}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

export function CountryField({
  label,
  value,
  onChange,
  allowEmpty,
  regionId,
}: {
  label: string;
  value: string;
  onChange: (code: string) => void;
  allowEmpty?: boolean;
  regionId?: string;
}) {
  const { t } = useI18n();
  const colors = useColors();
  const catalog = useCorridors();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const options = useMemo(() => {
    const list = countriesForRegion(catalog, regionId ?? "");
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [catalog, query, regionId]);

  const display = value
    ? `${getCountryName(catalog, value)} (${value})`
    : "";

  return (
    <>
      <PickerField
        label={label}
        display={display}
        placeholder={t("geo_pick_country")}
        onPress={() => {
          setQuery("");
          setOpen(true);
        }}
      />
      <SearchModal
        visible={open}
        title={label}
        query={query}
        onQuery={setQuery}
        onClose={() => setOpen(false)}
      >
        <FlatList
          data={options}
          keyExtractor={(item) => item.code}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            allowEmpty ? (
              <Pressable
                onPress={() => {
                  onChange("");
                  setOpen(false);
                }}
                style={{ paddingVertical: 12 }}
              >
                <Text style={{ color: colors.accent, fontWeight: "700" }}>
                  {t("all_f")}
                </Text>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            <Text style={{ color: colors.muted, paddingVertical: 12 }}>
              {t("geo_no_country")}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                onChange(item.code);
                setOpen(false);
              }}
              style={{
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ color: colors.foreground, fontSize: 16 }}>{item.name}</Text>
              <Text style={{ color: colors.muted }}>{item.code}</Text>
            </Pressable>
          )}
        />
      </SearchModal>
    </>
  );
}

export function CityField({
  label,
  value,
  onChange,
  country,
  regionId,
  allowEmpty,
}: {
  label: string;
  value: string;
  onChange: (city: string) => void;
  country?: string;
  regionId?: string;
  allowEmpty?: boolean;
}) {
  const { t } = useI18n();
  const colors = useColors();
  const catalog = useCorridors();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const cities = useMemo(() => {
    if (country) return getCities(catalog, country);
    if (regionId) return citiesInRegion(catalog, regionId);
    return [];
  }, [catalog, country, regionId]);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter((city) => city.toLowerCase().includes(q));
  }, [cities, query]);

  const custom =
    query.trim() &&
    !cities.some((c) => c.toLowerCase() === query.trim().toLowerCase())
      ? query.trim()
      : "";

  return (
    <>
      <PickerField
        label={label}
        display={value}
        placeholder={t("geo_pick_city")}
        onPress={() => {
          setQuery("");
          setOpen(true);
        }}
      />
      <SearchModal
        visible={open}
        title={label}
        query={query}
        onQuery={setQuery}
        onClose={() => setOpen(false)}
      >
        <FlatList
          data={options}
          keyExtractor={(item) => item}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <>
              {allowEmpty ? (
                <Pressable
                  onPress={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  style={{ paddingVertical: 12 }}
                >
                  <Text style={{ color: colors.accent, fontWeight: "700" }}>
                    {t("all_f")}
                  </Text>
                </Pressable>
              ) : null}
              {custom ? (
                <Pressable
                  onPress={() => {
                    onChange(custom);
                    setOpen(false);
                  }}
                  style={{ paddingVertical: 12 }}
                >
                  <Text style={{ color: colors.accent, fontWeight: "700" }}>
                    {t("geo_use_typed").replace("{value}", custom)}
                  </Text>
                </Pressable>
              ) : null}
            </>
          }
          ListEmptyComponent={
            !custom ? (
              <Text style={{ color: colors.muted, paddingVertical: 12 }}>
                {t("geo_no_city")}
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                onChange(item);
                setOpen(false);
              }}
              style={{
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={{ color: colors.foreground, fontSize: 16 }}>{item}</Text>
            </Pressable>
          )}
        />
      </SearchModal>
    </>
  );
}

export function RegionField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (regionId: string) => void;
}) {
  const { t, locale } = useI18n();
  const colors = useColors();
  const catalog = useCorridors();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: colors.foreground, fontWeight: "600", marginBottom: 8 }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Pressable
          onPress={() => onChange("")}
          style={{
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: !value ? colors.accent : colors.surface2,
            borderWidth: 1,
            borderColor: !value ? colors.accent : colors.border,
          }}
        >
          <Text style={{ color: !value ? colors.white : colors.foreground, fontWeight: "700" }}>
            {t("all_f")}
          </Text>
        </Pressable>
        {catalog.regions.map((r) => {
          const selected = value === r.id;
          return (
            <Pressable
              key={r.id}
              onPress={() => onChange(r.id)}
              style={{
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: selected ? colors.accent : colors.surface2,
                borderWidth: 1,
                borderColor: selected ? colors.accent : colors.border,
              }}
            >
              <Text
                style={{
                  color: selected ? colors.white : colors.foreground,
                  fontWeight: "700",
                  fontSize: 13,
                }}
              >
                {locale === "en" ? r.nameEn : r.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function CorridorFields({
  fromCountry,
  fromCity,
  toCountry,
  toCity,
  onFromCountry,
  onFromCity,
  onToCountry,
  onToCity,
}: {
  fromCountry: string;
  fromCity: string;
  toCountry: string;
  toCity: string;
  onFromCountry: (code: string) => void;
  onFromCity: (city: string) => void;
  onToCountry: (code: string) => void;
  onToCity: (city: string) => void;
}) {
  const { t } = useI18n();
  const catalog = useCorridors();

  function changeFromCountry(code: string) {
    onFromCountry(code);
    const cities = getCities(catalog, code);
    if (cities.length && !cities.includes(fromCity)) onFromCity(cities[0] ?? "");
  }

  function changeToCountry(code: string) {
    onToCountry(code);
    const cities = getCities(catalog, code);
    if (cities.length && !cities.includes(toCity)) onToCity(cities[0] ?? "");
  }

  return (
    <View>
      <CountryField
        label={t("from_country")}
        value={fromCountry}
        onChange={changeFromCountry}
      />
      <CityField
        label={t("from_city")}
        value={fromCity}
        onChange={onFromCity}
        country={fromCountry}
      />
      <CountryField
        label={t("to_country")}
        value={toCountry}
        onChange={changeToCountry}
      />
      <CityField
        label={t("to_city")}
        value={toCity}
        onChange={onToCity}
        country={toCountry}
      />
    </View>
  );
}

export function CountryCityFields({
  country,
  city,
  onCountry,
  onCity,
  allowEmpty,
  regionId,
}: {
  country: string;
  city: string;
  onCountry: (code: string) => void;
  onCity: (city: string) => void;
  allowEmpty?: boolean;
  regionId?: string;
}) {
  const { t } = useI18n();
  const catalog = useCorridors();

  function changeCountry(code: string) {
    onCountry(code);
    if (allowEmpty && !code) {
      onCity("");
      return;
    }
    const cities = getCities(catalog, code);
    if (cities.length && !cities.includes(city)) onCity(cities[0] ?? "");
  }

  return (
    <View>
      <CountryField
        label={t("country")}
        value={country}
        onChange={changeCountry}
        allowEmpty={allowEmpty}
        regionId={regionId}
      />
      <CityField
        label={t("city")}
        value={city}
        onChange={onCity}
        country={country}
        regionId={!country ? regionId : undefined}
        allowEmpty={allowEmpty}
      />
    </View>
  );
}
