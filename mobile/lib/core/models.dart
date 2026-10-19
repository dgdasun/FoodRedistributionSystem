// Plain models over the backend JSON. Field names match the Spring Boot
// responses exactly (see backend-spring/.../controller).

double _d(dynamic v) => v == null ? 0 : (v is num ? v.toDouble() : double.tryParse('$v') ?? 0);
double? _dn(dynamic v) => v == null ? null : _d(v);
DateTime? _date(dynamic v) {
  if (v == null) return null;
  if (v is num) return DateTime.fromMillisecondsSinceEpoch((v * (v < 1e12 ? 1000 : 1)).toInt());
  return DateTime.tryParse('$v')?.toLocal();
}

String formatKg(double v) => v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toStringAsFixed(1);

const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
String formatDate(DateTime? d) => d == null ? '—' : '${d.day} ${_months[d.month - 1]} ${d.year}';
String formatTime(DateTime d) {
  final h = d.hour % 12 == 0 ? 12 : d.hour % 12;
  return '$h:${d.minute.toString().padLeft(2, '0')} ${d.hour < 12 ? 'AM' : 'PM'}';
}

String formatDuration(Duration d) {
  if (d.isNegative) return '0m';
  final h = d.inHours, m = d.inMinutes % 60;
  if (h == 0) return '${m}m';
  if (m == 0) return '${h}h';
  return '${h}h ${m}m';
}

class User {
  final String id, role, name, email, verificationStatus;
  final String? organizationName, location, orgType, phone, storageCapacity, rejectionReason;
  final String? _avatar;
  final int organizationSize;
  final double handlingCapacityKg;
  final bool verified;
  final List<String> verificationDocuments;
  final Map<String, dynamic> raw;

  User.fromJson(Map<String, dynamic> j)
      : id = j['id'] ?? '',
        role = j['role'] ?? '',
        name = j['name'] ?? '',
        email = j['email'] ?? '',
        organizationName = j['organizationName'],
        location = j['location'],
        orgType = j['orgType'],
        phone = j['phone'],
        storageCapacity = j['storageCapacity'],
        rejectionReason = j['rejectionReason'],
        verificationStatus = j['verificationStatus'] ?? 'pending',
        _avatar = j['avatar'],
        organizationSize = _d(j['organizationSize']).round(),
        handlingCapacityKg = _d(j['handlingCapacityKg']),
        verified = j['verified'] == true,
        verificationDocuments = [for (final d in j['verificationDocuments'] as List? ?? []) '$d'],
        raw = j;

  bool get isDonor => role == 'donor';
  bool get isReceiver => role == 'beneficiary' || role == 'farm';
  bool get isFarm => role == 'farm';
  String get initial => name.isEmpty ? '?' : name[0].toUpperCase();
  bool get isRejected => !verified && verificationStatus == 'rejected';

  /// Server path of an uploaded photo. Seeded accounts store a single initial
  /// in `avatar` instead, which is not an image (same rule as frontend/src/avatar.js).
  String? get avatarPath {
    final a = _avatar;
    if (a == null) return null;
    return a.startsWith('/') || a.startsWith('http') ? a : null;
  }
  String get roleLabel => switch (role) {
        'donor' => 'Donor',
        'farm' => 'Farm / Compost',
        'beneficiary' => 'Beneficiary',
        'admin' => 'Administrator',
        _ => role,
      };
}

class Donation {
  final String id, donorId, name, category, pickupLocation, status, listingType;
  final String? batchNumber, unit;
  final double quantityKg;
  final DateTime? expiryDate;
  final int? _daysUntilExpiry;
  final bool published;

  Donation.fromJson(Map<String, dynamic> j)
      : id = j['id'] ?? '',
        donorId = j['donorId'] ?? '',
        name = j['name'] ?? 'Item',
        category = j['category'] ?? 'Other',
        pickupLocation = j['pickupLocation'] ?? '',
        status = j['status'] ?? 'surplus',
        listingType = j['listingType'] ?? 'donation',
        batchNumber = j['batchNumber'],
        unit = j['unit'],
        quantityKg = _d(j['quantityKg']),
        expiryDate = j['expiryDate'] == null ? null : DateTime.tryParse('${j['expiryDate']}'),
        _daysUntilExpiry = j['daysUntilExpiry'] == null ? null : _d(j['daysUntilExpiry']).round(),
        published = j['published'] == true;

