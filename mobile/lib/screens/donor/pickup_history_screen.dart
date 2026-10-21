import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/app_state.dart';
import '../../core/models.dart';
import '../../widgets/common.dart';

/// Every collection ticket issued for this donor's items, from
/// GET /api/tickets?donorId= (web: PickupHistory.jsx).
class PickupHistoryScreen extends StatefulWidget {
  const PickupHistoryScreen({super.key});

  @override
  State<PickupHistoryScreen> createState() => _PickupHistoryScreenState();
}

class _PickupHistoryScreenState extends State<PickupHistoryScreen> {
  String _tab = 'all';

  Future<List<Ticket>> _load() async {
    final state = context.read<AppState>();
    final data = await state.api.get('/tickets?donorId=${state.user!.id}');
    final list = (data['tickets'] as List? ?? []).map((e) => Ticket.fromJson(e)).toList();
    // Newest window first; tickets without one go last.
    list.sort((a, b) => (b.expiresAt ?? DateTime(0)).compareTo(a.expiresAt ?? DateTime(0)));
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Pickup history')),
      body: AsyncView<List<Ticket>>(
        load: _load,
        builder: (context, all, reload) {
          final now = DateTime.now();
          final counts = {'all': all.length, 'active': 0, 'collected': 0, 'expired': 0};
          for (final t in all) {
            counts[t.displayStatus(now)] = counts[t.displayStatus(now)]! + 1;
          }
          final collectedKg = all
              .where((t) => t.displayStatus(now) == 'collected')
              .fold<double>(0, (s, t) => s + t.quantityKg);
          final visible = all.where((t) => _tab == 'all' || t.displayStatus(now) == _tab).toList();

          return ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.only(bottom: 24),
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
                child: Row(children: [
                  Expanded(
                    child: StatTile(value: '${counts['collected']}', label: 'Collected', icon: Icons.check_circle_rounded),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: StatTile(
                      value: formatKg(collectedKg),
                      unit: 'kg',
                      label: 'Handed over',
                      icon: Icons.scale_rounded,
                      color: const Color(0xFF0369A1),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: StatTile(
                      value: '${counts['active']}',
                      label: 'Awaiting',
                      icon: Icons.schedule_rounded,
                      color: const Color(0xFFD97706),
                    ),
                  ),
                ]),
              ),
              SizedBox(
                height: 40,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  children: [
                    for (final (k, label) in const [
                      ('all', 'All'),
                      ('active', 'Awaiting pickup'),
                      ('collected', 'Collected'),
                      ('expired', 'Expired'),
                    ]) ...[
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
              if (visible.isEmpty)
                EmptyState(
                  icon: Icons.local_shipping_outlined,
                  title: all.isEmpty ? 'No pickups yet' : 'Nothing here',
                  message: all.isEmpty
                      ? 'A ticket appears here each time you approve a request.'
                      : 'No tickets have this status.',
                )
              else
                for (final t in visible)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
                    child: Card(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Row(children: [
                          FoodImage(category: t.item?.category, width: 56, height: 56),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text(t.item?.name ?? 'Item', style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w800)),
                              const SizedBox(height: 2),
                              Text(
                                '${formatKg(t.quantityKg)} kg · ${t.pickupDate ?? 'TBC'}'
                                '${t.pickupTime != null ? ' · ${t.pickupTime}' : ''}',
                                style: TextStyle(fontSize: 12.5, color: cs.outline),
                              ),
                              Text('#${t.id}', style: TextStyle(fontFamily: 'monospace', fontSize: 11.5, color: cs.outline)),
                            ]),
                          ),
                          const SizedBox(width: 8),
                          switch (t.displayStatus(now)) {
                            'collected' => const Pill('Collected', tone: 'ok', dot: true),
                            'expired' => const Pill('Expired', tone: 'danger', dot: true),
                            _ => const Pill('Awaiting', tone: 'warn', dot: true),
                          },
                        ]),
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
