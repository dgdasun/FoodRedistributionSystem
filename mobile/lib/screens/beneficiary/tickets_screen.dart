import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../core/app_state.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../widgets/common.dart';
import '../notifications_screen.dart';

class TicketsScreen extends StatefulWidget {
  const TicketsScreen({super.key});

  @override
  State<TicketsScreen> createState() => _TicketsScreenState();
}

class _TicketsScreenState extends State<TicketsScreen> {
  String? _tab; // null until data arrives, then defaults to "active" or "all"
  late final Timer _tick;

  @override
  void initState() {
    super.initState();
    // Keeps the collection-window countdowns live.
    _tick = Timer.periodic(const Duration(seconds: 30), (_) => mounted ? setState(() {}) : null);
  }

  @override
  void dispose() {
    _tick.cancel();
    super.dispose();
  }

  Future<List<Ticket>> _load() async {
    final state = context.read<AppState>();
    final data = await state.api.get('/tickets?beneficiaryId=${state.user!.id}');
    return (data['tickets'] as List? ?? []).map((e) => Ticket.fromJson(e)).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My tickets'), actions: const [NotificationBell(), SizedBox(width: 8)]),
      body: AsyncView<List<Ticket>>(
        load: _load,
        builder: (context, all, reload) {
          final now = DateTime.now();
          final counts = {'active': 0, 'collected': 0, 'expired': 0, 'all': all.length};
          for (final t in all) {
            counts[t.displayStatus(now)] = counts[t.displayStatus(now)]! + 1;
          }
          final tab = _tab ?? (counts['active']! > 0 ? 'active' : 'all');
          const rank = {'active': 0, 'collected': 1, 'expired': 2};
          final visible = all.where((t) => tab == 'all' || t.displayStatus(now) == tab).toList()
            ..sort((a, b) {
              final r = rank[a.displayStatus(now)]!.compareTo(rank[b.displayStatus(now)]!);
              if (r != 0) return r;
              return (a.expiresAt ?? DateTime(0)).compareTo(b.expiresAt ?? DateTime(0));
            });

          return ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.only(bottom: 24),
            children: [
              SizedBox(
                height: 44,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
                  children: [
                    for (final (k, label) in const [
                      ('active', 'Ready'),
                      ('collected', 'Collected'),
                      ('expired', 'Expired'),
                      ('all', 'All'),
                    ]) ...[
                      ChoiceChip(
                        label: Text('$label  ${counts[k]}'),
                        selected: tab == k,
                        onSelected: (_) => setState(() => _tab = k),
                      ),
                      const SizedBox(width: 8),
                    ],
                  ],
                ),
              ),
              if (visible.isEmpty)
                EmptyState(
                  icon: Icons.confirmation_number_outlined,
                  title: all.isEmpty ? 'No tickets yet' : 'No tickets here',
                  message: all.isEmpty
                      ? 'Once a donor approves your request, your pickup pass will appear here.'
                      : 'There are no tickets with this status.',
                )
              else
                for (final t in visible)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
                    child: TicketCard(ticket: t, now: now),
                  ),
            ],
          );
        },
      ),
    );
  }
}

/// Boarding-pass ticket: QR stub on top, perforation, then the details.
class TicketCard extends StatelessWidget {
  final Ticket ticket;
  final DateTime now;
  const TicketCard({super.key, required this.ticket, required this.now});

