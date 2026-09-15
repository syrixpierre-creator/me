/**
 * Catalogue de secours local pour SYRIX FLIX.
 * Utilisé automatiquement lorsque CATALOG_API_BASE_URL n'est pas renseigné
 * ou que le serveur distant n'est pas joignable.
 */

const SAMPLE_MOVIES = [
  {
    title: "Oppenheimer",
    slug: "oppenheimer-2023",
    type: "movie",
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    genres: ["Drame", "Histoire", "Biopic"],
    genre: "Drame",
    year: 2023,
    rating: 8.9,
    status: "Sorti",
    country: "USA",
    synopsis: "Pendant la Seconde Guerre mondiale, le physicien J. Robert Oppenheimer dirige le projet Manhattan, destiné à concevoir la première arme atomique de l'histoire.",
    first_episode_id: "ep-oppenheimer-1",
    episodes: [{ episode_id: "ep-oppenheimer-1", title: "Film complet", number: 1 }]
  },
  {
    title: "Dune : Deuxième Partie",
    slug: "dune-part-two-2024",
    type: "movie",
    image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
    genres: ["Science-Fiction", "Aventure", "Action"],
    genre: "Science-Fiction",
    year: 2024,
    rating: 8.6,
    status: "Sorti",
    country: "USA",
    synopsis: "Paul Atreides s'unit à Chani et aux Fremen tout en préparant sa revanche contre les conspirateurs qui ont détruit sa famille.",
    first_episode_id: "ep-dune2-1",
    episodes: [{ episode_id: "ep-dune2-1", title: "Film complet", number: 1 }]
  },
  {
    title: "Interstellar",
    slug: "interstellar-2014",
    type: "movie",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80",
    genres: ["Science-Fiction", "Drame", "Aventure"],
    genre: "Science-Fiction",
    year: 2014,
    rating: 8.7,
    status: "Sorti",
    country: "USA",
    synopsis: "Face à une Terre devenue inhabitable, un groupe d'explorateurs utilise une faille spatio-temporelle récemment découverte pour repousser les limites de l'humain.",
    first_episode_id: "ep-interstellar-1",
    episodes: [{ episode_id: "ep-interstellar-1", title: "Film complet", number: 1 }]
  },
  {
    title: "Inception",
    slug: "inception-2010",
    type: "movie",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    genres: ["Action", "Science-Fiction", "Thriller"],
    genre: "Action",
    year: 2010,
    rating: 8.8,
    status: "Sorti",
    country: "USA",
    synopsis: "Dom Cobb est un voleur expérimenté dans l'art périlleux de l'extraction, volant les secrets les plus précieux enfouis dans les rêves.",
    first_episode_id: "ep-inception-1",
    episodes: [{ episode_id: "ep-inception-1", title: "Film complet", number: 1 }]
  },
  {
    title: "Spider-Man : Across the Spider-Verse",
    slug: "spider-man-across-spider-verse",
    type: "movie",
    image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80",
    genres: ["Animation", "Action", "Aventure"],
    genre: "Animation",
    year: 2023,
    rating: 8.7,
    status: "Sorti",
    country: "USA",
    synopsis: "Miles Morales est catapulté à travers le Multivers, où il rencontre une équipe de Spider-Héros chargée de protéger son existence même.",
    first_episode_id: "ep-spiderman-1",
    episodes: [{ episode_id: "ep-spiderman-1", title: "Film complet", number: 1 }]
  }
];

