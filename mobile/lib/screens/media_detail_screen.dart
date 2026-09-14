import 'dart:html' as html;
import 'dart:ui_web' as ui_web;

import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../models/media_model.dart';
import '../services/api_service.dart';
import '../utils/player_policy.dart';

/// Hauteur de la zone média en haut de la page (poster OU lecteur vidéo).
/// Le lecteur prend exactement la place du poster : aucune valeur ne
/// change entre les deux états.
const double _kMediaHeight = 220;

/// Convertit le type singulier de MediaItem ('movie'/'series'/'anime'/'drama')
/// vers le segment de route pluriel attendu par l'API ('movies'/'series'/'anime'/'dramas').
String _routeType(String type) {
  switch (type) {
    case 'movie':
      return 'movies';
    case 'drama':
      return 'dramas';
    default:
      return type; // 'series' et 'anime' sont déjà identiques au singulier/pluriel
  }
}

class MediaDetailScreen extends StatefulWidget {
  final MediaItem item;
  const MediaDetailScreen({super.key, required this.item});

  @override
  State<MediaDetailScreen> createState() => _MediaDetailScreenState();
}

class _MediaDetailScreenState extends State<MediaDetailScreen> {
  late Future<Map<String, dynamic>> _future;

  // --- État du lecteur intégré ---------------------------------------
  // Tant que _activeViewType est null, on affiche le poster. Dès qu'un
  // serveur est choisi, on enregistre une iframe et on l'affiche à la
  // place exacte du poster, sur la même page (pas de nouvel écran).
  String? _activeViewType;
  String? _activeServerName;
  bool _isPaused = false;

  bool get _isPlaying => _activeViewType != null;

  @override
  void initState() {
    super.initState();
    _future = ApiService.fetchDetail(_routeType(widget.item.type), widget.item.slug);
  }

  /// Enregistre une iframe pour le serveur choisi et bascule l'affichage
  /// du poster vers le lecteur, sans quitter la page de détail.
  void _playServer(String name, String link) {
    final viewType = 'syrix-player-${DateTime.now().microsecondsSinceEpoch}';
    final sandbox = playerSandbox(serverName: name, serverLink: link);

    ui_web.platformViewRegistry.registerViewFactory(viewType, (int viewId) {
      final iframe = html.IFrameElement()
        ..src = link
        ..style.border = 'none'
        ..style.width = '100%'
        ..style.height = '100%'
        ..allowFullscreen = true
        ..setAttribute('sandbox', sandbox)
        ..setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
      return iframe;
    });

    setState(() {
      _activeViewType = viewType;
      _activeServerName = name;
      _isPaused = false;
    });
  }

  /// Le bouton "Regarder" devient un bouton de contrôle une fois la
  /// lecture démarrée : on ne relance pas de sélection de serveur, on
  /// bascule juste son état visuel (Mettre en pause / Reprendre).
  void _togglePauseLabel() {
    setState(() => _isPaused = !_isPaused);
  }

