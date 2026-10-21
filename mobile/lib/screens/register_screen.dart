import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/app_state.dart';
import '../core/pickers.dart';
import '../core/theme.dart';
import '../widgets/common.dart';

/// Same agreements as frontend/src/pages/Register.jsx.
const _agreements = {
  'donor': (
    'Donor Pledge',
    'As a registered food donor on Zero Waste, I pledge to only list food that is safe, accurately described, and fit for its '
        'stated purpose — for human consumption while fresh or surplus, and for farm/compost redistribution once flagged expired. '
        'I understand that listing inaccurate, unsafe, or misleading items may result in my account being suspended.',
  ),
  'beneficiary': (
    'Recipient Disclaimer',
    'I understand that Zero Waste is a redistribution platform connecting my organization with surplus and near-expiry food '
        'donated in good faith by third-party donors. Zero Waste and its donors are not responsible for the quality, safety, or '
        'condition of food received through this platform. My organization accepts full responsibility for inspecting all items '
        'before use or further distribution.',
  ),
  'farm': (
    'Farm & Compost Partner Disclaimer',
    'I understand that Zero Waste connects my facility with surplus and expired food donated in good faith by third-party '
        'donors, intended for composting or animal feed. Zero Waste and its donors are not responsible for the quality, safety, '
        'or condition of food received through this platform. My facility accepts full responsibility for inspecting and handling '
        'all items appropriately.',
  ),
};

