import 'package:flutter/material.dart';

/// Brand palette from the Zero Waste logo (frontend/src/index.css).
class Brand {
  static const primary = Color(0xFF387E01); // "waste" green
  static const primaryDark = Color(0xFF0C4002); // "zer" green
  static const accent = Color(0xFF559805);
  static const primaryLight = Color(0xFFEEF5E3);
  static const surfaceSunken = Color(0xFFF6F9F1);
  static const textDark = Color(0xFF16200F);
  static const textMid = Color(0xFF4D5945);
  static const textLight = Color(0xFF8A9482);
  static const border = Color(0xFFDFE7D5);

  static const darkPrimary = Color(0xFF8DC63F);
  static const darkSurface = Color(0xFF171C12);
  static const darkSunken = Color(0xFF0F130B);
}

/// Status colours: semantic, not brand. Light/dark pairs like --status-* in the web app.
class Tone {
  final Color bg, fg;
  const Tone(this.bg, this.fg);

  static Tone of(BuildContext context, String key) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return switch (key) {
      'ok' => dark ? const Tone(Color(0xFF1A2A10), Color(0xFFA3D467)) : const Tone(Color(0xFFEEF5E3), Color(0xFF15803D)),
      'warn' => dark ? const Tone(Color(0xFF2E2312), Color(0xFFEDBA63)) : const Tone(Color(0xFFFEF3C7), Color(0xFFB45309)),
      'danger' => dark ? const Tone(Color(0xFF301813), Color(0xFFF0907B)) : const Tone(Color(0xFFFEE2E2), Color(0xFFB91C1C)),
      'info' => dark ? const Tone(Color(0xFF102A36), Color(0xFF7CC7E8)) : const Tone(Color(0xFFE0F2FE), Color(0xFF0369A1)),
      'violet' => dark ? const Tone(Color(0xFF221B31), Color(0xFFB9A2F2)) : const Tone(Color(0xFFEDE9FE), Color(0xFF7C3AED)),
      _ => dark ? const Tone(Color(0xFF20281A), Color(0xFF858F7A)) : const Tone(Color(0xFFEEF3E6), Color(0xFF8A9482)),
    };
  }
}

ThemeData buildTheme(Brightness brightness) {
  final dark = brightness == Brightness.dark;
  final scheme = ColorScheme.fromSeed(
    seedColor: Brand.primary,
    brightness: brightness,
    primary: dark ? Brand.darkPrimary : Brand.primary,
    onPrimary: dark ? Brand.darkSunken : Colors.white,
    surface: dark ? Brand.darkSurface : Colors.white,
  );
  final radius = BorderRadius.circular(16);
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: dark ? Brand.darkSunken : Brand.surfaceSunken,
    appBarTheme: AppBarTheme(
      backgroundColor: dark ? Brand.darkSunken : Brand.surfaceSunken,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        fontSize: 22,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.5,
        color: dark ? Colors.white : Brand.textDark,
      ),
    ),
    cardTheme: CardThemeData(
      color: dark ? Brand.darkSurface : Colors.white,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(22),
        side: BorderSide(color: dark ? const Color(0xFF283120) : const Color(0xFFE6ECDD)),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: Brand.primary,
        foregroundColor: Colors.white,
        minimumSize: const Size(0, 48),
        shape: const StadiumBorder(),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(0, 48),
        shape: const StadiumBorder(),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: dark ? const Color(0xFF13180F) : Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(borderRadius: radius, borderSide: const BorderSide(color: Brand.border)),
      enabledBorder: OutlineInputBorder(
        borderRadius: radius,
        borderSide: BorderSide(color: dark ? const Color(0xFF2C3524) : Brand.border),
      ),
      focusedBorder: OutlineInputBorder(borderRadius: radius, borderSide: BorderSide(color: scheme.primary, width: 1.6)),
    ),
    chipTheme: ChipThemeData(
      shape: const StadiumBorder(),
      side: BorderSide(color: dark ? const Color(0xFF2C3524) : Brand.border),
      labelStyle: const TextStyle(fontWeight: FontWeight.w600),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: dark ? Brand.darkSurface : Colors.white,
      surfaceTintColor: Colors.transparent,
      indicatorColor: dark ? const Color(0xFF1F2E14) : Brand.primaryLight,
      labelTextStyle: WidgetStateProperty.all(const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
    ),
    snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
  );
}
