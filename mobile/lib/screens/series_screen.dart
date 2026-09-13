import 'package:flutter/material.dart';
import '../widgets/catalog_scaffold.dart';

class SeriesScreen extends StatelessWidget {
  const SeriesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const CatalogScaffold(
      pageTitle: 'Séries',
      featuredTitle: 'The Crown',
      sortTabs: ['Drame', 'Thriller'],
      genres: ['Drame', 'Thriller', 'Comédie'],
    );
  }
}
