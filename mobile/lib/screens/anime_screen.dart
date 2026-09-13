import 'package:flutter/material.dart';
import '../widgets/catalog_scaffold.dart';

class AnimeScreen extends StatelessWidget {
  const AnimeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const CatalogScaffold(
      pageTitle: 'Anime',
      featuredTitle: 'Jujutsu Kaisen',
      apiType: 'anime',
      sortTabs: ['Nouveautés', 'Populaire'],
      genres: ['Shonen', 'Action', 'Fantasy', 'Romance'],
    );
  }
}
