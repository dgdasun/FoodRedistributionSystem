import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api_client.dart';
import 'models.dart';

/// Signed-in user + server address, persisted across launches. Like the web
/// app, the backend has no session token: the user object is the session.
class AppState extends ChangeNotifier {
  static const _kUser = 'zerowaste_user';
  static const _kServer = 'zerowaste_server';

  final ApiClient api;
  User? user;
  bool ready = false;

  AppState() : api = ApiClient(defaultServerUrl());

  String get serverUrl => api.baseUrl;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final server = prefs.getString(_kServer);
    if (server != null && server.isNotEmpty) api.baseUrl = server;
    final stored = prefs.getString(_kUser);
    if (stored != null) {
      try {
        user = User.fromJson(jsonDecode(stored));
      } catch (_) {}
    }
    ready = true;
    notifyListeners();
    // Refresh in the background so verification changes made by an admin show up.
    if (user != null) refreshUser();
  }

  Future<void> setServerUrl(String url) async {
    api.baseUrl = url.trim();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kServer, api.baseUrl);
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    final data = await api.post('/auth/login', {'email': email.trim(), 'password': password});
    final u = User.fromJson(data['user']);
    if (!u.isDonor && !u.isReceiver) {
      throw ApiException('The mobile app is for donors, beneficiaries and farms. Please use the web dashboard for admin accounts.');
    }
    await _save(u);
  }

  /// Creates the account and returns it without signing in, so the caller
  /// can attach a verification document before the home screen replaces it.
  Future<User> register(Map<String, dynamic> payload) async {
    final data = await api.post('/auth/register', payload);
    return User.fromJson(data['user']);
  }

  /// Stores a user returned by an endpoint (avatar, documents, register).
  Future<void> setUser(Map<String, dynamic> json) => _save(User.fromJson(json));

  Future<void> refreshUser() async {
    if (user == null) return;
    try {
      final data = await api.get('/auth/me/${user!.id}');
      await _save(User.fromJson(data['user']));
    } catch (_) {
      // Offline or server down - keep the cached user.
    }
  }

  Future<void> _save(User u) async {
    user = u;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kUser, jsonEncode(u.raw));
    notifyListeners();
  }

  Future<void> logout() async {
    user = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kUser);
    notifyListeners();
  }
}
