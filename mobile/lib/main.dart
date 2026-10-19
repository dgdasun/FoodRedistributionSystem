import 'package:device_preview/device_preview.dart';
import 'package:device_preview/presets.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/app_state.dart';
import 'core/theme.dart';
import 'screens/home_shell.dart';
import 'screens/login_screen.dart';

Future<void> main() async {
  // In a desktop browser (debug only), show the app inside a phone frame for
  // demos. On a real phone and in release builds this is a normal binding.
  DevicePreview.enable(enabled: kIsWeb && !kReleaseMode);
  await DevicePreview.maybeController?.applyPreset(DevicePresets.pixel10);
  runApp(ChangeNotifierProvider(create: (_) => AppState()..load(), child: const ZeroWasteApp()));
}

class ZeroWasteApp extends StatelessWidget {
  const ZeroWasteApp({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    return MaterialApp(
      title: 'Zero Waste',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(Brightness.light),
      darkTheme: buildTheme(Brightness.dark),
      // Always light, even when the phone or browser is in dark mode.
      themeMode: ThemeMode.light,
      home: !state.ready
          ? const Scaffold(body: Center(child: CircularProgressIndicator()))
          : state.user == null
              ? const LoginScreen()
              // Keyed by user so switching accounts rebuilds every tab from scratch.
              : HomeShell(key: ValueKey(state.user!.id)),
    );
  }
}