const _storageTypes = ['Ambient / Dry', 'Refrigerated / Cold', 'Deep Freezer'];

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _org = TextEditingController();
  final _location = TextEditingController();
  final _served = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  String _role = 'donor';
  String? _storage;
  PickedFile? _document;
  bool _agreementStage = false, _busy = false, _obscure = true;
  String? _error;

  bool get _isDonor => _role == 'donor';
  bool get _isBeneficiary => _role == 'beneficiary';

  String? _required(String? v) => (v == null || v.trim().isEmpty) ? 'Required' : null;

  void _continue() {
    setState(() => _error = null);
    if (_form.currentState!.validate()) setState(() => _agreementStage = true);
  }

  Future<void> _attach() async {
    try {
      final f = await pickDocument();
      if (f == null) return;
      if (f.bytes.length > maxUploadBytes) {
        setState(() => _error = 'That file is larger than 10MB.');
        return;
      }
      setState(() {
        _document = f;
        _error = null;
      });
    } catch (e) {
      setState(() => _error = 'Could not open the file: $e');
    }
  }

  Future<void> _create() async {
    final state = context.read<AppState>();
    final navigator = Navigator.of(context);
    // App-level, so it survives this screen being popped below.
    final messenger = ScaffoldMessenger.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final user = await state.register({
        'role': _role,
        'orgType': switch (_role) { 'donor' => 'Donor', 'farm' => 'Farm', _ => 'Beneficiary Organization' },
        'name': _name.text.trim(),
        'email': _email.text.trim(),
        'password': _password.text,
        'phone': _phone.text.trim(),
        'organizationName': _org.text.trim(),
        'location': _location.text.trim(),
        if (_isBeneficiary) 'organizationSize': int.tryParse(_served.text.trim()) ?? 0,
        if (_isBeneficiary) 'storageCapacity': _storage,
      });
      var json = user.raw;
      String? uploadError;
      if (_document != null) {
        try {
          final data = await state.api.upload('/beneficiaries/${user.id}/documents', _document!.bytes, _document!.name);
          json = data['user'];
        } catch (e) {
          // The account exists either way; the document can be re-sent from Profile.
          uploadError = errorText(e);
        }
      }
      // Leave the login stack before the signed-in home replaces it.
      navigator.popUntil((r) => r.isFirst);
      await state.setUser(json);
      if (uploadError != null) {
        messenger.showSnackBar(SnackBar(
          content: Text('Account created, but the document upload failed: $uploadError. Add it again from Profile.'),
          backgroundColor: const Color(0xFFB91C1C),
        ));
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = errorText(e);
          _agreementStage = false;
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !_agreementStage,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && !_busy) setState(() => _agreementStage = false);
      },
      child: Scaffold(
        appBar: AppBar(title: const Text('Create account')),
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: _agreementStage ? _agreement(context) : _details(context),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _details(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Form(
      key: _form,
      child: AutofillGroup(
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Text('I am a…', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          SegmentedButton<String>(
            showSelectedIcon: false,
            segments: const [
              ButtonSegment(value: 'donor', icon: Icon(Icons.storefront_rounded), label: Text('Donor')),
              ButtonSegment(value: 'beneficiary', icon: Icon(Icons.volunteer_activism_rounded), label: Text('Charity')),
              ButtonSegment(value: 'farm', icon: Icon(Icons.agriculture_rounded), label: Text('Farm')),
            ],
            selected: {_role},
            onSelectionChanged: (s) => setState(() => _role = s.first),
          ),
          const SizedBox(height: 6),
          Text(
            switch (_role) {
              'donor' => 'Supermarkets and stores listing surplus stock.',
              'farm' => 'Farms and compost sites collecting expired food.',
              _ => 'NGOs, charities and kitchens receiving surplus food.',
            },
            style: TextStyle(fontSize: 12.5, color: cs.outline),
          ),
          const SizedBox(height: 18),
          TextFormField(
            controller: _name,
            textCapitalization: TextCapitalization.words,
            autofillHints: const [AutofillHints.name],
            decoration: const InputDecoration(labelText: 'Contact name', prefixIcon: Icon(Icons.person_outline_rounded)),
            validator: _required,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            autocorrect: false,
            autofillHints: const [AutofillHints.email],
            decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.mail_outline_rounded)),
            validator: (v) {
              if (_required(v) != null) return 'Required';
              return RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(v!.trim()) ? null : 'Enter a valid email';
            },
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            autofillHints: const [AutofillHints.telephoneNumber],
            decoration: const InputDecoration(labelText: 'Phone', hintText: '077 123 4567', prefixIcon: Icon(Icons.phone_outlined)),
            validator: _required,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _org,
            textCapitalization: TextCapitalization.words,
            decoration: InputDecoration(
              labelText: switch (_role) {
                'donor' => 'Store / supermarket name',
                'farm' => 'Farm / facility name',
                _ => 'Organization name',
              },
              prefixIcon: const Icon(Icons.apartment_rounded),
            ),
            validator: _required,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _location,
            textCapitalization: TextCapitalization.words,
            decoration: InputDecoration(
              labelText: _isDonor ? 'Pickup city / address' : 'City / location',
              hintText: 'e.g. Colombo 05',
              prefixIcon: const Icon(Icons.location_on_outlined),
            ),
            validator: _isDonor ? null : _required,
          ),
          if (_isBeneficiary) ...[
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: TextFormField(
                  controller: _served,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'People served daily'),
                  validator: (v) => int.tryParse(v?.trim() ?? '') == null ? 'Enter a number' : null,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: _storage,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Storage'),
                  items: [for (final s in _storageTypes) DropdownMenuItem(value: s, child: Text(s, overflow: TextOverflow.ellipsis))],
                  onChanged: (v) => setState(() => _storage = v),
                  validator: (v) => v == null ? 'Choose one' : null,
                ),
              ),
            ]),
          ],
          const SizedBox(height: 12),
          TextFormField(
            controller: _password,
            obscureText: _obscure,
            autofillHints: const [AutofillHints.newPassword],
            decoration: InputDecoration(
              labelText: 'Password',
              prefixIcon: const Icon(Icons.lock_outline_rounded),
              suffixIcon: IconButton(
                tooltip: _obscure ? 'Show password' : 'Hide password',
                icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                onPressed: () => setState(() => _obscure = !_obscure),
              ),
            ),
            validator: (v) => (v ?? '').length < 6 ? 'At least 6 characters' : null,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _confirm,
            obscureText: _obscure,
            decoration: const InputDecoration(labelText: 'Confirm password', prefixIcon: Icon(Icons.lock_outline_rounded)),
            validator: (v) => v != _password.text ? 'Passwords do not match' : null,
          ),
          if (!_isDonor) ...[
            const SizedBox(height: 18),
            Card(
              child: ListTile(
                leading: Icon(_document == null ? Icons.upload_file_rounded : Icons.description_rounded, color: cs.primary),
                title: Text(_document?.name ?? 'Registration document (optional)',
                    maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Text(_document == null
                    ? 'Certificate or licence (PDF or image). Speeds up admin verification - you can also add it later.'
                    : 'Will be sent with your registration.'),
                trailing: _document == null
                    ? null
                    : IconButton(
                        tooltip: 'Remove',
                        icon: const Icon(Icons.close_rounded),
                        onPressed: () => setState(() => _document = null),
                      ),
                onTap: _attach,
              ),
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: cs.error, fontSize: 13)),
          ],
          const SizedBox(height: 20),
          FilledButton(onPressed: _continue, child: const Text('Continue to agreement')),
          const SizedBox(height: 8),
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Already have an account? Sign in')),
        ]),
      ),
    );
  }

  Widget _agreement(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final (title, body) = _agreements[_role]!;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: cs.primary.withValues(alpha: 0.07),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Icon(Icons.handshake_rounded, color: cs.primary),
            const SizedBox(width: 10),
            Expanded(child: Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800))),
          ]),
          const SizedBox(height: 12),
          Text(body, style: const TextStyle(height: 1.5)),
        ]),
      ),
      if (!_isDonor) ...[
        const SizedBox(height: 12),
        Row(children: [
          Icon(Icons.hourglass_top_rounded, size: 16, color: Tone.of(context, 'warn').fg),
          const SizedBox(width: 6),
          Expanded(
            child: Text('An admin verifies new organizations before they can request food.',
                style: TextStyle(fontSize: 12.5, color: cs.outline)),
          ),
        ]),
      ],
      if (_error != null) ...[
        const SizedBox(height: 12),
        Text(_error!, style: TextStyle(color: cs.error, fontSize: 13)),
      ],
      const SizedBox(height: 20),
      FilledButton(
        onPressed: _busy ? null : _create,
        child: _busy
            ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
            : const Text('I agree - create account'),
      ),
      const SizedBox(height: 8),
      OutlinedButton(
        style: OutlinedButton.styleFrom(foregroundColor: Tone.of(context, 'danger').fg),
        onPressed: _busy ? null : () => Navigator.pop(context),
        child: const Text('I disagree'),
      ),
    ]);
  }
}
