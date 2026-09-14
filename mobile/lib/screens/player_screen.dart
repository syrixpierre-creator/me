import 'dart:html' as html;
import 'dart:ui_web' as ui_web;

import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../utils/player_policy.dart';

/// Lecteur vidéo embarqué (Flutter Web) : la source tierce (Vidmoly, VOE,
/// Streamtape, etc.) est affichée DANS une iframe avec un attribut
/// `sandbox` restrictif, directement sur la page — au lieu d'ouvrir un
/// nouvel onglet vers le lien brut, qui expose toute la publicité et les
/// popups du serveur vidéo.
class PlayerScreen extends StatefulWidget {
  final String title;
  final String serverName;
  final String serverLink;

  const PlayerScreen({
    super.key,
    required this.title,
    required this.serverName,
    required this.serverLink,
  });

  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen> {
  late final String _viewType;

  @override
  void initState() {
    super.initState();

    // Un viewType unique par lecture évite les conflits si l'utilisateur
    // change de serveur puis revient sur cet écran.
    _viewType = 'syrix-player-${DateTime.now().microsecondsSinceEpoch}';

    final sandbox = playerSandbox(serverName: widget.serverName, serverLink: widget.serverLink);

    ui_web.platformViewRegistry.registerViewFactory(_viewType, (int viewId) {
      final iframe = html.IFrameElement()
        ..src = widget.serverLink
        ..style.border = 'none'
        ..style.width = '100%'
        ..style.height = '100%'
        ..allowFullscreen = true
        ..setAttribute('sandbox', sandbox)
        ..setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
      return iframe;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        title: Text(widget.title, overflow: TextOverflow.ellipsis),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Center(
              child: Text(widget.serverName, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
            ),
          ),
        ],
      ),
      body: HtmlElementView(viewType: _viewType),
    );
  }
}
