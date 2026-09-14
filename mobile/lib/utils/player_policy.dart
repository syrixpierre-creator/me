/// Politiques de sandbox iframe adaptées à chaque lecteur tiers.
///
/// Port fidèle de services/player_policy.py (version Python du projet).
/// Le site ne connaît pas à l'avance la liste exacte des serveurs renvoyés
/// par Coflix / Voiranime / Voirdrama : cette fonction choisit donc des
/// permissions selon le nom ou l'hôte du lecteur, avec une politique sûre
/// par défaut — sans popups ni navigation top-level automatique, ce qui
/// bloque la quasi-totalité des redirections publicitaires.

const List<String> _defaultSandbox = [
  'allow-scripts',
  'allow-same-origin',
  'allow-forms',
  'allow-presentation',
];

const List<String> _baseVideoTokens = [
  'allow-scripts',
  'allow-same-origin',
  'allow-presentation',
];

const List<String> _popupTokens = [
  'allow-popups',
  'allow-popups-to-escape-sandbox',
];

/// Règles par mots-clés (testés en minuscules contre le nom du serveur et
/// l'hôte de son URL) — identiques à _PLAYER_RULES côté Python.
final List<(List<String>, List<String>)> _playerRules = [
  (
    ['vidmoly'],
    [..._baseVideoTokens, 'allow-pointer-lock'],
  ),
  (
    ['voe.', 'voe.sx', 'voe-'],
    [..._baseVideoTokens, 'allow-forms', ..._popupTokens, 'allow-top-navigation-by-user-activation'],
  ),
  (
    ['streamtape', 'stape'],
    [..._baseVideoTokens, ..._popupTokens],
  ),
  (
    ['mail.ru', 'my.mail.ru'],
    [..._baseVideoTokens, 'allow-forms'],
  ),
  (
    ['kokoflix', 'voembed', 'vidsrc', 'vidcloud', 'upcloud', 'filemoon'],
    [..._baseVideoTokens, 'allow-forms', 'allow-pointer-lock', ..._popupTokens],
  ),
];

String _hostOf(String link) {
  try {
    return Uri.parse(link).host.toLowerCase();
  } catch (_) {
    return '';
  }
}

/// Retourne la valeur de l'attribut HTML `sandbox` pour un serveur donné.
String playerSandbox({required String serverName, required String serverLink}) {
  final label = serverName.toLowerCase();
  final host = _hostOf(serverLink);
  final haystack = '$label $host';

  for (final (keywords, tokens) in _playerRules) {
    if (keywords.any((k) => haystack.contains(k))) {
      return tokens.join(' ');
    }
  }
  return _defaultSandbox.join(' ');
}
