import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/app_state.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../widgets/common.dart';
import '../beneficiary/browse_screen.dart' show freshness;

class DonationsScreen extends StatefulWidget {
  const DonationsScreen({super.key});

  @override
  State<DonationsScreen> createState() => _DonationsScreenState();
}

class _DonationsScreenState extends State<DonationsScreen> {
  final _key = GlobalKey<AsyncViewState<List<Donation>>>();
  String _filter = 'all';
  final Set<String> _busy = {};

  Future<List<Donation>> _load() async {
    final state = context.read<AppState>();
    final data = await state.api.get('/donations?donorId=${state.user!.id}');
    final list = (data['donations'] as List? ?? []).map((e) => Donation.fromJson(e)).toList();
    list.sort((a, b) => (a.daysUntilExpiry ?? 999).compareTo(b.daysUntilExpiry ?? 999));
    return list;
  }

  Future<void> _togglePublish(Donation d) async {
    setState(() => _busy.add(d.id));
    try {
      await context.read<AppState>().api.patch('/donations/${d.id}', {'published': !d.published});
      if (mounted) showSnack(context, d.published ? '${d.name} unpublished.' : '${d.name} is now live for beneficiaries.');
      await _key.currentState?.reload();
    } catch (e) {
      if (mounted) showSnack(context, errorText(e), error: true);
    } finally {
      if (mounted) setState(() => _busy.remove(d.id));
    }
  }

  Future<void> _add() async {
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => const _AddItemSheet(),
    );
    if (created == true) _key.currentState?.reload();
  }

  Future<void> _manage(Donation d) async {
    final changed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => _ManageItemSheet(item: d),
    );
    if (changed == true) _key.currentState?.reload();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('My donations')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _add,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Add item'),
      ),
      body: AsyncView<List<Donation>>(
        key: _key,
        load: _load,
        builder: (context, all, reload) {
          final visible = switch (_filter) {
            'live' => all.where((d) => d.published && !d.isExpired).toList(),
            'draft' => all.where((d) => !d.published).toList(),
            'expired' => all.where((d) => d.isExpired).toList(),
            _ => all,
          };
          return ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.only(bottom: 96),
            children: [
              SizedBox(
                height: 44,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
                  children: [
                    for (final (k, label) in const [('all', 'All'), ('live', 'Live'), ('draft', 'Not published'), ('expired', 'Expired')]) ...[
                      ChoiceChip(label: Text(label), selected: _filter == k, onSelected: (_) => setState(() => _filter = k)),
                      const SizedBox(width: 8),
                    ],
                  ],
                ),
              ),
              if (visible.isEmpty)
                EmptyState(
                  icon: Icons.inventory_2_outlined,
                  title: all.isEmpty ? 'No items yet' : 'Nothing here',
                  message: all.isEmpty ? 'Tap "Add item" to list surplus stock.' : 'No items match this filter.',
                )
              else
                for (final d in visible)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                    child: Card(
                      clipBehavior: Clip.antiAlias,
                      child: InkWell(
                        onTap: () => _manage(d),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Row(children: [
                            FoodImage(category: d.category, width: 64, height: 64),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text(d.name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                                const SizedBox(height: 2),
                                Text('${formatKg(d.quantityKg)} ${d.unitLabel} · ${d.category}',
                                    style: TextStyle(fontSize: 12.5, color: cs.outline)),
                                const SizedBox(height: 6),
                                Wrap(spacing: 6, runSpacing: 4, children: [
                                  Pill(freshness(d).$1, tone: freshness(d).$2, dot: true),
                                  if (d.expiryDate != null) Pill('exp ${formatDate(d.expiryDate)}'),
                                ]),
                              ]),
                            ),
                            const SizedBox(width: 8),
                            Column(children: [
                              Switch(
                                value: d.published,
                                onChanged: _busy.contains(d.id) ? null : (_) => _togglePublish(d),
                              ),
                              Text(d.published ? 'Live' : 'Hidden',
                                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: cs.outline)),
                            ]),
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

class _AddItemSheet extends StatefulWidget {
  const _AddItemSheet();

  @override
  State<_AddItemSheet> createState() => _AddItemSheetState();
}

class _AddItemSheetState extends State<_AddItemSheet> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _batch = TextEditingController();
  final _qty = TextEditingController();
  String _category = 'Vegetables';
  DateTime? _expiry;
  bool _busy = false;
  String? _error;

  bool get _portioned => _category == 'Cooked Meals';

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _expiry ?? now.add(const Duration(days: 2)),
      firstDate: now.subtract(const Duration(days: 30)),
      lastDate: now.add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _expiry = picked);
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    if (_expiry == null) {
      setState(() => _error = 'Choose an expiry date.');
      return;
    }
    final state = context.read<AppState>();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final e = _expiry!;
      await state.api.post('/donations', {
        'donorId': state.user!.id,
        'name': _name.text.trim(),
        'category': _category,
        'batchNumber': _batch.text.trim(),
        'quantityKg': double.parse(_qty.text),
        'expiryDate': '${e.year}-${e.month.toString().padLeft(2, '0')}-${e.day.toString().padLeft(2, '0')}',
      });
      if (!mounted) return;
      showSnack(context, '${_name.text.trim()} added. Switch it to Live to publish.');
      Navigator.pop(context, true);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.read<AppState>().user!;
    final pickup = [user.organizationName, user.location].whereType<String>().join(', ');
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
      child: Form(
        key: _form,
        child: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const Text('Add surplus item', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            const SizedBox(height: 18),
            TextFormField(
              controller: _name,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(labelText: 'Item name'),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _category,
              decoration: const InputDecoration(labelText: 'Category'),
              items: [for (final c in foodCategories) DropdownMenuItem(value: c, child: Text(c))],
              onChanged: (v) => setState(() => _category = v!),
            ),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: TextFormField(
                  controller: _qty,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(labelText: 'Quantity', suffixText: _portioned ? 'portions' : 'kg'),
                  validator: (v) {
                    final n = double.tryParse(v ?? '');
                    return n == null || n <= 0 ? 'Enter a number' : null;
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextFormField(
                  controller: _batch,
                  decoration: const InputDecoration(labelText: 'Batch no. (optional)'),
                ),
              ),
            ]),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _pickDate,
              icon: const Icon(Icons.event_rounded),
              label: Text(_expiry == null ? 'Choose expiry date' : 'Expires ${formatDate(_expiry)}'),
            ),
            if (pickup.isNotEmpty) ...[
              const SizedBox(height: 12),
              Row(children: [
                Icon(Icons.location_on_outlined, size: 16, color: Theme.of(context).colorScheme.outline),
                const SizedBox(width: 6),
                Expanded(
                  child: Text('Pickup at $pickup (from your profile)',
                      style: TextStyle(fontSize: 12.5, color: Theme.of(context).colorScheme.outline)),
                ),
              ]),
            ],
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
            const SizedBox(height: 20),
            FilledButton(onPressed: _busy ? null : _submit, child: Text(_busy ? 'Saving…' : 'Add item')),
          ]),
        ),
      ),
    );
  }
}