  void _showServers(Map<String, dynamic> serversJson) {
    if (serversJson['success'] != true) {
      final msg = (serversJson['error'] is Map) ? serversJson['error']['message'] : null;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg ?? 'Aucun serveur disponible pour le moment.')),
      );
      return;
    }
    final List servers = serversJson['data'] as List? ?? [];
    if (servers.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Aucun serveur disponible pour le moment.')),
      );
      return;
    }
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text('Choisis un serveur', style: TextStyle(
                  color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16,
                )),
              ),
              ...servers.map((s) {
                final name = s['server_name']?.toString() ?? 'Serveur';
                final version = s['version']?.toString() ?? '';
                final link = s['server_link']?.toString() ?? '';
                return ListTile(
                  leading: const Icon(Icons.play_circle_fill, color: AppColors.accent),
                  title: Text(name, style: const TextStyle(color: Colors.white)),
                  subtitle: version.isNotEmpty
                      ? Text(version, style: const TextStyle(color: AppColors.textSecondary))
                      : null,
                  onTap: link.isEmpty ? null : () {
                    Navigator.pop(context);
                    _playServer(name, link);
                  },
                );
              }),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  Future<void> _watchMovie(Map<String, dynamic> data) async {
    final epId = data['first_episode_id'];
    if (epId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Aucun épisode disponible pour ce titre.')),
      );
      return;
    }
    final serversJson = await ApiService.fetchEpisodeServers(epId.toString());
    if (!mounted) return;
    _autoPlayFirstServer(serversJson);
  }

  /// Pas de sélection visuelle : on prend automatiquement le premier
  /// serveur disponible (avec un lien non vide) et on lance la lecture.
  void _autoPlayFirstServer(Map<String, dynamic> serversJson) {
    if (serversJson['success'] != true) {
      final msg = (serversJson['error'] is Map) ? serversJson['error']['message'] : null;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg ?? 'Aucun serveur disponible pour le moment.')),
      );
      return;
    }
    final List servers = serversJson['data'] as List? ?? [];
    final server = servers.cast<Map>().firstWhere(
      (s) => (s['server_link']?.toString() ?? '').isNotEmpty,
      orElse: () => {},
    );
    if (server.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Aucun serveur disponible pour le moment.')),
      );
      return;
    }
    final name = server['server_name']?.toString() ?? 'Serveur';
    final link = server['server_link']?.toString() ?? '';
    _playServer(name, link);
  }

  Future<void> _watchEpisode(Map episode) async {
    final epId = episode['episode_id']?.toString();
    if (epId == null) return;
    final type = widget.item.type;
    final Map<String, dynamic> servers;
    if (type == 'series') {
      servers = await ApiService.fetchEpisodeServers(epId);
    } else {
      // anime / drama : identifiant "slug", passé en paramètre ?episode=
      servers = await ApiService.fetchTypeServers(_routeType(type), widget.item.slug, epId);
    }
    if (mounted) _showServers(servers);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: FutureBuilder<Map<String, dynamic>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: AppColors.accent));
          }
          if (snapshot.hasError || snapshot.data?['success'] != true) {
            final err = snapshot.data?['error'];
            final msg = (err is Map) ? err['message'] : '${snapshot.error}';
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline, color: AppColors.textSecondary, size: 36),
                    const SizedBox(height: 10),
                    Text('$msg', style: const TextStyle(color: AppColors.textSecondary), textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Retour'),
                    ),
                  ],
                ),
              ),
            );
          }

          final data = snapshot.data!['data'] as Map<String, dynamic>;
          final title = data['title']?.toString() ?? widget.item.title;
          final image = data['image']?.toString() ?? widget.item.image;
          final synopsis = data['synopsis']?.toString() ?? '';
          final year = data['year']?.toString() ?? '';
          final status = data['status']?.toString() ?? '';
          final country = data['country']?.toString(); // K-Dramas uniquement
          final genres = (data['genres'] as List?)?.map((g) => g.toString()).toList() ?? [];
          final episodes = (data['episodes'] as List?)?.cast<Map>() ?? [];
          final isMovie = widget.item.type == 'movie';

          // Zone média fixe en haut : poster tant qu'on n'a pas lancé la
          // lecture, puis lecteur vidéo intégré exactement à sa place dès
          // qu'un serveur est choisi — jamais de nouvel écran, jamais de
          // bascule forcée en plein écran paysage.
          final mediaArea = SizedBox(
            height: _kMediaHeight,
            width: double.infinity,
            child: Stack(
              fit: StackFit.expand,
              children: [
                if (_isPlaying)
                  HtmlElementView(viewType: _activeViewType!)
                else if (image.isNotEmpty)
                  Image.network(
                    image,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      color: AppColors.surface,
                      child: const Icon(Icons.movie_creation_outlined, color: AppColors.textSecondary, size: 48),
                    ),
                  )
                else
                  Container(color: AppColors.surface),
                Positioned(
                  top: 8,
                  left: 8,
                  child: SafeArea(
                    bottom: false,
                    child: Material(
                      color: Colors.black45,
                      shape: const CircleBorder(),
                      child: IconButton(
                        icon: const Icon(Icons.arrow_back, color: Colors.white),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          );

          final metadataAndControls = Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(
                  color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900,
                )),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 12,
                  children: [
                    if (year.isNotEmpty) Text(year, style: const TextStyle(color: AppColors.textSecondary)),
                    if (status.isNotEmpty) Text(status, style: const TextStyle(color: AppColors.textSecondary)),
                    if (country != null && country.isNotEmpty)
                      Text(country, style: const TextStyle(color: AppColors.textSecondary)),
                  ],
                ),
                if (genres.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: genres.map((g) => Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Text(g, style: const TextStyle(color: Colors.white, fontSize: 12)),
                    )).toList(),
                  ),
                ],
                if (synopsis.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Text(synopsis, style: const TextStyle(color: AppColors.textSecondary, height: 1.5)),
                ],
                const SizedBox(height: 20),
                if (isMovie)
                  ElevatedButton.icon(
                    onPressed: _isPlaying ? _togglePauseLabel : () => _watchMovie(data),
                    icon: Icon(_isPlaying && !_isPaused ? Icons.pause : Icons.play_arrow),
                    label: Text(
                      !_isPlaying
                          ? 'Regarder'
                          : (_isPaused ? 'Reprendre' : 'Mettre en pause'),
                    ),
                  ),
                if (_isPlaying && !isMovie && _activeServerName != null) ...[
                  const SizedBox(height: 8),
                  Text('Serveur : $_activeServerName', style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                ],
              ],
            ),
          );

          return Column(
            children: [
              mediaArea,
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      metadataAndControls,
                      if (!isMovie)
                        ...episodes.map((ep) {
                          final num = ep['number']?.toString() ?? '${episodes.indexOf(ep) + 1}';
                          final epTitle = ep['title']?.toString() ?? 'Épisode $num';
                          return ListTile(
                            leading: const Icon(Icons.play_circle_outline, color: AppColors.accent),
                            title: Text(epTitle, style: const TextStyle(color: Colors.white)),
                            onTap: () => _watchEpisode(ep),
                          );
                        }),
                      const SizedBox(height: 32),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
