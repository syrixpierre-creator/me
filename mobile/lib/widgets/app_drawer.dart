import 'dart:ui';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../widgets/syrix_logo.dart';
import '../services/api_service.dart';
import '../screens/login_screen.dart';
import '../screens/profile_screen.dart';

class AppDrawer extends StatelessWidget {
  final String username;
  const AppDrawer({super.key, this.username = 'Utilisateur'});

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: Colors.transparent,
      child: ClipRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
          child: Container(
            color: AppColors.surface.withOpacity(0.72),
            child: SafeArea(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
                    child: const SyrixLogo(fontSize: 28),
                  ),
                  const Divider(color: AppColors.border),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    child: Row(
                      children: [
                        const CircleAvatar(
                          radius: 24,
                          backgroundColor: AppColors.border,
                          child: Icon(Icons.person, color: Colors.white70),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(username, style: const TextStyle(
                                color: Colors.white, fontWeight: FontWeight.bold,
                              )),
                              GestureDetector(
                                onTap: () => Navigator.push(context,
                                    MaterialPageRoute(builder: (_) => const ProfileScreen())),
                                child: const Text('Modifier le profil',
                                    style: TextStyle(color: AppColors.accent, fontSize: 12)),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  _tile(context, Icons.home_outlined, 'Accueil'),
                  _tile(context, Icons.favorite_border, 'Favoris'),
                  _tile(context, Icons.download_outlined, 'Téléchargements'),
                  _tile(context, Icons.history, 'Historique'),
                  _tile(context, Icons.settings_outlined, 'Paramètres'),
                  _tile(context, Icons.help_outline, 'Aide et Support'),
                  const Spacer(),
                  const Divider(color: AppColors.border),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        Icon(Icons.facebook, color: Colors.white38, size: 20),
                        SizedBox(width: 16),
                        Icon(Icons.alternate_email, color: Colors.white38, size: 20),
                        SizedBox(width: 16),
                        Icon(Icons.camera_alt_outlined, color: Colors.white38, size: 20),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(top: 6, bottom: 4),
                    child: Center(
                      child: Text('v1.2.0', style: TextStyle(color: AppColors.textSecondary, fontSize: 11)),
                    ),
                  ),
                  ListTile(
                    leading: const Icon(Icons.logout, color: AppColors.accent),
                    title: const Text('Déconnexion', style: TextStyle(color: AppColors.accent)),
                    onTap: () async {
                      await ApiService.logout();
                      if (context.mounted) {
                        Navigator.of(context).pushAndRemoveUntil(
                          MaterialPageRoute(builder: (_) => const LoginScreen()),
                          (route) => false,
                        );
                      }
                    },
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _tile(BuildContext context, IconData icon, String label) {
    return ListTile(
      leading: Icon(icon, color: Colors.white70),
      title: Text(label, style: const TextStyle(color: Colors.white)),
      onTap: () => Navigator.pop(context),
    );
  }
}