/// Change the quantity of a listing or delete it. The backend's PATCH only
/// takes quantity / published / status, and treats a missing `published` as
/// false, so the current value is always sent back.
class _ManageItemSheet extends StatefulWidget {
  final Donation item;
  const _ManageItemSheet({required this.item});

  @override
  State<_ManageItemSheet> createState() => _ManageItemSheetState();
}

class _ManageItemSheetState extends State<_ManageItemSheet> {
  late final _qty = TextEditingController(text: formatKg(widget.item.quantityKg));
  bool _busy = false;
  String? _error;

  Donation get d => widget.item;

  Future<void> _run(Future<void> Function() call, String done) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await call();
      if (!mounted) return;
      showSnack(context, done);
      Navigator.pop(context, true);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _save() async {
    final q = double.tryParse(_qty.text.trim());
    if (q == null || q <= 0) {
      setState(() => _error = 'Enter a quantity above zero.');
      return;
    }
    final api = context.read<AppState>().api;
    await _run(
      () => api.patch('/donations/${d.id}', {'quantityKg': q, 'published': d.published}),
      '${d.name} updated to ${formatKg(q)} ${d.unitLabel}.',
    );
  }

  Future<void> _delete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Delete ${d.name}?'),
        content: const Text('The listing is removed for everyone. Requests already made for it can no longer be approved.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFFB91C1C)),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    final api = context.read<AppState>().api;
    await _run(() => api.delete('/donations/${d.id}'), '${d.name} deleted.');
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final (label, tone, _) = freshness(d);
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            FoodImage(category: d.category, width: 64, height: 64),
            const SizedBox(width: 14),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(d.name, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
                Text(
                  [d.category, if (d.batchNumber?.isNotEmpty == true) 'Batch ${d.batchNumber}'].join(' · '),
                  style: TextStyle(color: cs.outline, fontSize: 13),
                ),
                const SizedBox(height: 6),
                Wrap(spacing: 6, runSpacing: 4, children: [
                  Pill(label, tone: tone, dot: true),
                  Pill(d.published ? 'Live' : 'Hidden', tone: d.published ? 'ok' : 'muted'),
                ]),
              ]),
            ),
          ]),
          const SizedBox(height: 16),
          Card(
            child: Column(children: [
              ListTile(
                dense: true,
                leading: const Icon(Icons.event_rounded),
                title: const Text('Expiry date'),
                trailing: Text(formatDate(d.expiryDate), style: const TextStyle(fontWeight: FontWeight.w700)),
              ),
              if (d.pickupLocation.isNotEmpty)
                ListTile(
                  dense: true,
                  leading: const Icon(Icons.location_on_outlined),
                  title: const Text('Pickup'),
                  trailing: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 180),
                    child: Text(d.pickupLocation,
                        textAlign: TextAlign.end, maxLines: 2, style: const TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ),
            ]),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _qty,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(labelText: 'Quantity left', suffixText: d.unitLabel),
            onSubmitted: (_) => _save(),
          ),
          const SizedBox(height: 6),
          Text('Lower it when stock is sold or used elsewhere so requests stay accurate.',
              style: TextStyle(fontSize: 12.5, color: cs.outline)),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: cs.error)),
          ],
          const SizedBox(height: 18),
          FilledButton(onPressed: _busy ? null : _save, child: Text(_busy ? 'Saving…' : 'Save quantity')),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(foregroundColor: Tone.of(context, 'danger').fg),
            onPressed: _busy ? null : _delete,
            icon: const Icon(Icons.delete_outline_rounded),
            label: const Text('Delete listing'),
          ),
        ]),
      ),
    );
  }
}
