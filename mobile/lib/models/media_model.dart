class MediaItem {
  final String title;
  final String slug;
  final String image;
  final String version;
  final String type; // movie | series | anime | drama
  final String? latestEpisode;

  MediaItem({
    required this.title,
    required this.slug,
    required this.image,
    required this.version,
    required this.type,
    this.latestEpisode,
  });

  factory MediaItem.fromJson(Map<String, dynamic> json) {
    return MediaItem(
      title: json['title'] ?? '',
      slug: json['slug'] ?? '',
      image: json['image'] ?? '',
      version: json['version'] ?? '',
      type: json['type'] ?? '',
      latestEpisode: json['latest_episode'],
    );
  }
}
