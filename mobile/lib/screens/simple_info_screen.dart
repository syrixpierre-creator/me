import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Écran générique "en cours de construction" utilisé pour les entrées du
/// menu latéral qui n'ont pas encore de contenu dédié (Favoris, Historique).
/// Évite d'avoir un bouton qui ne fait rien : on atterrit sur un écran réel,
/// cohérent avec le style de l'app, plutôt que sur une impasse silencieuse.
class SimpleInfoScreen extends StatelessWidget {
  final String title;
  final IconData icon;
  final String message;

  const SimpleInfoScreen({
    super.key,
    required this.title,
    required this.icon,
    required this.message,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(backgroundColor: AppColors.background, elevation: 0, title: Text(title)),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.surface,
                  border: Border.all(color: AppColors.border),
                ),
                child: Icon(icon, color: AppColors.accent, size: 30),
              ),
              const SizedBox(height: 18),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 14),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key});
  @override
  Widget build(BuildContext context) => const SimpleInfoScreen(
        title: 'Historique',
        icon: Icons.history,
        message: 'Votre historique de lecture apparaîtra ici.',
      );
}

class FavoritesScreen extends StatelessWidget {
  const FavoritesScreen({super.key});
  @override
  Widget build(BuildContext context) => const SimpleInfoScreen(
        title: 'Favoris',
        icon: Icons.favorite_border,
        message: 'Ajoutez des films, séries ou animes en favori pour les retrouver ici.',
      );
}

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});
  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _notifications = true;
  bool _autoplay = true;
  bool _wifiOnly = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(backgroundColor: AppColors.background, elevation: 0, title: const Text('Paramètres')),
      body: ListView(
        children: [
          SwitchListTile(
            activeColor: AppColors.accent,
            title: const Text('Notifications', style: TextStyle(color: Colors.white)),
            subtitle: const Text('Nouveautés et reprises de lecture', style: TextStyle(color: AppColors.textSecondary)),
            value: _notifications,
            onChanged: (v) => setState(() => _notifications = v),
          ),
          SwitchListTile(
            activeColor: AppColors.accent,
            title: const Text('Lecture automatique', style: TextStyle(color: Colors.white)),
            subtitle: const Text('Enchaîner les épisodes suivants', style: TextStyle(color: AppColors.textSecondary)),
            value: _autoplay,
            onChanged: (v) => setState(() => _autoplay = v),
          ),
          SwitchListTile(
            activeColor: AppColors.accent,
            title: const Text('Téléchargements en Wi-Fi uniquement', style: TextStyle(color: Colors.white)),
            subtitle: const Text('Économise vos données mobiles', style: TextStyle(color: AppColors.textSecondary)),
            value: _wifiOnly,
            onChanged: (v) => setState(() => _wifiOnly = v),
          ),
        ],
      ),
    );
  }
}

class HelpScreen extends StatelessWidget {
  const HelpScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final faqs = const [
      ('Comment fonctionne mon abonnement ?', "Consultez l'onglet Profil pour voir votre statut et gérer vos accès."),
      ('Une vidéo ne se lance pas ?', "Vérifiez votre connexion internet, puis réessayez avec le bouton de rechargement."),
      ('Comment contacter le support ?', "Écrivez-nous à support@syrixflix.com, nous répondons sous 48h."),
    ];
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(backgroundColor: AppColors.background, elevation: 0, title: const Text('Aide et Support')),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: faqs.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, i) {
          final (q, a) = faqs[i];
          return Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(q, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                Text(a, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
              ],
            ),
          );
        },
      ),
    );
  }
}