const SAMPLE_SERIES = [
  {
    title: "Arcane",
    slug: "arcane",
    type: "series",
    image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
    genres: ["Animation", "Action", "Sci-Fi"],
    genre: "Animation",
    year: 2021,
    rating: 9.0,
    status: "En cours",
    country: "USA / France",
    synopsis: "Au cœur du conflit qui oppose les cités jumelles de Piltover et Zaun, deux sœurs se battent dans les camps opposés d'une guerre entre technologies magiques et croyances incompatibles.",
    episodes: [
      { episode_id: "ep-arcane-s1e1", title: "Épisode 1 : Les bas-fonds", number: 1 },
      { episode_id: "ep-arcane-s1e2", title: "Épisode 2 : Certains mystères...", number: 2 },
      { episode_id: "ep-arcane-s1e3", title: "Épisode 3 : La violence brute", number: 3 }
    ]
  },
  {
    title: "Stranger Things",
    slug: "stranger-things",
    type: "series",
    image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
    genres: ["Science-Fiction", "Horreur", "Drame"],
    genre: "Science-Fiction",
    year: 2016,
    rating: 8.7,
    status: "En cours",
    country: "USA",
    synopsis: "À Hawkins en 1983, la disparition mystérieuse d'un jeune garçon entraîne ses amis, sa famille et la police locale dans une série d'événements surnaturels.",
    episodes: [
      { episode_id: "ep-stranger-s1e1", title: "Chapitre 1 : La Disparition de Will Byers", number: 1 },
      { episode_id: "ep-stranger-s1e2", title: "Chapitre 2 : La Barjot de Maple Street", number: 2 }
    ]
  },
  {
    title: "The Last of Us",
    slug: "the-last-of-us",
    type: "series",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    genres: ["Drame", "Action", "Horreur"],
    genre: "Drame",
    year: 2023,
    rating: 8.8,
    status: "En cours",
    country: "USA",
    synopsis: "Vingt ans après la destruction de la civilisation moderne, Joel est engagé pour faire sortir Ellie clandestinement d'une zone de quarantaine oppressante.",
    episodes: [
      { episode_id: "ep-tlou-s1e1", title: "Épisode 1 : Quand tu es perdu dans les ténèbres", number: 1 },
      { episode_id: "ep-tlou-s1e2", title: "Épisode 2 : Les Infectés", number: 2 }
    ]
  }
];

const SAMPLE_ANIME = [
  {
    title: "Solo Leveling",
    slug: "solo-leveling",
    type: "anime",
    image: "https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80",
    genres: ["Action", "Fantasy", "Aventure"],
    genre: "Action",
    year: 2024,
    rating: 8.5,
    status: "En cours",
    country: "Japon",
    synopsis: "Dans un monde où d'étranges portails connectent notre monde à des donjons remplis de monstres, Sung Jinwoo est connu comme le chasseur le plus faible de l'humanité.",
    episodes: [
      { episode_id: "ep-solo-e1", title: "Épisode 1 : Je suis habitué", number: 1 },
      { episode_id: "ep-solo-e2", title: "Épisode 2 : Si j'avais une opportunité", number: 2 }
    ]
  },
  {
    title: "Jujutsu Kaisen",
    slug: "jujutsu-kaisen",
    type: "anime",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
    genres: ["Action", "Surnaturel", "Fantasy"],
    genre: "Action",
    year: 2020,
    rating: 8.6,
    status: "En cours",
    country: "Japon",
    synopsis: "Yuji Itadori, un lycéen doté d'une force physique hors du commun, avale par accident un doigt maudit de Ryomen Sukuna et se retrouve plongé dans le monde occulte.",
    episodes: [
      { episode_id: "ep-jjk-e1", title: "Épisode 1 : Ryomen Sukuna", number: 1 },
      { episode_id: "ep-jjk-e2", title: "Épisode 2 : Pour moi-même", number: 2 }
    ]
  },
  {
    title: "Demon Slayer (Kimetsu no Yaiba)",
    slug: "demon-slayer",
    type: "anime",
    image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
    genres: ["Animation", "Action", "Historique"],
    genre: "Animation",
    year: 2019,
    rating: 8.7,
    status: "En cours",
    country: "Japon",
    synopsis: "Tanjiro Kamado part en quête pour venger sa famille massacrée et trouver un remède pour guérir sa sœur transformée en démon.",
    episodes: [
      { episode_id: "ep-ds-e1", title: "Épisode 1 : Cruauté", number: 1 },
      { episode_id: "ep-ds-e2", title: "Épisode 2 : Sakonji Urokodaki", number: 2 }
    ]
  }
];

const SAMPLE_DRAMAS = [
  {
    title: "Squid Game",
    slug: "squid-game",
    type: "drama",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    genres: ["Thriller", "Drame", "Survie"],
    genre: "Thriller",
    year: 2021,
    rating: 8.0,
    status: "En cours",
    country: "Corée du Sud",
    synopsis: "Des centaines de joueurs fauchés acceptent une étrange invitation à s'affronter dans des jeux pour enfants pour une somme astronomique.",
    episodes: [
      { episode_id: "ep-sg-e1", title: "Épisode 1 : Un, deux, trois, soleil", number: 1 },
      { episode_id: "ep-sg-e2", title: "Épisode 2 : L'Enfer", number: 2 }
    ]
  },
  {
    title: "The Glory",
    slug: "the-glory",
    type: "drama",
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    genres: ["Drame", "Thriller", "Vengeance"],
    genre: "Drame",
    year: 2022,
    rating: 8.1,
    status: "Terminé",
    country: "Corée du Sud",
    synopsis: "Des années après avoir survécu à un harcèlement effroyable au lycée, une femme met à exécution un plan de vengeance méticuleusement orchestré.",
    episodes: [
      { episode_id: "ep-glory-e1", title: "Épisode 1", number: 1 },
      { episode_id: "ep-glory-e2", title: "Épisode 2", number: 2 }
    ]
  }
];

