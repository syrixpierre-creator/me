import 'package:flutter/material.dart';
import '../widgets/catalog_scaffold.dart';

class MovieScreen extends StatelessWidget {
  const MovieScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const CatalogScaffold(
      pageTitle: 'Films',
      featuredTitle: 'Oppenheimer',
      apiType: 'movies',
      sortTabs: ['Tendances', 'Action'],
      genres: ['Action', 'Drame', 'Sci-Fi'],
    );
  }
}
