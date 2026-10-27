import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/app_state.dart';
import '../core/models.dart';
import '../core/pickers.dart';
import '../core/theme.dart';
import '../widgets/common.dart';
import 'donor/pickup_history_screen.dart';
import 'notifications_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _photoBusy = false, _docBusy = false;

  /// Runs an endpoint that returns `{user}` and stores the result.
  Future<bool> _updateUser(Future<Map<String, dynamic>> Function() call) async {
    final state = context.read<AppState>();
    try {
      final data = await call();
      if (data['user'] is Map<String, dynamic>) await state.setUser(data['user']);
      return true;
    } catch (e) {
      if (mounted) showSnack(context, errorText(e), error: true);
      return false;
    }
  }

  Future<void> _photoMenu(User user) async {
    final hasPhoto = user.avatarPath != null;
    final action = !hasPhoto
        ? 'change'
        : await showModalBottomSheet<String>(
            context: context,
            showDragHandle: true,
            builder: (ctx) => SafeArea(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                ListTile(
                  leading: const Icon(Icons.photo_camera_outlined),
                  title: const Text('Change photo'),
                  onTap: () => Navigator.pop(ctx, 'change'),
                ),
                ListTile(
                  leading: Icon(Icons.delete_outline_rounded, color: Tone.of(ctx, 'danger').fg),
                  title: Text('Remove photo', style: TextStyle(color: Tone.of(ctx, 'danger').fg)),
                  onTap: () => Navigator.pop(ctx, 'remove'),
                ),
                const SizedBox(height: 8),
              ]),
            ),
          );
    if (action == null || !mounted) return;
    final api = context.read<AppState>().api;

    if (action == 'remove') {
      setState(() => _photoBusy = true);
      if (await _updateUser(() => api.delete('/users/${user.id}/avatar')) && mounted) {
        showSnack(context, 'Profile photo removed.');
      }
      if (mounted) setState(() => _photoBusy = false);
      return;
    }

    PickedFile? file;
    try {
      file = await pickPhoto(context);
    } catch (e) {
      if (mounted) showSnack(context, 'Could not open the photo: $e', error: true);
      return;
    }
    if (file == null || !mounted) return;
    if (file.bytes.length > maxPhotoBytes) {
      showSnack(context, 'That image is larger than 5MB.', error: true);
      return;
    }
    setState(() => _photoBusy = true);
    final picked = file;
    if (await _updateUser(() => api.upload('/users/${user.id}/avatar', picked.bytes, picked.name)) && mounted) {
      showSnack(context, 'Profile photo updated.');
    }
    if (mounted) setState(() => _photoBusy = false);
  }

  Future<void> _addDocument(User user) async {
    PickedFile? file;
    try {
      file = await pickDocument();
    } catch (e) {
      if (mounted) showSnack(context, 'Could not open the file: $e', error: true);
      return;
    }
    if (file == null || !mounted) return;
    if (file.bytes.length > maxUploadBytes) {
      showSnack(context, 'That file is larger than 10MB.', error: true);
      return;
    }
    setState(() => _docBusy = true);
    final picked = file;
    final api = context.read<AppState>().api;
    if (await _updateUser(() => api.upload('/beneficiaries/${user.id}/documents', picked.bytes, picked.name)) && mounted) {
      showSnack(context, '${picked.name} uploaded for review.');
    }
    if (mounted) setState(() => _docBusy = false);
  }

  Future<void> _removeDocument(User user, String doc) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remove document?'),
        content: Text(documentLabel(doc)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Remove')),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() => _docBusy = true);
    final api = context.read<AppState>().api;
    await _updateUser(() => api.delete('/beneficiaries/${user.id}/documents/${Uri.encodeComponent(doc)}'));
    if (mounted) setState(() => _docBusy = false);
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final user = state.user!;
    final cs = Theme.of(context).colorScheme;
    final photo = user.avatarPath == null ? null : state.api.absolute(user.avatarPath!);

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: RefreshIndicator(
        onRefresh: state.refreshUser,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                gradient: const LinearGradient(colors: [Brand.primaryDark, Brand.primary]),
              ),
              child: Row(children: [
                _Avatar(user: user, url: photo, busy: _photoBusy, onTap: _photoBusy ? null : () => _photoMenu(user)),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(user.name,
                        style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
                    if (user.organizationName != null)
                      Text(user.organizationName!, style: const TextStyle(color: Color(0xDDFFFFFF))),
                    const SizedBox(height: 8),
                    Wrap(spacing: 6, runSpacing: 6, children: [
                      _whitePill(user.roleLabel),
                      if (user.isReceiver)
                        _whitePill(user.verified ? 'Verified' : (user.isRejected ? 'Rejected' : 'Pending verification')),
                    ]),
                  ]),
                ),
              ]),
            ),
            const SizedBox(height: 16),
            Card(
              child: Column(children: [
                _row(Icons.mail_outline_rounded, 'Email', user.email),
                if (_has(user.phone)) _row(Icons.phone_outlined, 'Phone', user.phone!),
                if (_has(user.location))
                  _row(Icons.location_on_outlined, user.isDonor ? 'Pickup address' : 'Location', user.location!),
                if (user.isReceiver && _has(user.orgType)) _row(Icons.apartment_rounded, 'Organisation type', user.orgType!),
                if (user.role == 'beneficiary' && user.organizationSize > 0)
                  _row(Icons.groups_outlined, 'People served daily', '${user.organizationSize}'),
                if (user.storageTypes.isNotEmpty) _row(Icons.kitchen_outlined, 'Storage', user.storageTypes.join(', ')),
              ]),
            ),
            if (user.isReceiver) ...[
              const SectionTitle('Verification'),
              _verificationCard(context, user),
            ],
            const SizedBox(height: 12),
            Card(
              child: Column(children: [
                ListTile(
                  leading: const Icon(Icons.notifications_none_rounded),
                  title: const Text('Notifications'),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const NotificationsScreen())),
                ),
                if (user.isDonor)
                  ListTile(
                    leading: const Icon(Icons.local_shipping_outlined),
                    title: const Text('Pickup history'),
                    trailing: const Icon(Icons.chevron_right_rounded),
                    onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PickupHistoryScreen())),
                  ),
                ListTile(
                  leading: const Icon(Icons.dns_outlined),
                  title: const Text('Server'),
                  subtitle: Text(state.serverUrl),
                ),
              ]),
            ),
            const SizedBox(height: 20),
            OutlinedButton.icon(
              style: OutlinedButton.styleFrom(foregroundColor: cs.error),
              onPressed: () async {
                final ok = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Log out?'),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                      FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Log out')),
                    ],
                  ),
                );
                if (ok == true) await state.logout();
              },
              icon: const Icon(Icons.logout_rounded),
              label: const Text('Log out'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _verificationCard(BuildContext context, User user) {
    final cs = Theme.of(context).colorScheme;
    final (tone, icon, title, message) = user.verified
        ? ('ok', Icons.verified_rounded, 'Verified', 'Your organization can request food and receive pickup tickets.')
        : user.isRejected
            ? (
                'danger',
                Icons.gpp_bad_outlined,
                'Verification rejected',
                user.rejectionReason ?? 'An admin could not verify your organization.',
              )
            : (
                'warn',
                Icons.hourglass_top_rounded,
                'Awaiting admin verification',
                user.verificationDocuments.isEmpty
                    ? 'Upload a registration certificate or licence so an admin can verify you.'
                    : 'Your documents are with an admin. Pull down to check your status.',
              );
    final t = Tone.of(context, tone);
    final docs = user.verificationDocuments;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: t.bg, borderRadius: BorderRadius.circular(14)),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Icon(icon, color: t.fg),
              const SizedBox(width: 10),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(title, style: TextStyle(color: t.fg, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 2),
                  Text(message, style: TextStyle(color: t.fg, fontSize: 13, height: 1.35)),
                ]),
              ),
            ]),
          ),
          if (user.isRejected)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text('Uploading a new document sends your account back for review.',
                  style: TextStyle(fontSize: 12.5, color: cs.outline)),
            ),
          if (docs.isNotEmpty) ...[
            const SizedBox(height: 8),
            for (final d in docs)
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(
                  d.toLowerCase().endsWith('.pdf') ? Icons.picture_as_pdf_outlined : Icons.image_outlined,
                  color: cs.primary,
                ),
                title: Text(documentLabel(d), maxLines: 1, overflow: TextOverflow.ellipsis),
                // Approved accounts keep their documents; the backend refuses removal.
                trailing: user.verified
                    ? null
                    : IconButton(
                        tooltip: 'Remove',
                        icon: const Icon(Icons.delete_outline_rounded),
                        onPressed: _docBusy ? null : () => _removeDocument(user, d),
                      ),
              ),
          ],
          if (!user.verified) ...[
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: _docBusy ? null : () => _addDocument(user),
              icon: _docBusy
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.upload_file_rounded),
              label: Text(docs.isEmpty ? 'Upload document' : 'Add another document'),
            ),
            const SizedBox(height: 4),
            Text('PDF or image, up to 10MB', textAlign: TextAlign.center, style: TextStyle(fontSize: 11.5, color: cs.outline)),
          ],
        ]),
      ),
    );
  }

  static bool _has(String? v) => v != null && v.trim().isNotEmpty;

  Widget _whitePill(String text) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
        decoration: BoxDecoration(color: const Color(0x33FFFFFF), borderRadius: BorderRadius.circular(99)),
        child: Text(text, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)),
      );

  Widget _row(IconData icon, String label, String value) => ListTile(
        leading: Icon(icon),
        title: Text(label, style: const TextStyle(fontSize: 12.5)),
        subtitle: Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
      );
}

