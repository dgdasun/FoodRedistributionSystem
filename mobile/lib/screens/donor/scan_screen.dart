import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';

import '../../core/app_state.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../widgets/common.dart';

/// Confirms a pickup: scan the beneficiary's QR (or type the ticket ID) and
/// POST /api/tickets/scan marks the ticket, request and item collected.
class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key});

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  bool _scanning = false, _busy = false;
  String? _error;
  final _manual = TextEditingController();

  Future<void> _complete(String code) async {
    if (_busy || code.trim().isEmpty) return;
    final state = context.read<AppState>();
    setState(() {
      _busy = true;
      _error = null;
      _scanning = false;
    });
    try {
      final data = await state.api.post('/tickets/scan', {'qrCode': code.trim(), 'donorId': state.user!.id});
      final ticket = data['ticket'] is Map<String, dynamic> ? Ticket.fromJson(data['ticket']) : null;
      final item = data['item'] is Map<String, dynamic> ? Donation.fromJson(data['item']) : null;
      _manual.clear();
      if (!mounted) return;
      await showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          icon: const Icon(Icons.check_circle_rounded, color: Brand.primary, size: 56),
          title: const Text('Pickup confirmed'),
          content: Text(
            '${item?.name ?? 'Item'}${ticket != null ? ' · ${formatKg(ticket.quantityKg)} kg' : ''}\n'
            'Marked as collected. Thank you for rescuing food!',
            textAlign: TextAlign.center,
          ),
          actions: [FilledButton(onPressed: () => Navigator.pop(ctx), child: const Text('Done'))],
        ),
      );
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    // Camera scanning needs a phone; on web/desktop builds only manual entry is offered.
    final cameraSupported = !kIsWeb && (defaultTargetPlatform == TargetPlatform.android || defaultTargetPlatform == TargetPlatform.iOS);

    return Scaffold(
      appBar: AppBar(title: const Text('Confirm pickup')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            clipBehavior: Clip.antiAlias,
            child: AspectRatio(
              aspectRatio: 1,
              child: _scanning
                  ? Stack(fit: StackFit.expand, children: [
                      MobileScanner(
                        onDetect: (capture) {
                          final code = capture.barcodes.firstOrNull?.rawValue;
                          if (code != null) _complete(code);
                        },
                        errorBuilder: (_, error) => Center(
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Text('Camera unavailable: ${error.errorCode.name}. Enter the ticket ID below.',
                                textAlign: TextAlign.center),
                          ),
                        ),
                      ),
                      Center(
                        child: Container(
                          width: 220,
                          height: 220,
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.white, width: 3),
                            borderRadius: BorderRadius.circular(24),
                          ),
                        ),
                      ),
                      Positioned(
                        top: 10,
                        right: 10,
                        child: IconButton.filled(
                          onPressed: () => setState(() => _scanning = false),
                          icon: const Icon(Icons.close_rounded),
                        ),
                      ),
                    ])
                  : Container(
                      color: cs.primary.withValues(alpha: 0.07),
                      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                        Icon(Icons.qr_code_scanner_rounded, size: 84, color: cs.primary),
                        const SizedBox(height: 14),
                        const Text('Scan the beneficiary\'s QR code',
                            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                        const SizedBox(height: 4),
                        Text('Ask them to open the ticket in their app',
                            style: TextStyle(color: cs.outline, fontSize: 13)),
                        const SizedBox(height: 18),
                        if (_busy)
                          const CircularProgressIndicator()
                        else
                          FilledButton.icon(
                            onPressed: cameraSupported ? () => setState(() => _scanning = true) : null,
                            icon: const Icon(Icons.photo_camera_rounded),
                            label: Text(cameraSupported ? 'Open camera' : 'Camera needs the phone app'),
                          ),
                      ]),
                    ),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: Tone.of(context, 'danger').bg, borderRadius: BorderRadius.circular(16)),
              child: Row(children: [
                Icon(Icons.error_outline_rounded, color: Tone.of(context, 'danger').fg),
                const SizedBox(width: 10),
                Expanded(child: Text(_error!, style: TextStyle(color: Tone.of(context, 'danger').fg))),
              ]),
            ),
          ],
          const SectionTitle('Or enter the ticket ID'),
          Row(children: [
            Expanded(
              child: TextField(
                controller: _manual,
                autocorrect: false,
                decoration: const InputDecoration(hintText: 'e.g. t-3cb084a2', prefixIcon: Icon(Icons.tag_rounded)),
                onSubmitted: _complete,
              ),
            ),
            const SizedBox(width: 10),
            FilledButton(onPressed: _busy ? null : () => _complete(_manual.text), child: const Text('Confirm')),
          ]),
        ],
      ),
    );
  }
}
