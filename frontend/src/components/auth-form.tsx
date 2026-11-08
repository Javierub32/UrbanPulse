import type { PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { useState } from "react";
import { ThemedText } from "./themed-text";
import { useTheme } from "@/hooks/use-theme";
import { FormLayout, Spacing } from "@/constants/theme";

export function AuthScreen({ children }: PropsWithChildren) {
  const colors = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.form}>{children}</View>
    </ScrollView>
  );
}

export function AuthField({
  label,
  error,
  password = false,
  ...props
}: TextInputProps & { label: string; error?: string; password?: boolean }) {
  const colors = useTheme();
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View
        style={[
          styles.inputRow,
          {
            borderColor: error ? colors.error : colors.border,
            backgroundColor: colors.backgroundElement,
          },
        ]}
      >
        <TextInput
          {...props}
          accessibilityLabel={label}
          accessibilityHint={error}
          autoCapitalize={props.autoCapitalize ?? "none"}
          secureTextEntry={password && !visible}
          style={[styles.input, { color: colors.text }]}
          placeholderTextColor={colors.textSecondary}
        />
        {password && (
          <Pressable
            onPress={() => setVisible(!visible)}
            accessibilityRole="button"
            accessibilityLabel={
              visible ? "Ocultar contraseña" : "Mostrar contraseña"
            }
            style={({ pressed }) => [
              styles.visibility,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText type="small" style={{ color: colors.accent }}>
              {visible ? "Ocultar" : "Mostrar"}
            </ThemedText>
          </Pressable>
        )}
      </View>
      {!!error && <AuthError message={error} />}
    </View>
  );
}

export function AuthError({ message }: { message: string }) {
  const colors = useTheme();
  return (
    <ThemedText
      selectable
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      type="small"
      style={{ color: colors.error }}
    >
      {message}
    </ThemedText>
  );
}

export function AuthButton({
  title,
  onPress,
  loading = false,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
}) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: loading, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.accent },
        (pressed || loading) && styles.pressed,
      ]}
    >
      {loading && <ActivityIndicator color={colors.accentText} />}
      <ThemedText style={{ color: colors.accentText }}>{title}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, padding: Spacing.four, justifyContent: "center" },
  form: {
    width: "100%",
    maxWidth: FormLayout.maxWidth,
    alignSelf: "center",
    gap: Spacing.four,
  },
  field: { gap: Spacing.two },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: FormLayout.radius,
    borderCurve: "continuous",
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: FormLayout.controlHeight,
    padding: Spacing.three,
    fontSize: 16,
  },
  visibility: {
    minHeight: FormLayout.controlHeight,
    paddingHorizontal: Spacing.three,
    justifyContent: "center",
  },
  button: {
    minHeight: FormLayout.controlHeight,
    padding: Spacing.three,
    borderRadius: FormLayout.radius,
    borderCurve: "continuous",
    flexDirection: "row",
    gap: Spacing.two,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.7 },
});
