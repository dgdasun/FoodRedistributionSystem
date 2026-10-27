import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/app_state.dart';
import 'beneficiary/browse_screen.dart';
import 'beneficiary/my_requests_screen.dart';
import 'beneficiary/tickets_screen.dart';
import 'donor/donations_screen.dart';
import 'donor/donor_home_screen.dart';
import 'donor/donor_requests_screen.dart';
import 'donor/scan_screen.dart';
import 'profile_screen.dart';

class _Tab {
  final String label;
  final IconData icon, selectedIcon;
  final Widget screen;
  const _Tab(this.label, this.icon, this.selectedIcon, this.screen);
}

/// Bottom-tab shell. The tab set depends on role, like NAV_BY_ROLE in
/// frontend/src/nav.js.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  void goTo(int i) => setState(() => _index = i);

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AppState>().user!;
    // Unverified beneficiaries can browse but not request (same rule as the web app).
    final verified = user.verified;

    final tabs = user.isDonor
        ? [
            _Tab('Home', Icons.space_dashboard_outlined, Icons.space_dashboard_rounded, DonorHomeScreen(onNavigate: goTo)),
            const _Tab('Donations', Icons.inventory_2_outlined, Icons.inventory_2_rounded, DonationsScreen()),
            const _Tab('Requests', Icons.inbox_outlined, Icons.inbox_rounded, DonorRequestsScreen()),
            const _Tab('Scan', Icons.qr_code_scanner_rounded, Icons.qr_code_scanner_rounded, ScanScreen()),
            const _Tab('Profile', Icons.person_outline_rounded, Icons.person_rounded, ProfileScreen()),
          ]
        : [
            _Tab(user.isFarm ? 'Expired' : 'Food', Icons.restaurant_outlined, Icons.restaurant_rounded, const BrowseScreen()),
            if (verified) ...[
              const _Tab('Requests', Icons.inbox_outlined, Icons.inbox_rounded, MyRequestsScreen()),
              const _Tab('Tickets', Icons.confirmation_number_outlined, Icons.confirmation_number_rounded, TicketsScreen()),
            ],
            const _Tab('Profile', Icons.person_outline_rounded, Icons.person_rounded, ProfileScreen()),
          ];

    final index = _index.clamp(0, tabs.length - 1);
    return Scaffold(
      body: IndexedStack(index: index, children: [for (final t in tabs) t.screen]),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: goTo,
        destinations: [
          for (final t in tabs)
            NavigationDestination(icon: Icon(t.icon), selectedIcon: Icon(t.selectedIcon), label: t.label),
        ],
      ),
    );
  }
}
