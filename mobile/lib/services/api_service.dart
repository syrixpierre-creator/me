import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// Client pour VOTRE backend SYRIX FLIX (pas l'API catalogue directement) :
/// il gère le token de session et relaie vers /api/v1/*.
class ApiService {
  // À remplacer par le domaine réel de votre backend en production si besoin.
  static const String baseUrl = "https://me-production-d7e6.up.railway.app/api/v1";

  static Future<String?> _token() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }

  static Future<void> _saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
  }

  static Future<Map<String, String>> _headers({bool auth = true}) async {
    final headers = {'Content-Type': 'application/json'};
    if (auth) {
      final t = await _token();
      if (t != null) headers['Authorization'] = 'Bearer $t';
    }
    return headers;
  }

  static Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: await _headers(auth: false),
      body: jsonEncode({'email': email, 'password': password}),
    );
    final json = jsonDecode(res.body);
    if (json['success'] == true) {
      await _saveToken(json['data']['token']);
    }
    return json;
  }

  static Future<Map<String, dynamic>> signup(
      String username, String email, String password, String confirmPassword) async {
    final res = await http.post(
      Uri.parse('$baseUrl/auth/signup'),
      headers: await _headers(auth: false),
      body: jsonEncode({
        'username': username,
        'email': email,
        'password': password,
        'confirmPassword': confirmPassword,
      }),
    );
    final json = jsonDecode(res.body);
    if (json['success'] == true) {
      await _saveToken(json['data']['token']);
    }
    return json;
  }

  static Future<Map<String, dynamic>> getProfile() async {
    final res = await http.get(Uri.parse('$baseUrl/profile'), headers: await _headers());
    return jsonDecode(res.body);
  }

  /// Génère la clé API développeur. `domain` optionnel — sinon
  /// auto-détection au premier appel réel (voir doc backend).
  static Future<Map<String, dynamic>> generateApiKey({String? domain}) async {
    final res = await http.post(
      Uri.parse('$baseUrl/profile/api-key'),
      headers: await _headers(),
      body: jsonEncode({if (domain != null && domain.isNotEmpty) 'domain': domain}),
    );
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> revokeApiKey() async {
    final res = await http.delete(Uri.parse('$baseUrl/profile/api-key'), headers: await _headers());
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> fetchList(String type, {int page = 1, String? genre}) async {
    final qp = {'page': '$page', if (genre != null) 'genre': genre};
    final uri = Uri.parse('$baseUrl/$type').replace(queryParameters: qp);
    final res = await http.get(uri, headers: await _headers());
    return jsonDecode(res.body);
  }

  /// Fiche détaillée. `type` = 'movies' | 'series' | 'anime' | 'dramas'.
  static Future<Map<String, dynamic>> fetchDetail(String type, String slug) async {
    final res = await http.get(Uri.parse('$baseUrl/$type/$slug'), headers: await _headers());
    return jsonDecode(res.body);
  }

  /// Serveurs de streaming pour un film ou un épisode de série
  /// (identifiant numérique venant de `first_episode_id` / `episode_id`).
  static Future<Map<String, dynamic>> fetchEpisodeServers(String episodeId) async {
    final res = await http.get(Uri.parse('$baseUrl/episodes/$episodeId/servers'), headers: await _headers());
    return jsonDecode(res.body);
  }

  /// Serveurs de streaming pour un épisode d'animé ou de K-Drama
  /// (identifiant "slug", passé en paramètre `episode`).
  static Future<Map<String, dynamic>> fetchTypeServers(String type, String slug, String episode) async {
    final uri = Uri.parse('$baseUrl/$type/$slug/servers').replace(queryParameters: {'episode': episode});
    final res = await http.get(uri, headers: await _headers());
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> search(String query) async {
    final uri = Uri.parse('$baseUrl/search').replace(queryParameters: {'q': query});
    final res = await http.get(uri, headers: await _headers());
    return jsonDecode(res.body);
  }
}
