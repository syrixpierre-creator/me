import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Reproduit le logo textuel "S SYRIX / FLIX" vu sur les maquettes
/// (double S stylisé — ici simplifié en icône + texte bicolore).
class SyrixLogo extends StatelessWidget {
  final double fontSize;
  const SyrixLogo({super.key, this.fontSize = 32});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: fontSize * 1.1,
          height: fontSize * 1.1,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [AppColors.accent, Colors.white],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(fontSize * 0.28),
          ),
          child: Center(
            child: Text(
              'S',
              style: TextStyle(
                fontSize: fontSize * 0.7,
                fontWeight: FontWeight.w900,
                color: Colors.black,
              ),
            ),
          ),
        ),
        SizedBox(width: fontSize * 0.25),
        RichText(
          text: TextSpan(
            children: [
              TextSpan(
                text: 'SYRIX\n',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: fontSize * 0.62,
                  fontWeight: FontWeight.w800,
                  height: 1,
                  letterSpacing: 1,
                ),
              ),
              TextSpan(
                text: 'FLIX',
                style: TextStyle(
                  color: AppColors.accent,
                  fontSize: fontSize * 0.62,
                  fontWeight: FontWeight.w800,
                  height: 1,
                  letterSpacing: 1,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
