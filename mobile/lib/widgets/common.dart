import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/theme.dart';

/// Stock photo per food category - same set as frontend/src/foodImages.js.
const _categoryImage = {
  'Cooked Meals': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=75',
  'Bakery': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=75',
  'Vegetables': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop&q=75',
  'Dairy': 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=500&auto=format&fit=crop&q=75',
  'Fruits': 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=500&auto=format&fit=crop&q=75',
  'Packaged Goods': 'https://images.unsplash.com/photo-1584473457406-6240486418e9?w=500&auto=format&fit=crop&q=75',
  'Other': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&auto=format&fit=crop&q=75',
};

const foodCategories = ['Vegetables', 'Fruits', 'Bakery', 'Dairy', 'Cooked Meals', 'Packaged Goods', 'Other'];

class FoodImage extends StatelessWidget {
  final String? category;
  final double? width, height;
  final double radius;
  const FoodImage({super.key, this.category, this.width, this.height, this.radius = 16});

  @override
  Widget build(BuildContext context) {
    final placeholder = Container(
      width: width,
      height: height,
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: Icon(Icons.restaurant, color: Theme.of(context).colorScheme.outline),
    );
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: Image.network(
        _categoryImage[category] ?? _categoryImage['Other']!,
        width: width,
        height: height,
        fit: BoxFit.cover,
        errorBuilder: (_, _, _) => placeholder,
        loadingBuilder: (_, child, progress) => progress == null ? child : placeholder,
      ),
    );
  }
}

class Pill extends StatelessWidget {
  final String label;
  final String tone;
  final IconData? icon;
  final bool dot;
  const Pill(this.label, {super.key, this.tone = 'muted', this.icon, this.dot = false});

  @override
  Widget build(BuildContext context) {
    final t = Tone.of(context, tone);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: t.bg, borderRadius: BorderRadius.circular(99)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (icon != null) ...[Icon(icon, size: 13, color: t.fg), const SizedBox(width: 4)],
        if (dot && icon == null) ...[
          Container(width: 6, height: 6, decoration: BoxDecoration(color: t.fg, shape: BoxShape.circle)),
          const SizedBox(width: 5),
        ],
        Text(label, style: TextStyle(color: t.fg, fontSize: 11.5, fontWeight: FontWeight.w700)),
      ]),
    );
  }
}

String urgencyTone(String u) => switch (u) { 'critical' => 'danger', 'high' => 'warn', 'low' => 'ok', _ => 'info' };

/// Request status -> (label, tone). Shared by both roles.
(String, String) requestStatus(String s) => switch (s) {
      'approved' => ('Approved', 'ok'),
      'collected' => ('Collected', 'ok'),
      'counter_offer' => ('Partial offer', 'violet'),
      'rejected' => ('Rejected', 'danger'),
      'cancelled' => ('Declined', 'muted'),
      _ => ('Pending', 'warn'),
    };

class StatTile extends StatelessWidget {
  final String value, label;
  final String? unit;
  final IconData icon;
  final Color? color;
  const StatTile({super.key, required this.value, required this.label, required this.icon, this.unit, this.color});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final c = color ?? cs.primary;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(color: c.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, size: 18, color: c),
          ),
          const SizedBox(height: 10),
          Text.rich(
            TextSpan(children: [
              TextSpan(text: value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: -0.6)),
              if (unit != null)
                TextSpan(text: ' $unit', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: cs.outline)),
            ]),
          ),
          Text(label, style: TextStyle(fontSize: 12, color: cs.outline, fontWeight: FontWeight.w600)),
        ]),
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title, message;
  final Widget? action;
  const EmptyState({super.key, required this.icon, required this.title, required this.message, this.action});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 48),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(color: cs.primary.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(22)),
          child: Icon(icon, size: 30, color: cs.primary),
        ),
        const SizedBox(height: 16),
        Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800), textAlign: TextAlign.center),
        const SizedBox(height: 6),
        Text(message, style: TextStyle(color: cs.outline, height: 1.4), textAlign: TextAlign.center),
        if (action != null) ...[const SizedBox(height: 18), action!],
      ]),
    );
  }
}

/// Loads data with pull-to-refresh, a spinner on first load and a retry on
/// error - the same shape for every list screen.
class AsyncView<T> extends StatefulWidget {
  final Future<T> Function() load;
  final Widget Function(BuildContext, T, Future<void> Function() reload) builder;
  const AsyncView({super.key, required this.load, required this.builder});

  @override
  State<AsyncView<T>> createState() => AsyncViewState<T>();
}

class AsyncViewState<T> extends State<AsyncView<T>> {
  T? _data;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    reload();
  }

  Future<void> reload() async {
    try {
      final d = await widget.load();
      if (!mounted) return;
      setState(() {
        _data = d;
        _error = null;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e is ApiException ? e.message : '$e';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading && _data == null) return const Center(child: CircularProgressIndicator());
    if (_data == null) {
      return RefreshIndicator(
        onRefresh: reload,
        child: ListView(children: [
          EmptyState(
            icon: Icons.cloud_off_rounded,
            title: 'Could not load',
            message: _error ?? 'Something went wrong.',
            action: FilledButton.icon(onPressed: reload, icon: const Icon(Icons.refresh), label: const Text('Try again')),
          ),
        ]),
      );
    }
    return RefreshIndicator(onRefresh: reload, child: widget.builder(context, _data as T, reload));
  }
}

void showSnack(BuildContext context, String message, {bool error = false}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(
      content: Text(message),
      backgroundColor: error ? const Color(0xFFB91C1C) : Brand.primaryDark,
    ));
}

String errorText(Object e) => e is ApiException ? e.message : '$e';

class SectionTitle extends StatelessWidget {
  final String text;
  final Widget? trailing;
  const SectionTitle(this.text, {super.key, this.trailing});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(4, 18, 4, 10),
        child: Row(children: [
          Expanded(child: Text(text, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, letterSpacing: -0.3))),
          ?trailing,
        ]),
      );
}
