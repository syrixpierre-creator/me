import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Petit indicateur "connexion indisponible" stylé pour SYRIX FLIX :
/// une icône qui tourne en boucle en continu (pas juste un spinner générique)
/// avec un halo accent, et qui sert aussi de bouton "Réessayer" au tap.
///
/// À utiliser partout où un appel API peut échouer faute d'internet
/// (FutureBuilder en erreur, chargement raté, etc.) pour remplacer les
/// messages d'erreur bruts par quelque chose de plus soigné.
class NetworkRetryButton extends StatefulWidget {
  final VoidCallback onRetry;
  final String message;

  const NetworkRetryButton({
    super.key,
    required this.onRetry,
    this.message = "Connexion internet indisponible",
  });

  @override
  State<NetworkRetryButton> createState() => _NetworkRetryButtonState();
}

class _NetworkRetryButtonState extends State<NetworkRetryButton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    // Rotation continue tant que l'erreur est affichée — donne un vrai
    // effet "ça cherche encore du réseau" plutôt qu'une icône figée.
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(32),
              onTap: widget.onRetry,
              child: Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.surface,
                  border: Border.all(color: AppColors.accent.withOpacity(0.5)),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.accent.withOpacity(0.28),
                      blurRadius: 18,
                      spreadRadius: 1,
                    ),
                  ],
                ),
                child: RotationTransition(
                  turns: _controller,
                  child: const Icon(Icons.refresh_rounded,
                      color: AppColors.accent, size: 26),
                ),
              ),
            ),
          ),
          const SizedBox(height: 14),
          Text(
            widget.message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
          ),
          const SizedBox(height: 4),
          Text(
            'Touchez pour réessayer',
            style: TextStyle(
              color: AppColors.accent.withOpacity(0.9),
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
