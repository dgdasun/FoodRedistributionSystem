import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/app_state.dart';
import '../core/models.dart';
import '../widgets/common.dart';

/// App-bar bell with an unread badge; polls like the web Topbar does.
class NotificationBell extends StatefulWidget {
  const NotificationBell({super.key});

  @override
  State<NotificationBell> createState() => _NotificationBellState();
}

class _NotificationBellState extends State<NotificationBell> {
  int _unread = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _poll();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => _poll());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _poll() async {
    final state = context.read<AppState>();
    if (state.user == null) return;
    try {
      final data = await state.api.get('/notifications/${state.user!.id}');
      if (mounted) setState(() => _unread = (data['unreadCount'] as num?)?.toInt() ?? 0);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: 'Notifications',
      onPressed: () async {
        await Navigator.of(context).push(MaterialPageRoute(builder: (_) => const NotificationsScreen()));
        _poll();
      },
      icon: Badge(
        isLabelVisible: _unread > 0,
        label: Text('$_unread'),
        child: const Icon(Icons.notifications_none_rounded),
      ),
    );
  }
}

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  String _ago(DateTime? d) {
    if (d == null) return '';
    final diff = DateTime.now().difference(d);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return formatDate(d);
  }

  @override
  Widget build(BuildContext context) {
    final state = context.read<AppState>();
    final key = GlobalKey<AsyncViewState<List<AppNotification>>>();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          TextButton(
            onPressed: () async {
              try {
                await state.api.patch('/notifications/${state.user!.id}/read-all', {});
                key.currentState?.reload();
              } catch (e) {
                if (context.mounted) showSnack(context, errorText(e), error: true);
              }
            },
            child: const Text('Mark all read'),
          ),
        ],
      ),
      body: AsyncView<List<AppNotification>>(
        key: key,
        load: () async {
          final data = await state.api.get('/notifications/${state.user!.id}');
          return (data['notifications'] as List? ?? []).map((e) => AppNotification.fromJson(e)).toList();
        },
        builder: (context, items, reload) {
          if (items.isEmpty) {
            return ListView(children: const [
              EmptyState(icon: Icons.notifications_off_outlined, title: 'All caught up', message: 'You have no notifications.'),
            ]);
          }
          final cs = Theme.of(context).colorScheme;
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: items.length,
            separatorBuilder: (_, _) => const SizedBox(height: 10),
            itemBuilder: (_, i) {
              final n = items[i];
              final icon = switch (n.type) {
                'request' => Icons.inbox_rounded,
                'ticket' => Icons.confirmation_number_rounded,
                _ => Icons.info_outline_rounded,
              };
              return Card(
                color: n.read ? null : cs.primary.withValues(alpha: 0.07),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  leading: CircleAvatar(
                    backgroundColor: cs.primary.withValues(alpha: 0.12),
                    child: Icon(icon, color: cs.primary, size: 20),
                  ),
                  title: Text(n.message,
                      style: TextStyle(fontSize: 14, fontWeight: n.read ? FontWeight.w500 : FontWeight.w700, height: 1.35)),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(_ago(n.createdAt), style: TextStyle(fontSize: 12, color: cs.outline)),
                  ),
                  onTap: n.read
                      ? null
                      : () async {
                          try {
                            await state.api.patch('/notifications/${n.id}/read', {});
                            reload();
                          } catch (_) {}
                        },
                ),
              );
            },
          );
        },
      ),
    );
  }
}
