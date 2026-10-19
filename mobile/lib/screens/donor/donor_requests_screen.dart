import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/app_state.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../widgets/common.dart';
import '../notifications_screen.dart';

/// Same quick picks as the web RequestDetailModal.
const _quickReasons = [
  'Allocated to a more urgent request',
  'Not enough quantity left',
  'Pickup distance too far',
  'Item no longer available',
];

class DonorRequestsScreen extends StatefulWidget {
  const DonorRequestsScreen({super.key});

  @override
  State<DonorRequestsScreen> createState() => _DonorRequestsScreenState();
}

class _DonorRequestsScreenState extends State<DonorRequestsScreen> {
  final _key = GlobalKey<AsyncViewState<List<FoodRequest>>>();
  String _tab = 'pending';

  Future<List<FoodRequest>> _load() async {
    final state = context.read<AppState>();
    final data = await state.api.get('/requests?donorId=${state.user!.id}');
    final list = (data['requests'] as List? ?? []).map((e) => FoodRequest.fromJson(e)).toList();
    const urgencyRank = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3};
    list.sort((a, b) {
      final u = (urgencyRank[a.urgency] ?? 2).compareTo(urgencyRank[b.urgency] ?? 2);
      return u != 0 ? u : (b.createdAt ?? DateTime(0)).compareTo(a.createdAt ?? DateTime(0));
    });
    return list;
  }

  Future<void> _open(FoodRequest r) async {
    final changed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => _DecisionSheet(request: r),
    );
    if (changed == true) _key.currentState?.reload();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Food requests'), actions: const [NotificationBell(), SizedBox(width: 8)]),
      body: AsyncView<List<FoodRequest>>(
        key: _key,
        load: _load,
        builder: (context, all, reload) {
          bool inTab(FoodRequest r) => switch (_tab) {
                'pending' => r.status == 'pending',
                'offered' => r.status == 'counter_offer',
                'approved' => r.status == 'approved' || r.status == 'collected',
                'closed' => r.status == 'rejected' || r.status == 'cancelled',
                _ => true,
              };
          final visible = all.where(inTab).toList();
          int count(String s) => all.where((r) => r.status == s).length;
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
                    for (final (k, label) in [
                      ('pending', 'To review  ${count('pending')}'),
                      ('offered', 'Offered  ${count('counter_offer')}'),
                      ('approved', 'Approved'),
                      ('closed', 'Closed'),
                      ('all', 'All  ${all.length}'),
                    ]) ...[
                      ChoiceChip(label: Text(label), selected: _tab == k, onSelected: (_) => setState(() => _tab = k)),
                      const SizedBox(width: 8),
                    ],
                  ],
                ),
              ),
              if (visible.isEmpty)
                EmptyState(
                  icon: Icons.inbox_outlined,
                  title: _tab == 'pending' ? 'All caught up' : 'Nothing here',
                  message: _tab == 'pending'
                      ? 'No requests are waiting for your decision.'
                      : 'No requests have this status.',
                )
              else
                for (final r in visible)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                    child: Card(
                      clipBehavior: Clip.antiAlias,
                      child: InkWell(
                        onTap: r.status == 'pending' ? () => _open(r) : null,
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Row(children: [
                              CircleAvatar(
                                backgroundColor: cs.primary.withValues(alpha: 0.12),
                                child: Text(r.requesterName[0].toUpperCase(),
                                    style: TextStyle(color: cs.primary, fontWeight: FontWeight.w800)),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Text(r.requesterName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                                  Text(
                                    '${r.beneficiary?['role'] == 'farm' ? 'Farm / compost' : (r.beneficiary?['orgType'] ?? 'Beneficiary')}'
                                    '${r.beneficiary?['location'] != null ? ' · ${r.beneficiary!['location']}' : ''}',
                                    style: TextStyle(fontSize: 12.5, color: cs.outline),
                                  ),
                                ]),
                              ),
                              Pill(r.urgency, tone: urgencyTone(r.urgency), dot: true),
                            ]),
                            const SizedBox(height: 12),
                            Row(children: [
                              FoodImage(category: r.item?.category, width: 40, height: 40, radius: 12),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text.rich(TextSpan(children: [
                                  TextSpan(
                                    text: '${formatKg(r.quantityKg)} kg ',
                                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                                  ),
                                  TextSpan(text: 'of ${r.item?.name ?? 'item'}'),
                                ])),
                              ),
                              Pill(requestStatus(r.status).$1, tone: requestStatus(r.status).$2),
                            ]),
                            if (r.status == 'pending') ...[
                              const SizedBox(height: 12),
                              SizedBox(
                                width: double.infinity,
                                child: FilledButton.tonal(onPressed: () => _open(r), child: const Text('Review request')),
                              ),
                            ],
                            if (r.status == 'counter_offer')
                              Padding(
                                padding: const EdgeInsets.only(top: 10),
                                child: Text('You offered ${formatKg(r.offeredKg)} kg - waiting for the requester to accept.',
                                    style: TextStyle(fontSize: 12.5, color: Tone.of(context, 'violet').fg)),
                              ),
                          ]),
                        ),
                      ),
                    ),
                  ),
            ],
          );
        },
      ),
    );
  }
}

