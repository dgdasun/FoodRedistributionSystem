import 'package:flutter_test/flutter_test.dart';
import 'package:zero_waste/core/models.dart';

void main() {
  test('ticket is expired once its collection window lapses', () {
    final t = Ticket.fromJson({
      'id': 't-1',
      'status': 'pending',
      'quantityKg': 12.0,
      'expiresAt': '2026-10-17T05:52:01.945Z',
    });
    expect(t.displayStatus(DateTime.utc(2026, 10, 16)), 'active');
    expect(t.displayStatus(DateTime.utc(2026, 10, 18)), 'expired');
  });

  test('collected ticket stays collected after its window', () {
    final t = Ticket.fromJson({'id': 't-2', 'status': 'collected', 'expiresAt': '2026-10-17T05:52:01.945Z'});
    expect(t.displayStatus(DateTime.utc(2027)), 'collected');
  });

  test('partial offer exposes offered quantity and nested item', () {
    final r = FoodRequest.fromJson({
      'id': 'r-1',
      'status': 'counter_offer',
      'quantityKg': 5,
      'approvedQuantityKg': 4.0,
      'item': {'id': 'i-1', 'name': 'Pizza', 'category': 'Cooked Meals', 'quantityKg': 11.0},
    });
    expect(r.offeredKg, 4.0);
    expect(r.item!.name, 'Pizza');
    expect(formatKg(r.quantityKg), '5');
  });
}
