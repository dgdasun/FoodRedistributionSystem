import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:zero_waste/core/api_client.dart';
import 'package:zero_waste/core/app_state.dart';
import 'package:zero_waste/core/models.dart';
import 'package:zero_waste/screens/register_screen.dart';

void main() {
  test('seeded initial is not treated as an avatar photo', () {
    expect(User.fromJson({'id': 'u1', 'avatar': 'R'}).avatarPath, isNull);
    expect(User.fromJson({'id': 'u1', 'avatar': '/api/users/u1/avatar/1.png'}).avatarPath, '/api/users/u1/avatar/1.png');
  });

  test('verification fields parse and document names drop the timestamp', () {
    final u = User.fromJson({
      'id': 'u2',
      'role': 'beneficiary',
      'verified': false,
      'verificationStatus': 'rejected',
      'rejectionReason': 'Certificate expired',
      'verificationDocuments': ['1760000000000-cert.pdf'],
      'organizationSize': 40,
    });
    expect(u.isRejected, isTrue);
    expect(u.organizationSize, 40);
    expect(documentLabel(u.verificationDocuments.single), 'cert.pdf');
  });

  test('upload content type follows the file extension', () {
    expect(mediaTypeFor('photo.JPG').mimeType, 'image/jpeg');
    expect(mediaTypeFor('scan.pdf').mimeType, 'application/pdf');
  });

  testWidgets('register form validates and shows beneficiary-only fields', (tester) async {
    await tester.pumpWidget(ChangeNotifierProvider(
      create: (_) => AppState(),
      child: const MaterialApp(home: RegisterScreen()),
    ));

    expect(find.text('People served daily'), findsNothing);
    await tester.tap(find.text('Charity'));
    await tester.pumpAndSettle();
    expect(find.text('People served daily'), findsOneWidget);

    await tester.ensureVisible(find.text('Continue to agreement'));
    await tester.tap(find.text('Continue to agreement'));
    await tester.pumpAndSettle();
    expect(find.text('Required'), findsWidgets);
    expect(find.text('Recipient Disclaimer'), findsNothing);
  });
}
