import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class MediaCard extends StatelessWidget {
  final String title;
  final String? imageUrl;
  final double? progress; // 0.0 - 1.0, null = pas de progression affichée
  final VoidCallback? onTap;

  const MediaCard({super.key, required this.title, this.imageUrl, this.progress, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
      width: 110,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Container(
              height: 120,
              width: 110,
              color: AppColors.surface,
              child: imageUrl != null
                  ? Image.network(imageUrl!, fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const Icon(Icons.movie_outlined, color: Colors.white24))
                  : const Icon(Icons.movie_outlined, color: Colors.white24, size: 32),
            ),
          ),
          if (progress != null) ...[
            const SizedBox(height: 4),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 3,
                backgroundColor: AppColors.border,
                valueColor: const AlwaysStoppedAnimation(AppColors.accent),
              ),
            ),
          ],
          const SizedBox(height: 6),
          Text(title, maxLines: 1, overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: Colors.white, fontSize: 12)),
        ],
      ),
    ),
    );
  }
}