class _DecisionSheet extends StatefulWidget {
  final FoodRequest request;
  const _DecisionSheet({required this.request});

  @override
  State<_DecisionSheet> createState() => _DecisionSheetState();
}

class _DecisionSheetState extends State<_DecisionSheet> {
  late double _qty;
  bool _declining = false, _busy = false;
  String _reason = '';
  String? _error;

  FoodRequest get r => widget.request;
  double get _available => r.item?.quantityKg ?? r.quantityKg;
  double get _max => r.quantityKg < _available ? r.quantityKg : _available;

  @override
  void initState() {
    super.initState();
    _qty = _max;
  }

  Future<void> _send(String status, Map<String, dynamic> extra) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await context.read<AppState>().api.patch('/requests/${r.id}', {'status': status, ...extra});
      if (!mounted) return;
      showSnack(
        context,
        status == 'rejected'
            ? 'Request declined.'
            : _qty < r.quantityKg
                ? 'Partial offer of ${formatKg(_qty)} kg sent.'
                : 'Approved - a pickup ticket was issued.',
      );
      Navigator.pop(context, true);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final partial = _qty < r.quantityKg;
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(r.requesterName, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text('Requested ${formatKg(r.quantityKg)} kg of ${r.item?.name ?? 'item'} · ${formatKg(_available)} kg left',
              style: TextStyle(color: cs.outline)),
          const SizedBox(height: 8),
          Wrap(spacing: 6, children: [
            Pill('${r.urgency} urgency', tone: urgencyTone(r.urgency), dot: true),
            if (r.beneficiary?['verified'] == true) const Pill('Verified', tone: 'ok', icon: Icons.verified_rounded),
          ]),
          const SizedBox(height: 20),
          if (!_declining) ...[
            const Text('Quantity to give', style: TextStyle(fontWeight: FontWeight.w700)),
            Slider(
              value: _qty,
              min: _max < 1 ? 0 : 1,
              max: _max,
              divisions: (_max - 1).round() > 0 ? (_max - 1).round() : null,
              label: '${formatKg(_qty)} kg',
              // Whole kilos, except the exact maximum so a 5.5 kg item can be given in full.
              onChanged: _max <= 1
                  ? null
                  : (v) => setState(() => _qty = v >= _max - 0.5 ? _max : v.roundToDouble().clamp(1, _max)),
            ),
            Center(
              child: Text('${formatKg(_qty)} kg${partial ? '  (partial offer)' : ''}',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: partial ? Tone.of(context, 'violet').fg : null)),
            ),
            if (partial)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text('The requester must accept a partial offer before a ticket is issued.',
                    textAlign: TextAlign.center, style: TextStyle(fontSize: 12.5, color: cs.outline)),
              ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: TextStyle(color: cs.error)),
            ],
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: _busy || _qty <= 0 ? null : () => _send('approved', {'approvedQuantityKg': _qty}),
              icon: const Icon(Icons.check_rounded),
              label: Text(partial ? 'Offer ${formatKg(_qty)} kg' : 'Approve ${formatKg(_qty)} kg'),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              style: OutlinedButton.styleFrom(foregroundColor: Tone.of(context, 'danger').fg),
              onPressed: _busy ? null : () => setState(() => _declining = true),
              icon: const Icon(Icons.block_rounded),
              label: const Text('Decline'),
            ),
          ] else ...[
            const Text('Reason (shown to the requester)', style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            Wrap(spacing: 8, runSpacing: 8, children: [
              for (final q in _quickReasons)
                ChoiceChip(label: Text(q), selected: _reason == q, onSelected: (_) => setState(() => _reason = q)),
            ]),
            const SizedBox(height: 12),
            TextField(
              onChanged: (v) => setState(() => _reason = v),
              decoration: const InputDecoration(hintText: 'Or write your own reason…'),
              maxLines: 2,
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: TextStyle(color: cs.error)),
            ],
            const SizedBox(height: 20),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: const Color(0xFFB91C1C)),
              onPressed: _busy || _reason.trim().isEmpty ? null : () => _send('rejected', {'reason': _reason.trim()}),
              child: const Text('Decline request'),
            ),
            const SizedBox(height: 8),
            TextButton(onPressed: () => setState(() => _declining = false), child: const Text('Back')),
          ],
        ]),
      ),
    );
  }
}
