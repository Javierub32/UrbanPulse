import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Linking,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import LocationMap from "@/pages/report/components/location-map";
import { useReportForm } from "@/pages/report/hooks/use-report-form";
import {
  useReportLocation,
  type LocationMode,
} from "@/pages/report/hooks/use-report-location";

const options: { value: LocationMode; label: string }[] = [
  { value: "current", label: "Ubicación actual" },
  { value: "map", label: "En el mapa" },
  { value: "assets", label: "Activos cercanos" },
];

export default function ReportScreen() {
  const theme = useTheme();
  const location = useReportLocation();
  const form = useReportForm();
  const [barWidth, setBarWidth] = useState(0);
  const position = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(position, {
      toValue: options.findIndex((option) => option.value === location.mode),
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [location.mode, position]);
  const itemWidth = barWidth / options.length;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{
        padding: Spacing.four,
        paddingBottom: 120,
        gap: Spacing.four,
      }}
    >
      <View style={{ gap: Spacing.two }}>
        <ThemedText type="subtitle">Reportar una incidencia</ThemedText>
        <ThemedText themeColor="textSecondary">
          Cuéntanos qué ocurre y dónde para que podamos localizarlo.
        </ThemedText>
      </View>
      <View
        pointerEvents={form.busy ? "none" : "auto"}
        style={{ gap: Spacing.four }}
      >
        <View style={{ gap: Spacing.two }}>
          <ThemedText type="smallBold">Título</ThemedText>
          <TextInput
            accessibilityLabel="Título de la incidencia"
            placeholder="Por ejemplo, farola apagada"
            placeholderTextColor={theme.textSecondary}
            maxLength={255}
            editable={!form.busy}
            value={form.title}
            onChangeText={form.setTitle}
            style={{
              backgroundColor: theme.backgroundElement,
              color: theme.text,
              borderRadius: 12,
              padding: Spacing.three,
              minHeight: 48,
            }}
          />
        </View>
        <View style={{ gap: Spacing.two }}>
          <ThemedText type="smallBold">Descripción</ThemedText>
          <TextInput
            accessibilityLabel="Descripción de la incidencia"
            placeholder="Describe el problema"
            placeholderTextColor={theme.textSecondary}
            multiline
            editable={!form.busy}
            value={form.description}
            onChangeText={form.setDescription}
            style={{
              backgroundColor: theme.backgroundElement,
              color: theme.text,
              borderRadius: 12,
              padding: Spacing.three,
              minHeight: 100,
              textAlignVertical: "top",
            }}
          />
        </View>
        <View style={{ gap: Spacing.two }}>
          <ThemedText type="smallBold">Categoría</ThemedText>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.two }}
          >
            {form.categories.map((item) => (
              <Pressable
                key={item.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: form.category === item.value }}
                onPress={() => form.setCategory(item.value)}
                style={({ pressed }) => ({
                  backgroundColor:
                    form.category === item.value
                      ? theme.backgroundSelected
                      : theme.backgroundElement,
                  borderRadius: 12,
                  paddingHorizontal: Spacing.three,
                  paddingVertical: Spacing.two,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <ThemedText
                  type={form.category === item.value ? "smallBold" : "small"}
                >
                  {item.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ gap: Spacing.three }}>
          <ThemedText type="smallBold">Ubicación de la incidencia</ThemedText>
          <View
            onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
            style={{
              flexDirection: "row",
              backgroundColor: theme.backgroundElement,
              borderRadius: 12,
              borderCurve: "continuous",
              overflow: "hidden",
            }}
          >
            {barWidth > 0 && (
              <Animated.View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: 4,
                  bottom: 4,
                  left: 0,
                  width: itemWidth,
                  paddingHorizontal: 4,
                  transform: [
                    { translateX: Animated.multiply(position, itemWidth) },
                  ],
                }}
              >
                <View
                  style={{
                    flex: 1,
                    borderRadius: 8,
                    borderCurve: "continuous",
                    backgroundColor: theme.backgroundSelected,
                  }}
                />
              </Animated.View>
            )}
            {options.map((option) => (
              <Pressable
                key={option.value}
                accessibilityRole="tab"
                accessibilityState={{
                  selected: location.mode === option.value,
                }}
                onPress={() => location.selectMode(option.value)}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 56,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingHorizontal: 4,
                  paddingVertical: 8,
                  opacity: pressed ? 0.65 : 1,
                })}
              >
                <ThemedText
                  type={location.mode === option.value ? "smallBold" : "small"}
                  style={{ textAlign: "center" }}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          {location.mode === "assets" ? (
            <View
              style={{
                paddingVertical: Spacing.five,
                gap: Spacing.two,
                alignItems: "center",
              }}
            >
              <ThemedText type="smallBold">
                No hay activos disponibles
              </ThemedText>
              <ThemedText
                themeColor="textSecondary"
                style={{ textAlign: "center" }}
              >
                La búsqueda de activos cercanos aún no está disponible. Puedes
                seleccionar el lugar en el mapa.
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={() => location.selectMode("map")}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.6 : 1,
                  padding: Spacing.two,
                })}
              >
                <ThemedText type="linkPrimary">
                  Seleccionar en el mapa
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: Spacing.three }}>
              {location.status === "loading" && (
                <View
                  accessibilityRole="progressbar"
                  accessibilityLabel="Buscando tu ubicación"
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: Spacing.two,
                  }}
                >
                  <ActivityIndicator />
                  <ThemedText themeColor="textSecondary">
                    Buscando tu ubicación…
                  </ThemedText>
                </View>
              )}
              {location.status === "denied" && (
                <View style={{ gap: Spacing.two }}>
                  <ThemedText selectable>
                    No se ha concedido el permiso de ubicación. Puedes
                    seleccionar el lugar en el mapa.
                  </ThemedText>
                  {!location.canAskAgain && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void Linking.openSettings()}
                    >
                      <ThemedText type="linkPrimary">Abrir ajustes</ThemedText>
                    </Pressable>
                  )}
                </View>
              )}
              {location.status === "error" && (
                <ThemedText selectable>
                  No hemos podido obtener tu ubicación. Comprueba que la
                  localización esté activada o selecciona un punto en el mapa.
                </ThemedText>
              )}
              {(location.status === "denied" ||
                location.status === "error") && (
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: Spacing.three,
                  }}
                >
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => location.selectMode("map")}
                  >
                    <ThemedText type="linkPrimary">
                      Seleccionar en el mapa
                    </ThemedText>
                  </Pressable>
                  {(location.status === "error" || location.canAskAgain) && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void location.locate()}
                    >
                      <ThemedText type="linkPrimary">Reintentar</ThemedText>
                    </Pressable>
                  )}
                </View>
              )}
              <ThemedText themeColor="textSecondary" type="small">
                Toca el mapa para marcar el lugar o arrastra el marcador para
                ajustarlo.
              </ThemedText>
              <LocationMap
                coordinate={location.coordinate}
                onSelect={location.selectCoordinate}
              />
              {location.coordinate ? (
                <ThemedText selectable type="small" themeColor="textSecondary">
                  Ubicación seleccionada:{" "}
                  {location.coordinate.latitude.toFixed(5)},{" "}
                  {location.coordinate.longitude.toFixed(5)}
                </ThemedText>
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  Todavía no has seleccionado una ubicación.
                </ThemedText>
              )}
              {location.mode === "current" && location.status === "idle" && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void location.locate()}
                  style={({ pressed }) => ({
                    alignSelf: "flex-start",
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <ThemedText type="linkPrimary">
                    Actualizar mi ubicación
                  </ThemedText>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>
      {form.error ? (
        <ThemedText selectable accessibilityRole="alert">
          {form.error}
        </ThemedText>
      ) : null}
      {form.success ? (
        <ThemedText accessibilityRole="alert">
          Incidencia enviada correctamente.
        </ThemedText>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Enviar incidencia"
        accessibilityState={{ disabled: form.busy, busy: form.busy }}
        disabled={form.busy}
        onPress={async () => {
          if (
            await form.submit(
              location.mode === "assets" ? null : location.coordinate,
            )
          )
            location.reset();
        }}
        style={({ pressed }) => ({
          backgroundColor: "#208AEF",
          padding: Spacing.three,
          borderRadius: 12,
          alignItems: "center",
          opacity: form.busy || pressed ? 0.65 : 1,
        })}
      >
        {form.busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText type="smallBold" style={{ color: "#fff" }}>
            Enviar incidencia
          </ThemedText>
        )}
      </Pressable>
    </ScrollView>
  );
}
