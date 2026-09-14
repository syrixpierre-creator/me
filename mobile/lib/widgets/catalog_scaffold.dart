import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../models/media_model.dart';
import '../services/api_service.dart';
import 'media_card.dart';
import '../screens/media_detail_screen.dart';

/// Squelette commun aux écrans Anime / Movie / Série :
/// bannière vedette, onglets de tri, pilules de genre, grille de cartes —
/// alimentée par l'API réelle (ApiService.fetchList) au lieu de données
/// statiques.
class CatalogScaffold extends StatefulWidget {
  final String pageTitle;
  final String featuredTitle;
  final String apiType; // "movies" | "series" | "anime" | "dramas"
  final List<String> sortTabs; // ex: ["Nouveautés", "Populaire"]
  final List<String> genres; // ex: ["Shonen", "Action"]

  const CatalogScaffold({
    super.key,
    required this.pageTitle,
    required this.featuredTitle,
    required this.apiType,
    required this.sortTabs,
    required this.genres,
  });

  @override
  State<CatalogScaffold> createState() => _CatalogScaffoldState();
}

class _CatalogScaffoldState extends State<CatalogScaffold> {
  int _sortIndex = 0;
  String? _selectedGenre;

  late Future<List<MediaItem>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<MediaItem>> _load() async {
    final json = await ApiService.fetchList(widget.apiType, genre: _selectedGenre);
    if (json['success'] != true) {
      final message = (json['error'] is Map) ? json['error']['message'] : null;
      throw Exception(message ?? 'Erreur de chargement du catalogue.');
    }
    final List data = json['data'] as List? ?? [];
    return data.map((e) => MediaItem.fromJson(e as Map<String, dynamic>)).toList();
  }

  void _onGenreTap(String g) {
    setState(() {
      _selectedGenre = _selectedGenre == g ? null : g;
      _future = _load();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: Text(widget.pageTitle),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Bannière vedette
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  height: 170,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [AppColors.accent.withOpacity(0.4), AppColors.surface],
                      begin: Alignment.topRight,
                      end: Alignment.bottomLeft,
                    ),
                  ),
                  child: Align(
                    alignment: Alignment.bottomLeft,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Text(widget.featuredTitle, style: const TextStyle(
                        color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900,
                      )),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 18),

            // Onglets de tri (Nouveautés / Populaire, Tendances / Action, etc.)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: List.generate(widget.sortTabs.length, (i) {
                  final selected = _sortIndex == i;
                  return Padding(
                    padding: const EdgeInsets.only(right: 20),
                    child: GestureDetector(
                      onTap: () => setState(() => _sortIndex = i),
                      child: Text(
                        widget.sortTabs[i],
                        style: TextStyle(
                          color: selected ? Colors.white : AppColors.textSecondary,
                          fontWeight: selected ? FontWeight.bold : FontWeight.normal,
                          fontSize: 15,
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ),
            const SizedBox(height: 14),

            // Grille de résultats — alimentée par l'API
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: FutureBuilder<List<MediaItem>>(
                future: _future,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Padding(
                      padding: EdgeInsets.symmetric(vertical: 40),
                      child: Center(child: CircularProgressIndicator(color: AppColors.accent)),
                    );
                  }
                  if (snapshot.hasError) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 40),
                      child: Center(
                        child: Column(
                          children: [
                            const Icon(Icons.wifi_off, color: AppColors.textSecondary, size: 32),
                            const SizedBox(height: 8),
                            Text('${snapshot.error}'.replaceFirst('Exception: ', ''),
                                style: const TextStyle(color: AppColors.textSecondary), textAlign: TextAlign.center),
                            const SizedBox(height: 12),
                            TextButton(
                              onPressed: () => setState(() => _future = _load()),
                              child: const Text('Réessayer'),
                            ),
                          ],
                        ),
                      ),
                    );
                  }
                  final items = snapshot.data ?? [];
                  if (items.isEmpty) {
                    return const Padding(
                      padding: EdgeInsets.symmetric(vertical: 40),
                      child: Center(child: Text('Aucun résultat.', style: TextStyle(color: AppColors.textSecondary))),
                    );
                  }
                  return GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 3,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 16,
                      childAspectRatio: 0.62,
                    ),
                    itemCount: items.length,
                    itemBuilder: (context, i) => MediaCard(
                      title: items[i].title,
                      imageUrl: items[i].image.isNotEmpty ? items[i].image : null,
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => MediaDetailScreen(item: items[i])),
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 18),

            // Pilules de genre
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text('Genre', style: const TextStyle(
                color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15,
              )),
            ),
            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Wrap(
                spacing: 10,
                runSpacing: 10,
                children: widget.genres.map((g) {
                  final selected = _selectedGenre == g;
                  return GestureDetector(
                    onTap: () => _onGenreTap(g),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: selected ? AppColors.accent : AppColors.surface,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: selected ? AppColors.accent : AppColors.border),
                      ),
                      child: Text(g, style: const TextStyle(color: Colors.white, fontSize: 13)),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}