/// Photo (or initial) with a camera badge; tap to change.
class _Avatar extends StatelessWidget {
  final User user;
  final String? url;
  final bool busy;
  final VoidCallback? onTap;
  const _Avatar({required this.user, required this.url, required this.busy, this.onTap});

  @override
  Widget build(BuildContext context) {
    final initial = Center(
      child: Text(user.initial, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: Brand.primary)),
    );
    return Semantics(
      button: true,
      label: url == null ? 'Add profile photo' : 'Change profile photo',
      child: GestureDetector(
        onTap: onTap,
        child: SizedBox(
          width: 68,
          height: 68,
          child: Stack(clipBehavior: Clip.none, children: [
            Container(
              width: 68,
              height: 68,
              decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
              clipBehavior: Clip.antiAlias,
              child: url == null
                  ? initial
                  : Image.network(url!, fit: BoxFit.cover, errorBuilder: (_, _, _) => initial),
            ),
            if (busy)
              Container(
                decoration: const BoxDecoration(color: Color(0xB3FFFFFF), shape: BoxShape.circle),
                child: const Center(child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2.5))),
              ),
            Positioned(
              right: -2,
              bottom: -2,
              child: Container(
                padding: const EdgeInsets.all(5),
                decoration: BoxDecoration(
                  color: Brand.accent,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                ),
                child: const Icon(Icons.photo_camera_rounded, size: 13, color: Colors.white),
              ),
            ),
          ]),
        ),
      ),
    );
  }
}
