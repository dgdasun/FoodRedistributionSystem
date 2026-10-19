import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/app_state.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../widgets/common.dart';
import '../notifications_screen.dart';

const _tabs = [
  ('all', 'All'),
  ('action', 'Needs action'),
  ('pending', 'Pending'),
  ('approved', 'Approved'),
  ('collected', 'Collected'),
  ('closed', 'Closed'),
];

bool _inTab(FoodRequest r, String tab) => switch (tab) {
      'action' => r.status == 'counter_offer',
      'closed' => r.status == 'rejected' || r.status == 'cancelled',
      'all' => true,
      _ => r.status == tab,
    };

class MyRequestsScreen extends StatefulWidget {
  const MyRequestsScreen({super.key});

  @override
  State<MyRequestsScreen> createState() => _MyRequestsScreenState();
}

class _MyRequestsScreenState extends State<MyRequestsScreen> {
  String _tab = 'all';
  String? _busyId;

  Future<List<FoodRequest>> _load() async {
    final state = context.read<AppState>();
    final data = await state.api.get('/requests?beneficiaryId=${state.user!.id}');
    final list = (data['requests'] as List? ?? []).map((e) => FoodRequest.fromJson(e)).toList();
    list.sort((a, b) => (b.createdAt ?? DateTime(0)).compareTo(a.createdAt ?? DateTime(0)));
    return list;
  }

  Future<void> _act(FoodRequest r, String status, Future<void> Function() reload) async {
    setState(() => _busyId = r.id);
    try {
      await context.read<AppState>().api.patch('/requests/${r.id}', {'status': status});
      if (mounted) {
        showSnack(context, status == 'approved' ? 'Offer accepted - your ticket is ready.' : 'Offer declined.');
      }
      await reload();
    } catch (e) {
      if (mounted) showSnack(context, errorText(e), error: true);
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  void _showReason(FoodRequest r) {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Why was this declined?', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text('${r.item?.name ?? 'This item'} · ${formatKg(r.quantityKg)} kg requested',
              style: TextStyle(color: Theme.of(ctx).colorScheme.outline)),
          const SizedBox(height: 16),
          _Callout(tone: 'danger', text: r.rejectionReason ?? 'The donor was unable to fulfil this request.'),
          const SizedBox(height: 10),
          const _Callout(
            tone: 'ok',
            text: 'Food supplies change quickly, but your efforts matter! Check Available Food for newly posted surplus nearby.',
          ),
          const SizedBox(height: 18),
          SizedBox(width: double.infinity, child: FilledButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close'))),
        ]),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My requests'), actions: const [NotificationBell(), SizedBox(width: 8)]),
      body: AsyncView<List<FoodRequest>>(
        load: _load,
        builder: (context, all, reload) {
          final counts = {for (final (k, _) in _tabs) k: all.where((r) => _inTab(r, k)).length};
          final visible = all.where((r) => _inTab(r, _tab)).toList();
          final receivedKg =
              all.where((r) => r.status == 'collected').fold<double>(0, (s, r) => s + r.offeredKg);
          return ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.only(bottom: 24),
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
                child: Row(children: [
                  Expanded(child: StatTile(value: '${all.length}', label: 'Total', icon: Icons.inbox_rounded)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: StatTile(
                      value: '${counts['pending']! + counts['action']!}',
                      label: 'In progress',
                      icon: Icons.timelapse_rounded,
                      color: const Color(0xFFD97706),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: StatTile(
                      value: formatKg(receivedKg),
                      unit: 'kg',
                      label: 'Received',
                      icon: Icons.check_circle_rounded,
                      color: const Color(0xFF15803D),
                    ),
                  ),
                ]),
              ),
              if (counts['action']! > 0)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                  child: _Callout(
                    tone: 'violet',
                    icon: Icons.notification_important_rounded,
                    text:
                        '${counts['action']} partial offer${counts['action'] == 1 ? '' : 's'} waiting for you. Accept or decline so the food can move on.',
                  ),
                ),
              SizedBox(
                height: 40,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  children: [
                    for (final (k, label) in _tabs) ...[
                      ChoiceChip(
                        label: Text('$label  ${counts[k]}'),
                        selected: _tab == k,
                        onSelected: (_) => setState(() => _tab = k),
                      ),
                      const SizedBox(width: 8),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 6),
              if (visible.isEmpty)
                EmptyState(
                  icon: Icons.inbox_outlined,
                  title: all.isEmpty ? 'No requests yet' : 'Nothing here',
                  message: all.isEmpty
                      ? 'Find surplus food in the Food tab and send your first request.'
                      : 'No requests have this status right now.',
                )
              else
                for (final r in visible)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
                    child: _RequestCard(
                      r: r,
                      busy: _busyId == r.id,
                      onAccept: () => _act(r, 'approved', reload),
                      onDecline: () => _act(r, 'cancelled', reload),
                      onReason: () => _showReason(r),
                    ),
                  ),
            ],
          );
        },
      ),
    );
  }
}