const SAMPLE_SERVERS = [
  {
    server_name: "Serveur Principal HD (Démo)",
    server_link: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    version: "VF - 1080p"
  },
  {
    server_name: "Serveur Rapide CDN",
    server_link: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    version: "VOSTFR - 720p"
  }
];

function getFallbackCatalog(path, params = {}) {
  const cleanPath = path.replace(/^\/api\/v1/, "");

  // /movies
  if (cleanPath === "/movies") {
    let list = SAMPLE_MOVIES;
    if (params.genre) {
      list = list.filter((m) => m.genres.some((g) => g.toLowerCase() === params.genre.toLowerCase()));
    }
    return { status: 200, body: { success: true, data: list } };
  }

  // /movies/:slug
  const movieMatch = cleanPath.match(/^\/movies\/([^/?#]+)/);
  if (movieMatch) {
    const slug = decodeURIComponent(movieMatch[1]);
    const item = SAMPLE_MOVIES.find((m) => m.slug === slug) || SAMPLE_MOVIES[0];
    return { status: 200, body: { success: true, data: item } };
  }

  // /series
  if (cleanPath === "/series") {
    let list = SAMPLE_SERIES;
    if (params.genre) {
      list = list.filter((s) => s.genres.some((g) => g.toLowerCase() === params.genre.toLowerCase()));
    }
    return { status: 200, body: { success: true, data: list } };
  }

  // /series/:slug
  const seriesMatch = cleanPath.match(/^\/series\/([^/?#]+)/);
  if (seriesMatch) {
    const slug = decodeURIComponent(seriesMatch[1]);
    const item = SAMPLE_SERIES.find((s) => s.slug === slug) || SAMPLE_SERIES[0];
    return { status: 200, body: { success: true, data: item } };
  }

  // /anime
  if (cleanPath === "/anime") {
    let list = SAMPLE_ANIME;
    if (params.genre) {
      list = list.filter((a) => a.genres.some((g) => g.toLowerCase() === params.genre.toLowerCase()));
    }
    return { status: 200, body: { success: true, data: list } };
  }

  // /anime/:slug/servers
  if (cleanPath.includes("/anime/") && cleanPath.includes("/servers")) {
    return { status: 200, body: { success: true, data: SAMPLE_SERVERS } };
  }

  // /anime/:slug
  const animeMatch = cleanPath.match(/^\/anime\/([^/?#]+)/);
  if (animeMatch) {
    const slug = decodeURIComponent(animeMatch[1]);
    const item = SAMPLE_ANIME.find((a) => a.slug === slug) || SAMPLE_ANIME[0];
    return { status: 200, body: { success: true, data: item } };
  }

  // /dramas
  if (cleanPath === "/dramas") {
    let list = SAMPLE_DRAMAS;
    if (params.genre) {
      list = list.filter((d) => d.genres.some((g) => g.toLowerCase() === params.genre.toLowerCase()));
    }
    return { status: 200, body: { success: true, data: list } };
  }

  // /dramas/:slug/servers
  if (cleanPath.includes("/dramas/") && cleanPath.includes("/servers")) {
    return { status: 200, body: { success: true, data: SAMPLE_SERVERS } };
  }

  // /dramas/:slug
  const dramaMatch = cleanPath.match(/^\/dramas\/([^/?#]+)/);
  if (dramaMatch) {
    const slug = decodeURIComponent(dramaMatch[1]);
    const item = SAMPLE_DRAMAS.find((d) => d.slug === slug) || SAMPLE_DRAMAS[0];
    return { status: 200, body: { success: true, data: item } };
  }

  // /episodes/:id/servers
  if (cleanPath.includes("/episodes/") && cleanPath.includes("/servers")) {
    return { status: 200, body: { success: true, data: SAMPLE_SERVERS } };
  }

  // /search
  if (cleanPath === "/search") {
    const q = (params.q || "").toLowerCase().trim();
    const all = [...SAMPLE_MOVIES, ...SAMPLE_SERIES, ...SAMPLE_ANIME, ...SAMPLE_DRAMAS];
    const results = q ? all.filter((item) => item.title.toLowerCase().includes(q)) : all;
    return { status: 200, body: { success: true, data: results } };
  }

  return {
    status: 200,
    body: { success: true, data: [] }
  };
}

module.exports = { getFallbackCatalog };
