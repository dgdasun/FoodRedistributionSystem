import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/app_state.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../widgets/common.dart';
import '../notifications_screen.dart';

/// Expiry state on the same fixed 7-day scale as the web FreshnessMeter.
(String label, String tone, double percent) freshness(Donation d) {
  final days = d.daysUntilExpiry;
  if (days == null || days < 0) return ('Expired', 'danger', 0);
  final pct = (days / 7).clamp(0.04, 1.0);
  if (days <= 1) return ('Urgent', 'warn', pct);
  return ('Expiring soon', 'warn', pct);
}

enum _Sort { expiry, quantity, name }

class BrowseScreen extends StatefulWidget {
  const BrowseScreen({super.key});

  @override
  State<BrowseScreen> createState() => _BrowseScreenState();
}

class _BrowseScreenState extends State<BrowseScreen> {
  final _key = GlobalKey<AsyncViewState<List<Donation>>>();
  String _query = '';
  String? _category;
  _Sort _sort = _Sort.expiry;

  Future<List<Donation>> _load() async {
    final user = context.read<AppState>().user!;
    final data = await context.read<AppState>().api.get('/donations?published=true');
    final all = (data['donations'] as List? ?? []).map((e) => Donation.fromJson(e)).toList();
    // Farms take expired stock for compost/feed; everyone else sees the rest.
    return all.where((d) => user.isFarm ? d.status == 'expired' : d.status != 'expired').toList();
  }

  List<Donation> _filter(List<Donation> items) {
    final q = _query.trim().toLowerCase();
    final list = items.where((d) {
      if (_category != null && d.category != _category) return false;
      if (q.isEmpty) return true;
      return [d.name, d.category, d.pickupLocation].any((f) => f.toLowerCase().contains(q));
    }).toList();
    switch (_sort) {
      case _Sort.expiry:
        list.sort((a, b) => (a.daysUntilExpiry ?? 999).compareTo(b.daysUntilExpiry ?? 999));
      case _Sort.quantity:
        list.sort((a, b) => b.quantityKg.compareTo(a.quantityKg));
      case _Sort.name:
        list.sort((a, b) => a.name.compareTo(b.name));
    }
    return list;
  }

