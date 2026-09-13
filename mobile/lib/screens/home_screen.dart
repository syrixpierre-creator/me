import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../models/media_model.dart';
import '../services/api_service.dart';
import '../widgets/syrix_logo.dart';
import '../widgets/app_drawer.dart';
import '../widgets/media_card.dart';
import 'anime_screen.dart';
import 'movie_screen.dart';
import 'series_screen.dart';
import 'profile_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _navIndex = 0;

  final _pages = const [
    _HomeFeed(),
    _SearchPlaceholder(),
    _DownloadsPlaceholder(),
    ProfileScreen(embedded: true),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      drawer: const AppDrawer(),
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const SyrixLogo(fontSize: 24),
        centerTitle: false,
      ),
      body: _pages[_navIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _navIndex,
        onTap: (i) => setState(() => _navIndex = i),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_outlined), label: 'Accueil'),
          BottomNavigationBarItem(icon: Icon(Icons.search), label: 'Recherche'),
          BottomNavigationBarItem(icon: Icon(Icons.download_outlined), label: 'Téléchargements'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Profil'),
        ],
      ),
    );
  }
}

class _HomeFeed extends StatelessWidget {
  const _HomeFeed();

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // À l'affiche cette semaine — grande bannière vedette
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Container(
                height: 190,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [AppColors.accent.withOpacity(0.35), AppColors.surface],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: const Align(
                  alignment: Alignment.bottomLeft,
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('À l\'affiche cette semaine',
                        style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
          _CarouselSection(title: 'Continuer la lecture', showProgress: true),
          const SizedBox(height: 24),
          _CarouselSection(title: 'Tendances actuelles', showProgress: false, apiType: 'movies'),
          const SizedBox(height: 60),
          _QuickLinksRow(),
        ],
      ),
    );
  }
}

class _CarouselSection extends StatefulWidget {
  final String title;
  final bool showProgress;
  final String? apiType; // si fourni, charge de vraies données via l'API
  const _CarouselSection({required this.title, required this.showProgress, this.apiType});

  @override
  State<_CarouselSection> createState() => _CarouselSectionState();
}

class _CarouselSectionState extends State<_CarouselSection> {
  Future<List<MediaItem>>? _future;

  @override
  void initState() {
    super.initState();
    if (widget.apiType != null) {
      _future = ApiService.fetchList(widget.apiType!).then((json) {
        if (json['success'] != true) return <MediaItem>[];
        final List data = json['data'] as List? ?? [];
        return data.map((e) => MediaItem.fromJson(e as Map<String, dynamic>)).toList();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(widget.title, style: const TextStyle(
            color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold,
          )),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 160,
          child: _future == null
              ? ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: 6,
                  separatorBuilder: (_, __) => const SizedBox(width: 12),
                  itemBuilder: (context, i) => MediaCard(
                    title: 'Titre ${i + 1}',
                    progress: widget.showProgress ? (i % 4) / 4 : null,
                  ),
                )
              : FutureBuilder<List<MediaItem>>(
                  future: _future,
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Center(child: CircularProgressIndicator(color: AppColors.accent));
                    }
                    final items = snapshot.data ?? [];
                    if (items.isEmpty) {
                      return const Center(
                        child: Text('Aucun contenu disponible.', style: TextStyle(color: AppColors.textSecondary)),
                      );
                    }
                    return ListView.separated(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: items.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 12),
                      itemBuilder: (context, i) => MediaCard(
                        title: items[i].title,
                        imageUrl: items[i].image.isNotEmpty ? items[i].image : null,
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

class _QuickLinksRow extends StatelessWidget {
  const _QuickLinksRow();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Wrap(
        spacing: 12,
        runSpacing: 12,
        children: [
          _NavChip(label: 'Anime', onTap: () => Navigator.push(context,
              MaterialPageRoute(builder: (_) => const AnimeScreen()))),
          _NavChip(label: 'Films', onTap: () => Navigator.push(context,
              MaterialPageRoute(builder: (_) => const MovieScreen()))),
          _NavChip(label: 'Séries', onTap: () => Navigator.push(context,
              MaterialPageRoute(builder: (_) => const SeriesScreen()))),
        ],
      ),
    );
  }
}

class _NavChip extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  const _NavChip({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.border),
        ),
        child: Text(label, style: const TextStyle(color: Colors.white)),
      ),
    );
  }
}

class _SearchPlaceholder extends StatelessWidget {
  const _SearchPlaceholder();
  @override
  Widget build(BuildContext context) =>
      const Center(child: Text('Recherche', style: TextStyle(color: Colors.white70)));
}

class _DownloadsPlaceholder extends StatelessWidget {
  const _DownloadsPlaceholder();
  @override
  Widget build(BuildContext context) =>
      const Center(child: Text('Téléchargements', style: TextStyle(color: Colors.white70)));
}