  void _openFullscreen(BuildContext context) {
    Navigator.of(context).push(MaterialPageRoute(
      fullscreenDialog: true,
      builder: (_) => _QrFullscreen(ticket: ticket),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final status = ticket.displayStatus(now);
    final (label, tone) = switch (status) {
      'collected' => ('Collected', 'ok'),
      'expired' => ('Expired', 'danger'),
      _ => ('Ready for pickup', 'warn'),
    };
    final active = status == 'active';

    // Collection window progress.
    String? left;
    double? pct;
    if (ticket.expiresAt != null) {
      final remaining = ticket.expiresAt!.difference(now);
      left = switch (status) {
        'collected' => 'Picked up',
        'expired' => 'Window closed ${formatTime(ticket.expiresAt!)}',
        _ => '${formatDuration(remaining)} left · until ${formatTime(ticket.expiresAt!)}',
      };
      final windowH = ticket.collectionWindowHours ?? 0;
      if (windowH > 0) {
        pct = status == 'collected'
            ? 1
            : status == 'expired'
                ? 0
                : (remaining.inMinutes / (windowH * 60)).clamp(0.0, 1.0);
      }
    }
    final barTone = status == 'expired'
        ? 'danger'
        : (active && ticket.expiresAt != null && ticket.expiresAt!.difference(now).inMinutes <= 60)
            ? 'warn'
            : 'ok';

    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(children: [
        // Stub
        InkWell(
          onTap: ticket.qrCode == null ? null : () => _openFullscreen(context),
          child: Container(
            width: double.infinity,
            color: cs.primary.withValues(alpha: 0.07),
            padding: const EdgeInsets.fromLTRB(18, 18, 18, 14),
            child: Row(children: [
              Stack(alignment: Alignment.center, children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
                  child: ticket.qrCode == null
                      ? const SizedBox(width: 108, height: 108)
                      : QrImageView(data: ticket.qrCode!, size: 108, padding: EdgeInsets.zero),
                ),
                if (!active)
                  Container(
                    width: 124,
                    height: 124,
                    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.82), borderRadius: BorderRadius.circular(14)),
                    alignment: Alignment.center,
                    child: Pill(label, tone: tone, icon: status == 'collected' ? Icons.check_rounded : Icons.timer_off_outlined),
                  ),
              ]),
              const SizedBox(width: 16),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Pill(label, tone: tone, dot: true),
                  const SizedBox(height: 8),
                  Text(ticket.item?.name ?? 'Food item',
                      style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800, letterSpacing: -0.4)),
                  const SizedBox(height: 2),
                  Text('#${ticket.id}', style: TextStyle(fontFamily: 'monospace', fontSize: 12, color: cs.outline)),
                  if (active) ...[
                    const SizedBox(height: 8),
                    Row(children: [
                      Icon(Icons.fullscreen_rounded, size: 16, color: cs.primary),
                      const SizedBox(width: 4),
                      Text('Tap to enlarge for scanning',
                          style: TextStyle(fontSize: 12, color: cs.primary, fontWeight: FontWeight.w600)),
                    ]),
                  ],
                ]),
              ),
            ]),
          ),
        ),
        const _Perforation(),
        Padding(
          padding: const EdgeInsets.fromLTRB(18, 10, 18, 16),
          child: Column(children: [
            Row(children: [
              _Field(icon: Icons.scale_outlined, label: 'Quantity', value: '${formatKg(ticket.quantityKg)} kg'),
              _Field(icon: Icons.event_outlined, label: 'Date', value: ticket.pickupDate ?? 'TBC'),
              _Field(
                icon: Icons.schedule_rounded,
                label: 'Window',
                value: ticket.collectionWindowHours != null ? '${ticket.collectionWindowHours} h' : (ticket.pickupTime ?? '—'),
              ),
            ]),
            const SizedBox(height: 12),
            Row(children: [
              Icon(Icons.location_on_outlined, size: 16, color: cs.outline),
              const SizedBox(width: 6),
              Expanded(child: Text(ticket.pickupLocation, style: const TextStyle(fontWeight: FontWeight.w600))),
            ]),
            if (left != null) ...[
              const SizedBox(height: 14),
              Row(children: [
                Expanded(child: Text(left, style: TextStyle(fontSize: 12.5, color: cs.outline, fontWeight: FontWeight.w600))),
              ]),
              if (pct != null) ...[
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(99),
                  child: LinearProgressIndicator(
                    value: pct,
                    minHeight: 6,
                    backgroundColor: cs.surfaceContainerHighest,
                    color: Tone.of(context, barTone).fg,
                  ),
                ),
              ],
            ],
          ]),
        ),
      ]),
    );
  }
}

class _Field extends StatelessWidget {
  final IconData icon;
  final String label, value;
  const _Field({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Expanded(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(icon, size: 13, color: cs.outline),
          const SizedBox(width: 4),
          Text(label.toUpperCase(), style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, letterSpacing: 0.6, color: cs.outline)),
        ]),
        const SizedBox(height: 3),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w700), maxLines: 1, overflow: TextOverflow.ellipsis),
      ]),
    );
  }
}

/// Dashed tear line with half-circle notches on both edges.
class _Perforation extends StatelessWidget {
  const _Perforation();

  @override
  Widget build(BuildContext context) {
    final bg = Theme.of(context).scaffoldBackgroundColor;
    final line = Theme.of(context).colorScheme.outlineVariant;
    return SizedBox(
      height: 20,
      child: Row(children: [
        _notch(bg, left: true),
        Expanded(
          child: LayoutBuilder(
            builder: (_, c) => Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: List.generate(
                (c.maxWidth / 10).floor(),
                (_) => Container(width: 5, height: 2, color: line),
              ),
            ),
          ),
        ),
        _notch(bg, left: false),
      ]),
    );
  }

  Widget _notch(Color bg, {required bool left}) => Container(
        width: 10,
        height: 20,
        decoration: BoxDecoration(
          color: bg,
          borderRadius: left
              ? const BorderRadius.horizontal(right: Radius.circular(10))
              : const BorderRadius.horizontal(left: Radius.circular(10)),
        ),
      );
}

class _QrFullscreen extends StatelessWidget {
  final Ticket ticket;
  const _QrFullscreen({required this.ticket});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Brand.primaryDark,
      appBar: AppBar(
        backgroundColor: Brand.primaryDark,
        foregroundColor: Colors.white,
        title: const Text('Show to donor', style: TextStyle(color: Colors.white)),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(28)),
              child: QrImageView(data: ticket.qrCode ?? '', size: 260, padding: EdgeInsets.zero),
            ),
            const SizedBox(height: 22),
            Text(ticket.item?.name ?? 'Food item',
                style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text('${formatKg(ticket.quantityKg)} kg · Ticket ${ticket.id}', style: const TextStyle(color: Color(0xCCFFFFFF))),
            const SizedBox(height: 4),
            Text(ticket.pickupLocation, style: const TextStyle(color: Color(0xCCFFFFFF)), textAlign: TextAlign.center),
          ]),
        ),
      ),
    );
  }
}