  void _request(Donation d) async {
    final user = context.read<AppState>().user!;
    if (!user.verified) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          icon: const Icon(Icons.hourglass_top_rounded),
          title: const Text('Verification pending'),
          content: const Text('Your account is pending verification. Once approved by an admin, you can claim this item.'),
          actions: [FilledButton(onPressed: () => Navigator.pop(ctx), child: const Text('Got it'))],
        ),
      );
      return;
    }
    final sent = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => RequestSheet(item: d),
    );
    if (sent == true) _key.currentState?.reload();
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AppState>().user!;
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: Text(user.isFarm ? 'Expired food' : 'Available food'),
        actions: const [NotificationBell(), SizedBox(width: 8)],
      ),
      body: AsyncView<List<Donation>>(
        key: _key,
        load: _load,
        builder: (context, items, reload) {
          final categories = items.map((d) => d.category).toSet().toList()..sort();
          final visible = _filter(items);
          final totalKg = items.fold<double>(0, (s, d) => s + d.quantityKg);
          return CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
                sliver: SliverList.list(children: [
                  if (!user.verified)
                    Card(
                      color: const Color(0xFFFEF3C7),
                      child: const ListTile(
                        leading: Icon(Icons.hourglass_top_rounded, color: Color(0xFFB45309)),
                        title: Text('Pending verification', style: TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF16200F))),
                        subtitle: Text('You can browse, but requests need admin verification first.',
                            style: TextStyle(color: Color(0xFF4D5945))),
                      ),
                    ),
                  if (!user.verified) const SizedBox(height: 12),
                  Row(children: [
                    Expanded(child: StatTile(value: '${items.length}', label: 'Listings', icon: Icons.restaurant_rounded)),
                    const SizedBox(width: 10),
                    Expanded(
                      child: StatTile(
                        value: formatKg(totalKg),
                        unit: 'kg',
                        label: 'Available',
                        icon: Icons.scale_rounded,
                        color: const Color(0xFF0369A1),
                      ),
                    ),
                  ]),
                  const SizedBox(height: 14),
                  Row(children: [
                    Expanded(
                      child: TextField(
                        onChanged: (v) => setState(() => _query = v),
                        decoration: const InputDecoration(
                          hintText: 'Search food or location',
                          prefixIcon: Icon(Icons.search_rounded),
                          isDense: true,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    PopupMenuButton<_Sort>(
                      tooltip: 'Sort',
                      initialValue: _sort,
                      onSelected: (s) => setState(() => _sort = s),
                      itemBuilder: (_) => const [
                        PopupMenuItem(value: _Sort.expiry, child: Text('Expiring soonest')),
                        PopupMenuItem(value: _Sort.quantity, child: Text('Largest quantity')),
                        PopupMenuItem(value: _Sort.name, child: Text('Name A-Z')),
                      ],
                      child: Container(
                        height: 48,
                        width: 48,
                        decoration: BoxDecoration(
                          color: cs.surface,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: cs.outlineVariant),
                        ),
                        child: const Icon(Icons.sort_rounded),
                      ),
                    ),
                  ]),
                  const SizedBox(height: 12),
                ]),
              ),
              SliverToBoxAdapter(
                child: SizedBox(
                  height: 40,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    children: [
                      ChoiceChip(
                        label: Text('All (${items.length})'),
                        selected: _category == null,
                        onSelected: (_) => setState(() => _category = null),
                      ),
                      for (final c in categories) ...[
                        const SizedBox(width: 8),
                        ChoiceChip(
                          label: Text(c),
                          selected: _category == c,
                          onSelected: (sel) => setState(() => _category = sel ? c : null),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              if (visible.isEmpty)
                SliverToBoxAdapter(
                  child: EmptyState(
                    icon: Icons.search_off_rounded,
                    title: items.isEmpty ? 'No listings right now' : 'Nothing matches',
                    message: items.isEmpty
                        ? 'Donors publish new surplus throughout the day. Pull down to refresh.'
                        : 'Try a different search or category.',
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
                  sliver: SliverList.separated(
                    itemCount: visible.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 14),
                    itemBuilder: (_, i) => FoodCard(item: visible[i], onRequest: () => _request(visible[i])),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class FoodCard extends StatelessWidget {
  final Donation item;
  final VoidCallback onRequest;
  const FoodCard({super.key, required this.item, required this.onRequest});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final (label, tone, pct) = freshness(item);
    final days = item.daysUntilExpiry;
    final user = context.read<AppState>().user!;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onRequest,
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Stack(children: [
              FoodImage(category: item.category, height: 170, width: double.infinity, radius: 16),
              Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    gradient: const LinearGradient(
                      begin: Alignment.center,
                      end: Alignment.bottomCenter,
                      colors: [Colors.transparent, Color(0x99081403)],
                    ),
                  ),
                ),
              ),
              Positioned(top: 10, left: 10, child: Pill(label, tone: tone, dot: true)),
              Positioned(
                left: 14,
                bottom: 10,
                child: Text.rich(TextSpan(children: [
                  TextSpan(
                    text: formatKg(item.quantityKg),
                    style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -0.8),
                  ),
                  const TextSpan(text: ' kg', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                ])),
              ),
            ]),
            Padding(
              padding: const EdgeInsets.fromLTRB(6, 12, 6, 4),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(item.category.toUpperCase(),
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.8, color: cs.primary)),
                const SizedBox(height: 2),
                Text(item.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, letterSpacing: -0.4)),
                const SizedBox(height: 4),
                Row(children: [
                  Icon(Icons.location_on_outlined, size: 15, color: cs.outline),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(item.pickupLocation,
                        style: TextStyle(fontSize: 13, color: cs.outline), maxLines: 1, overflow: TextOverflow.ellipsis),
                  ),
                ]),
                const SizedBox(height: 12),
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Tone.of(context, tone).fg)),
                  Text(days == null || days < 0 ? 'past expiry' : '$days day${days == 1 ? '' : 's'} left',
                      style: TextStyle(fontSize: 12, color: cs.outline)),
                ]),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(99),
                  child: LinearProgressIndicator(
                    value: pct,
                    minHeight: 7,
                    backgroundColor: Tone.of(context, tone).bg,
                    color: Tone.of(context, tone).fg,
                  ),
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: user.verified
                      ? FilledButton(onPressed: onRequest, child: const Text('Request this item'))
                      : OutlinedButton.icon(
                          onPressed: onRequest,
                          icon: const Icon(Icons.lock_outline_rounded, size: 18),
                          label: const Text('Verification required'),
                        ),
                ),
              ]),
            ),
          ]),
        ),
      ),
    );
  }
}

