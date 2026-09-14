import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import '../widgets/network_retry.dart';

class ProfileScreen extends StatefulWidget {
  final bool embedded; // true quand affiché comme onglet de la bottom nav
  const ProfileScreen({super.key, this.embedded = false});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Map<String, dynamic>? _profile;
  String? _apiKey; // affichée seulement juste après génération (non renvoyée ensuite)
  bool _loading = true;
  bool _generating = false;
  String? _loadError;
  final _domainCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      final res = await ApiService.getProfile();
      setState(() {
        _profile = res['success'] == true ? res['data'] : null;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _loadError = 'Connexion internet indisponible';
        _loading = false;
      });
    }
  }

  Future<void> _generateKey() async {
    setState(() => _generating = true);
    final res = await ApiService.generateApiKey(
      domain: _domainCtrl.text.trim().isEmpty ? null : _domainCtrl.text.trim(),
    );
    setState(() => _generating = false);
    if (res['success'] == true) {
      setState(() => _apiKey = res['data']['apiKey']);
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(res['data']['note'] ?? 'Clé générée.')),
        );
      }
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(res['error']?['message'] ?? 'Échec de la génération.')),
      );
    }
  }

  Future<void> _revokeKey() async {
    final res = await ApiService.revokeApiKey();
    if (res['success'] == true) {
      setState(() => _apiKey = null);
      await _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final body = _loading
        ? const Center(child: CircularProgressIndicator(color: AppColors.accent))
        : (_loadError != null
            ? NetworkRetryButton(message: _loadError!, onRetry: _load)
            : _buildContent());

    if (widget.embedded) {
      return Container(color: AppColors.background, child: body);
    }
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(backgroundColor: AppColors.background, elevation: 0, title: const Text('Profil')),
      body: body,
    );
  }

  Widget _buildContent() {
    final p = _profile ?? {};
    final hasKey = p['hasApiKey'] == true;
    final apiKeyDomain = p['apiKeyDomain'];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Column(
              children: [
                const CircleAvatar(
                  radius: 44,
                  backgroundColor: AppColors.surface,
                  child: Icon(Icons.person, size: 44, color: Colors.white54),
                ),
                const SizedBox(height: 10),
                Text(p['username'] ?? '—', style: const TextStyle(
                  color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold,
                )),
                Text(p['email'] ?? '—', style: const TextStyle(color: AppColors.textSecondary)),
              ],
            ),
          ),
          const SizedBox(height: 24),

          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _badge(Icons.favorite, 'Favoris', p['favoritesCount'] ?? 0),
              const SizedBox(width: 12),
              _badge(Icons.download_done, 'Téléchargements', p['downloadsCount'] ?? 0),
            ],
          ),
          const SizedBox(height: 24),

          _sectionTitle('Informations'),
          _infoRow('Membre depuis', p['createdAt'] != null ? p['createdAt'].toString().substring(0, 10) : '—'),
          _infoRow('Thème', p['theme'] ?? 'dark'),

          const SizedBox(height: 28),
          _sectionTitle('Clé API Développeur'),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (!hasKey) ...[
                  const Text(
                    "Aucune clé pour l'instant. Générez-en une si vous êtes développeur — "
                    "elle se verrouille sur le domaine de votre site (auto-détecté au premier "
                    "appel, ou renseigné ci-dessous).",
                    style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _domainCtrl,
                    style: const TextStyle(color: Colors.white),
                    decoration: const InputDecoration(
                      labelText: 'Domaine autorisé (optionnel)',
                      hintText: 'ex: movie.votresite.com',
                    ),
                  ),
                  const SizedBox(height: 14),
                  ElevatedButton(
                    onPressed: _generating ? null : _generateKey,
                    child: _generating
                        ? const SizedBox(height: 18, width: 18,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('GÉNÉRER UNE CLÉ API'),
                  ),
                ] else ...[
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          _apiKey ?? 'SYRIX_API_KEY_•••••••••••••••••••••• (masquée)',
                          style: const TextStyle(color: Colors.white, fontFamily: 'monospace', fontSize: 13),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (_apiKey != null)
                        IconButton(
                          icon: const Icon(Icons.copy, color: AppColors.accent, size: 20),
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: _apiKey!));
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Clé copiée.')),
                            );
                          },
                        ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    apiKeyDomain != null
                        ? 'Verrouillée sur : $apiKeyDomain'
                        : "Pas encore verrouillée — sera fixée au premier appel entrant.",
                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                  ),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: _revokeKey,
                    child: const Text('Révoquer la clé', style: TextStyle(color: AppColors.accent)),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _sectionTitle(String t) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Text(t, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
      );

  Widget _infoRow(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(color: AppColors.textSecondary)),
            Text(value, style: const TextStyle(color: Colors.white)),
          ],
        ),
      );

  Widget _badge(IconData icon, String label, int count) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            Icon(icon, color: AppColors.accent, size: 18),
            const SizedBox(width: 6),
            Text('$label ($count)', style: const TextStyle(color: Colors.white, fontSize: 12)),
          ],
        ),
      );
}