  /// The API's own figure when present; otherwise derived from the expiry date.
  int? get daysUntilExpiry {
    if (_daysUntilExpiry != null) return _daysUntilExpiry;
    if (expiryDate == null) return null;
    final now = DateTime.now();
    return expiryDate!.difference(DateTime(now.year, now.month, now.day)).inDays;
  }

  bool get isExpired => status == 'expired' || (daysUntilExpiry ?? 0) < 0;
  String get unitLabel => category == 'Cooked Meals' && unit == 'portions' ? 'portions' : 'kg';
}

class FoodRequest {
  final String id, itemId, beneficiaryId, urgency, status;
  final double quantityKg;
  final double? approvedQuantityKg;
  final String? rejectionReason;
  final DateTime? createdAt;
  final Donation? item;
  final Map<String, dynamic>? beneficiary;

  FoodRequest.fromJson(Map<String, dynamic> j)
      : id = j['id'] ?? '',
        itemId = j['itemId'] ?? '',
        beneficiaryId = j['beneficiaryId'] ?? '',
        urgency = j['urgency'] ?? 'medium',
        status = j['status'] ?? 'pending',
        quantityKg = _d(j['quantityKg']),
        approvedQuantityKg = _dn(j['approvedQuantityKg']),
        rejectionReason = j['rejectionReason'],
        createdAt = _date(j['createdAt']),
        item = j['item'] is Map<String, dynamic> ? Donation.fromJson(j['item']) : null,
        beneficiary = j['beneficiary'] is Map<String, dynamic> ? j['beneficiary'] : null;

  String get requesterName =>
      beneficiary?['organizationName'] ?? beneficiary?['name'] ?? 'Requester';
  double get offeredKg => approvedQuantityKg ?? quantityKg;
}

/// Uploaded verification file names are stored as `<millis>-<original>`.
String documentLabel(String stored) => stored.replaceFirst(RegExp(r'^\d+-'), '');

class Ticket {
  final String id, itemId, status, pickupLocation;
  final String? qrCode, pickupDate, pickupTime;
  final double quantityKg;
  final int? collectionWindowHours;
  final DateTime? expiresAt;
  final Donation? item;

  Ticket.fromJson(Map<String, dynamic> j)
      : id = j['id'] ?? '',
        itemId = j['itemId'] ?? '',
        status = j['status'] ?? 'pending',
        pickupLocation = j['pickupLocation'] ?? '',
        qrCode = j['qrCode'],
        pickupDate = j['pickupDate']?.toString(),
        pickupTime = j['pickupTime']?.toString(),
        quantityKg = _d(j['quantityKg']),
        collectionWindowHours = j['collectionWindowHours'] == null ? null : _d(j['collectionWindowHours']).round(),
        expiresAt = _date(j['expiresAt']),
        item = j['item'] is Map<String, dynamic> ? Donation.fromJson(j['item']) : null;

  /// "active" | "collected" | "expired" - expired once the window lapses,
  /// even if the backend has not swept it yet.
  String displayStatus([DateTime? now]) {
    if (status == 'collected') return 'collected';
    if (status == 'expired') return 'expired';
    if (expiresAt != null && !expiresAt!.isAfter(now ?? DateTime.now())) return 'expired';
    return 'active';
  }
}

class AppNotification {
  final String id, type, message;
  final bool read;
  final DateTime? createdAt;

  AppNotification.fromJson(Map<String, dynamic> j)
      : id = j['id'] ?? '',
        type = j['type'] ?? 'system',
        message = j['message'] ?? '',
        read = j['read'] == true,
        createdAt = _date(j['createdAt']);
}
