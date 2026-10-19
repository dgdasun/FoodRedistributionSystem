import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/app_state.dart';
import '../core/theme.dart';
import '../widgets/common.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

/// Seeded demo accounts (backend DataSeeder, password "password123").
const _demoAccounts = [
  ('Donor', 'perera@abcsupermarket.lk', Icons.storefront_rounded),
  ('NGO', 'contact@hopekitchen.lk', Icons.volunteer_activism_rounded),
  ('Charity', 'info@caringhands.lk', Icons.favorite_rounded),
  ('Farm', 'farm@greenacres.lk', Icons.agriculture_rounded),
];

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false, _obscure = true;
  String? _error;

  Future<void> _submit() async {
    if (_email.text.trim().isEmpty || _password.text.isEmpty) {
      setState(() => _error = 'Enter your email and password.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await context.read<AppState>().login(_email.text, _password.text);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _editServer() async {
    final state = context.read<AppState>();
    final ctrl = TextEditingController(text: state.serverUrl);
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Server address'),
        content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text(
            'The Spring Boot backend URL. On a real phone use your computer\'s Wi-Fi IP, e.g. http://192.168.1.20:8080. '
            'The Android emulator uses http://10.0.2.2:8080.',
            style: TextStyle(fontSize: 13),
          ),
          const SizedBox(height: 14),
          TextField(controller: ctrl, keyboardType: TextInputType.url, autocorrect: false),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, ctrl.text), child: const Text('Save')),
        ],
      ),
    );
    if (result != null && result.trim().isNotEmpty) await state.setServerUrl(result);
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final server = context.watch<AppState>().serverUrl;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: AutofillGroup(
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(28),
                      gradient: const LinearGradient(
                        colors: [Brand.primaryDark, Brand.primary],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                    ),
                    child: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Icon(Icons.eco_rounded, color: Colors.white, size: 40),
                      SizedBox(height: 18),
                      Text('Zero Waste',
                          style: TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w800, letterSpacing: -1)),
                      SizedBox(height: 4),
                      Text('Smart surplus food redistribution - rescue food, feed communities.',
                          style: TextStyle(color: Color(0xDDFFFFFF), fontSize: 14.5, height: 1.4)),
                    ]),
                  ),
                  const SizedBox(height: 28),
                  const Text('Sign in', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, letterSpacing: -0.5)),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.email],
                    autocorrect: false,
                    textInputAction: TextInputAction.next,
                    decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.mail_outline_rounded)),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _password,
                    obscureText: _obscure,
                    autofillHints: const [AutofillHints.password],
                    onSubmitted: (_) => _submit(),
                    decoration: InputDecoration(
                      labelText: 'Password',
                      prefixIcon: const Icon(Icons.lock_outline_rounded),
                      suffixIcon: IconButton(
                        tooltip: _obscure ? 'Show password' : 'Hide password',
                        icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                        onPressed: () => setState(() => _obscure = !_obscure),
                      ),
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(_error!, style: TextStyle(color: cs.error, fontSize: 13)),
                  ],
                  const SizedBox(height: 18),
                  FilledButton(
                    onPressed: _busy ? null : _submit,
                    child: _busy
                        ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                        : const Text('Sign in'),
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: _busy
                        ? null
                        : () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const RegisterScreen())),
                    child: const Text('New here? Create an account'),
                  ),
                  const SizedBox(height: 26),
                  Text('DEMO ACCOUNTS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1, color: cs.outline)),
                  const SizedBox(height: 10),
                  Wrap(spacing: 8, runSpacing: 8, children: [
                    for (final (label, email, icon) in _demoAccounts)
                      ActionChip(
                        avatar: Icon(icon, size: 16, color: cs.primary),
                        label: Text(label),
                        onPressed: () => setState(() {
                          _email.text = email;
                          _password.text = 'password123';
                          _error = null;
                        }),
                      ),
                  ]),
                  const SizedBox(height: 24),
                  TextButton.icon(
                    onPressed: _editServer,
                    icon: const Icon(Icons.dns_outlined, size: 18),
                    label: Text('Server: $server', overflow: TextOverflow.ellipsis),
                  ),
                ]),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