class RequestSheet extends StatefulWidget {
  final Donation item;
  const RequestSheet({super.key, required this.item});

  @override
  State<RequestSheet> createState() => _RequestSheetState();
}

class _RequestSheetState extends State<RequestSheet> {
  late double _qty;
  String _urgency = 'medium';
  bool _busy = false;
  String? _error;

  double get _max => widget.item.quantityKg < 1 ? 1 : widget.item.quantityKg;

  @override
  void initState() {
    super.initState();
    _qty = _max < 10 ? _max.floorToDouble().clamp(1, _max) : 10;
  }

  Future<void> _submit() async {
    final state = context.read<AppState>();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await state.api.post('/requests', {
        'itemId': widget.item.id,
        'beneficiaryId': state.user!.id,
        'quantityKg': _qty,
        'urgency': _urgency,
      });
      if (!mounted) return;
      showSnack(context, 'Request sent for ${formatKg(_qty)} kg of ${widget.item.name}. You\'ll get a ticket once approved.');
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
    final picks = {(_max / 4).roundToDouble(), (_max / 2).roundToDouble(), _max}.where((v) => v >= 1).toList();
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          FoodImage(category: widget.item.category, width: 64, height: 64),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(widget.item.name, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
              Text('${formatKg(widget.item.quantityKg)} kg available · ${widget.item.pickupLocation}',
                  style: TextStyle(color: cs.outline, fontSize: 13), maxLines: 2),
            ]),
          ),
        ]),
        const SizedBox(height: 22),
        const Text('How much do you need?', style: TextStyle(fontWeight: FontWeight.w700)),
        const SizedBox(height: 10),
        Container(
          decoration: BoxDecoration(border: Border.all(color: cs.outlineVariant), borderRadius: BorderRadius.circular(16)),
          child: Row(children: [
            IconButton(
              onPressed: _qty > 1 ? () => setState(() => _qty = (_qty - 1).clamp(1, _max)) : null,
              icon: const Icon(Icons.remove_rounded),
            ),
            Expanded(
              child: Text('${formatKg(_qty)} kg',
                  textAlign: TextAlign.center, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
            ),
            IconButton(
              onPressed: _qty < _max ? () => setState(() => _qty = (_qty + 1).clamp(1, _max)) : null,
              icon: const Icon(Icons.add_rounded),
            ),
          ]),
        ),
        if (picks.length > 1) ...[
          const SizedBox(height: 10),
          Wrap(spacing: 8, children: [
            for (final v in picks)
              ChoiceChip(
                label: Text(v == _max ? 'All ${formatKg(v)} kg' : '${formatKg(v)} kg'),
                selected: _qty == v,
                onSelected: (_) => setState(() => _qty = v),
              ),
          ]),
        ],
        const SizedBox(height: 20),
        const Text('Urgency', style: TextStyle(fontWeight: FontWeight.w700)),
        const SizedBox(height: 10),
        SegmentedButton<String>(
          showSelectedIcon: false,
          segments: const [
            ButtonSegment(value: 'critical', label: Text('Critical')),
            ButtonSegment(value: 'high', label: Text('High')),
            ButtonSegment(value: 'medium', label: Text('Medium')),
            ButtonSegment(value: 'low', label: Text('Low')),
          ],
          selected: {_urgency},
          onSelectionChanged: (s) => setState(() => _urgency = s.first),
        ),
        if (_error != null) ...[
          const SizedBox(height: 14),
          Text(_error!, style: TextStyle(color: cs.error)),
        ],
        const SizedBox(height: 22),
        SizedBox(
          width: double.infinity,
          child: FilledButton(
            onPressed: _busy ? null : _submit,
            child: Text(_busy ? 'Sending…' : 'Request ${formatKg(_qty)} kg'),
          ),
        ),
      ]),
    );
  }
}
