// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  // Navigation
  "house.fill": "home",
  "person.fill": "person",
  "person.2.fill": "people",
  "person.3.fill": "groups",
  "gearshape.fill": "settings",
  
  // Actions
  "paperplane.fill": "send",
  "plus": "add",
  "plus.circle.fill": "add-circle",
  "checkmark": "check",
  "checkmark.circle.fill": "check-circle",
  "xmark": "close",
  "xmark.circle.fill": "cancel",
  
  // Content
  "calendar": "event",
  "calendar.badge.plus": "event-note",
  "clock.fill": "schedule",
  "bell.fill": "notifications",
  "chart.bar.fill": "bar-chart",
  "list.bullet": "list",
  
  // Navigation arrows
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "arrow.left": "arrow-back",
  "arrow.right": "arrow-forward",
  
  // Status
  "exclamationmark.triangle.fill": "warning",
  "info.circle.fill": "info",
  "questionmark.circle.fill": "help",
  
  // Misc
  "magnifyingglass": "search",
  "phone.fill": "phone",
  "envelope.fill": "email",
  "location.fill": "location-on",
  "star.fill": "star",
  "heart.fill": "favorite",
  "trash.fill": "delete",
  "pencil": "edit",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
