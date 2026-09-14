import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_theme.dart';
import '../models/media_model.dart';
import '../services/api_service.dart';

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

  @override
  void initState() {
    super.initState();
    _future = ApiService.fetchDetail(_routeType(widget.item.type), widget.item.slug);
  }

  Future<void> _openLink(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    await launchUrl(uri, mode: LaunchMode.externalApplication);
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
                    _openLink(link);
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
    final servers = await ApiService.fetchEpisodeServers(epId.toString());
    if (mounted) _showServers(servers);
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

          return CustomScrollView(
            slivers: [
              SliverAppBar(
                backgroundColor: AppColors.background,
                pinned: true,
                expandedHeight: 260,
                flexibleSpace: FlexibleSpaceBar(
                  background: image.isNotEmpty
                      ? Image.network(
                          image,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            color: AppColors.surface,
                            child: const Icon(Icons.movie_creation_outlined, color: AppColors.textSecondary, size: 48),
                          ),
                        )
                      : Container(color: AppColors.surface),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
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
                          onPressed: () => _watchMovie(data),
                          icon: const Icon(Icons.play_arrow),
                          label: const Text('Regarder'),
                        ),
                    ],
                  ),
                ),
              ),
              if (!isMovie)
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, i) {
                      final ep = episodes[i];
                      final num = ep['number']?.toString() ?? '${i + 1}';
                      final epTitle = ep['title']?.toString() ?? 'Épisode $num';
                      return ListTile(
                        leading: const Icon(Icons.play_circle_outline, color: AppColors.accent),
                        title: Text(epTitle, style: const TextStyle(color: Colors.white)),
                        onTap: () => _watchEpisode(ep),
                      );
                    },
                    childCount: episodes.length,
                  ),
                ),
              const SliverToBoxAdapter(child: SizedBox(height: 32)),
            ],
          );
        },
      ),
    );
  }
}