class _Callout extends StatelessWidget {
  final String tone, text;
  final IconData? icon;
  const _Callout({required this.tone, required this.text, this.icon});

  @override
  Widget build(BuildContext context) {
    final t = Tone.of(context, tone);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: t.bg, borderRadius: BorderRadius.circular(16)),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (icon != null) ...[Icon(icon, color: t.fg, size: 20), const SizedBox(width: 10)],
        Expanded(child: Text(text, style: TextStyle(color: t.fg, fontSize: 13.5, height: 1.35, fontWeight: FontWeight.w500))),
      ]),
    );
  }
}

class _RequestCard extends StatelessWidget {
  final FoodRequest r;
  final bool busy;
  final VoidCallback onAccept, onDecline, onReason;
  const _RequestCard({required this.r, required this.busy, required this.onAccept, required this.onDecline, required this.onReason});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final (label, tone) = requestStatus(r.status);
    final partial = r.status == 'counter_offer';
    final step = switch (r.status) { 'approved' => 2, 'collected' => 3, _ => 1 };
    final stopped = r.status == 'rejected' || r.status == 'cancelled';

    return Card(
      shape: partial
          ? RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(22),
              side: BorderSide(color: Tone.of(context, 'violet').fg, width: 1.5),
            )
          : null,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            FoodImage(category: r.item?.category, width: 56, height: 56),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(r.item?.name ?? '—', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                const SizedBox(height: 2),
                Text('${r.item?.category ?? 'Item'} · ${formatDate(r.createdAt)}',
                    style: TextStyle(fontSize: 12.5, color: cs.outline)),
              ]),
            ),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text('${formatKg(partial ? r.offeredKg : r.quantityKg)} kg',
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
              if (partial) Text('of ${formatKg(r.quantityKg)} kg', style: TextStyle(fontSize: 11.5, color: cs.outline)),
            ]),
          ]),
          const SizedBox(height: 12),
          Row(children: [
            Pill(label, tone: tone, dot: true),
            const SizedBox(width: 6),
            Pill(r.urgency, tone: urgencyTone(r.urgency)),
            const Spacer(),
            for (var i = 1; i <= 3; i++)
              Container(
                width: 18,
                height: 4,
                margin: const EdgeInsets.only(left: 3),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(4),
                  color: stopped
                      ? (i == 1 ? Tone.of(context, 'danger').fg : cs.surfaceContainerHighest)
                      : (i <= step ? cs.primary : cs.surfaceContainerHighest),
                ),
              ),
          ]),
          if (partial) ...[
            const SizedBox(height: 10),
            Text('The donor can give ${formatKg(r.offeredKg)} kg of the ${formatKg(r.quantityKg)} kg you asked for.',
                style: TextStyle(fontSize: 13, color: Tone.of(context, 'violet').fg, fontWeight: FontWeight.w600)),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(
                child: FilledButton(
                  onPressed: busy ? null : onAccept,
                  child: Text('Accept ${formatKg(r.offeredKg)} kg'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed: busy ? null : onDecline,
                  style: OutlinedButton.styleFrom(foregroundColor: Tone.of(context, 'danger').fg),
                  child: const Text('Decline'),
                ),
              ),
            ]),
          ],
          if (r.status == 'pending') _note(context, 'Awaiting donor response'),
          if (r.status == 'approved') _note(context, 'Approved - your QR ticket is in the Tickets tab'),
          if (r.status == 'cancelled') _note(context, 'You declined this offer'),
          if (r.status == 'rejected')
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: onReason,
                icon: const Icon(Icons.info_outline_rounded, size: 18),
                label: const Text('View reason'),
              ),
            ),
        ]),
      ),
    );
  }

  Widget _note(BuildContext context, String text) => Padding(
        padding: const EdgeInsets.only(top: 10),
        child: Text(text, style: TextStyle(fontSize: 12.5, color: Theme.of(context).colorScheme.outline)),
      );
}
