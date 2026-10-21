import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

/// Where the Spring Boot backend lives.
///
/// - Android emulator: the host machine is reachable at 10.0.2.2.
/// - Web / iOS simulator / desktop: localhost works.
/// - A real phone: use the PC's LAN IP (e.g. http://192.168.1.20:8080),
///   set from the "Server" option on the login screen.
///
/// Can also be fixed at build time:
///   flutter run --dart-define=API_URL=http://192.168.1.20:8080
String defaultServerUrl() {
  const fromBuild = String.fromEnvironment('API_URL');
  if (fromBuild.isNotEmpty) return fromBuild;
  if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
    return 'http://10.0.2.2:8080';
  }
  return 'http://localhost:8080';
}

class ApiException implements Exception {
  final String message;
  ApiException(this.message);
  @override
  String toString() => message;
}

/// Thin JSON client over the backend's `/api/*` routes. Mirrors
/// frontend/src/api.js: every error body carries `{ "error": "..." }`.
class ApiClient {
  String baseUrl;
  ApiClient(this.baseUrl);

  Uri _uri(String path) => Uri.parse('${baseUrl.replaceAll(RegExp(r'/+$'), '')}/api$path');

  static const _json = {'Content-Type': 'application/json'};
  static const _timeout = Duration(seconds: 15);

  Future<Map<String, dynamic>> get(String path) =>
      _send(() => http.get(_uri(path)).timeout(_timeout));

  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body) =>
      _send(() => http.post(_uri(path), headers: _json, body: jsonEncode(body)).timeout(_timeout));

  Future<Map<String, dynamic>> patch(String path, Map<String, dynamic> body) =>
      _send(() => http.patch(_uri(path), headers: _json, body: jsonEncode(body)).timeout(_timeout));

  Future<Map<String, dynamic>> delete(String path) =>
      _send(() => http.delete(_uri(path)).timeout(_timeout));

  /// Multipart upload of one file under the `file` field, like `api.upload`
  /// in the web app. The backend checks the part's content type, so it is
  /// derived from the file name rather than left as octet-stream.
  Future<Map<String, dynamic>> upload(String path, List<int> bytes, String filename) =>
      _send(() async {
        final req = http.MultipartRequest('POST', _uri(path))
          ..files.add(http.MultipartFile.fromBytes('file', bytes, filename: filename, contentType: mediaTypeFor(filename)));
        return http.Response.fromStream(await req.send().timeout(const Duration(seconds: 60)));
      });

  /// Absolute URL for a server-relative path such as a user's avatar.
  String absolute(String serverPath) => '${baseUrl.replaceAll(RegExp(r'/+$'), '')}$serverPath';

  Future<Map<String, dynamic>> _send(Future<http.Response> Function() call) async {
    http.Response res;
    try {
      res = await call();
    } catch (_) {
      throw ApiException('Cannot reach the server at $baseUrl. Check that the backend is running and the server address is correct.');
    }
    Map<String, dynamic> data = {};
    try {
      final decoded = jsonDecode(utf8.decode(res.bodyBytes));
      if (decoded is Map<String, dynamic>) data = decoded;
    } catch (_) {}
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw ApiException((data['error'] ?? data['message'] ?? 'Request failed (${res.statusCode})').toString());
    }
    return data;
  }
}

MediaType mediaTypeFor(String filename) {
  final ext = filename.split('.').last.toLowerCase();
  return switch (ext) {
    'jpg' || 'jpeg' => MediaType('image', 'jpeg'),
    'png' => MediaType('image', 'png'),
    'webp' => MediaType('image', 'webp'),
    'gif' => MediaType('image', 'gif'),
    'pdf' => MediaType('application', 'pdf'),
    _ => MediaType('application', 'octet-stream'),
  };
}
