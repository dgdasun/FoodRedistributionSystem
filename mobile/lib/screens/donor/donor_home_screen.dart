import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/app_state.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../widgets/common.dart';
import '../notifications_screen.dart';
import 'pickup_history_screen.dart';

/// Donor dashboard: impact stats, next pickup and recent listings, from
/// GET /api/dashboard/{donorId}.
class DonorHomeScreen extends StatelessWidget {
  /// Switches the bottom tab (1 = Donations, 2 = Requests, 3 = Scan).
  final void Function(int) onNavigate;
  const DonorHomeScreen({super.key, required this.onNavigate});

  @override
  Widget build(BuildContext context) {
    final state = context.read<AppState>();
    final user = state.user!;
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: Text('Hi, ${user.name.split(' ').last}'),
        actions: const [NotificationBell(), SizedBox(width: 8)],
      ),
      body: AsyncView<Map<String, dynamic>>(
        load: () => state.api.get('/dashboard/${user.id}'),
        builder: (context, d, reload) {
          final stats = (d['stats'] as Map?) ?? {};
          final next = d['nextPickup'] as Map?;
          final recent = (d['recentDonations'] as List?) ?? [];
          final pending = (d['pendingRequests'] as num?)?.toInt() ?? 0;
          num n(String k) => (stats[k] as num?) ?? 0;

          return ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(24),
                  gradient: const LinearGradient(
                    colors: [Brand.primaryDark, Brand.primary],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(user.organizationName ?? 'Your impact',
                      style: const TextStyle(color: Color(0xCCFFFFFF), fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Text.rich(TextSpan(children: [
                    TextSpan(
                      text: formatKg(n('totalFoodKg').toDouble()),
                      style: const TextStyle(color: Colors.white, fontSize: 40, fontWeight: FontWeight.w800, letterSpacing: -1.5),
                    ),
                    const TextSpan(
                      text: ' kg rescued',
                      style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700),
                    ),
                  ])),
                  const SizedBox(height: 4),
                  Text('≈ ${n('mealsEquivalent')} meals · ${formatKg(n('co2SavedKg').toDouble())} kg CO₂ saved',
                      style: const TextStyle(color: Color(0xDDFFFFFF))),
                ]),
              ),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(
                  child: StatTile(value: '${d['activeListings'] ?? 0}', label: 'Live listings', icon: Icons.storefront_rounded),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: StatTile(
                    value: '$pending',
                    label: 'Pending requests',
                    icon: Icons.inbox_rounded,
                    color: const Color(0xFFD97706),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: StatTile(
                    value: '${n('peopleHelped')}',
                    label: 'People helped',
                    icon: Icons.groups_rounded,
                    color: const Color(0xFF0369A1),
                  ),
                ),
              ]),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () => onNavigate(3),
                    icon: const Icon(Icons.qr_code_scanner_rounded),
                    label: const Text('Scan pickup'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => onNavigate(2),
                    icon: Badge(isLabelVisible: pending > 0, label: Text('$pending'), child: const Icon(Icons.inbox_rounded)),
                    label: const Text('Requests'),
                  ),
                ),
              ]),
              Center(
                child: TextButton.icon(
                  onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PickupHistoryScreen())),
                  icon: const Icon(Icons.history_rounded, size: 18),
                  label: const Text('Pickup history'),
                ),
              ),
              if (next != null && next['itemName'] != null) ...[
                const SectionTitle('Next pickup'),
                Card(
                  child: ListTile(
                    contentPadding: const EdgeInsets.all(14),
                    leading: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(color: cs.primary.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(14)),
                      child: Icon(Icons.local_shipping_rounded, color: cs.primary),
                    ),
                    title: Text('${next['itemName']} · ${formatKg((next['quantityKg'] as num? ?? 0).toDouble())} kg',
                        style: const TextStyle(fontWeight: FontWeight.w800)),
                    subtitle: Text('${next['date']} at ${next['time'] ?? '—'}\n${next['pickupLocation'] ?? ''}'),
                    isThreeLine: true,
                  ),
                ),
              ],
              SectionTitle('Recent listings', trailing: TextButton(onPressed: () => onNavigate(1), child: const Text('See all'))),
              if (recent.isEmpty)
                const EmptyState(
                  icon: Icons.inventory_2_outlined,
                  title: 'No listings yet',
                  message: 'Add surplus stock from the Donations tab.',
                )
              else
                Card(
                  child: Column(children: [
                    for (final r in recent.take(5))
                      ListTile(
                        title: Text('${r['name']}', style: const TextStyle(fontWeight: FontWeight.w700)),
                        subtitle: Text('${formatKg((r['quantityKg'] as num? ?? 0).toDouble())} kg'),
                        trailing: Pill(
                          '${r['status']}'.toLowerCase(),
                          tone: switch ('${r['status']}') {
                            'COMPLETED' => 'ok',
                            'SCHEDULED' => 'info',
                            'EXPIRED' => 'danger',
                            _ => 'warn',
                          },
                        ),
                      ),
                  ]),
                ),
            ],
          );
        },
      ),
    );
  }
}
