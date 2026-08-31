import { Category } from '../modules/categories/category.model.js';
import { Article } from '../modules/articles/article.model.js';
import { estimateReadingTime } from '../common/utils.js';

const CATEGORIES = [
  { name: 'Leadership', slug: 'leadership', description: 'Vision, influence et prise de décision.' },
  { name: 'Entrepreneuriat', slug: 'entrepreneuriat', description: 'Parcours de fondateurs et builders.' },
  { name: 'Business', slug: 'business', description: 'Stratégie, croissance et modèles économiques.' },
  { name: 'Technologie', slug: 'technologie', description: 'Innovation tech et transformation digitale.' },
  { name: 'Innovation', slug: 'innovation', description: 'Idées nouvelles et disruption.' },
  { name: 'Podcasts', slug: 'podcasts', description: 'Coulisses et synthèses des épisodes.' },
  { name: 'Interviews', slug: 'interviews', description: 'Conversations exclusives avec les décideurs.' },
  { name: 'Actualités', slug: 'actualites', description: "L'actualité de Bany Talks et de l'écosystème." },
  { name: 'Événements', slug: 'evenements', description: 'Lives, studios et rencontres communautaires.' },
];

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export async function seedDatabase(force = false) {
  const categoryCount = await Category.countDocuments();
  const articleCount = await Article.countDocuments();

  if (!force && categoryCount > 0 && articleCount > 0) {
    console.log('Seed skipped: database already has data.');
    return;
  }

  if (force) {
    await Article.deleteMany({});
    await Category.deleteMany({});
  }

  await Category.bulkWrite(
    CATEGORIES.map((category) => ({
      updateOne: {
        filter: { slug: category.slug },
        update: { $set: category },
        upsert: true,
      },
    }))
  );

  const categories = await Category.find();
  const bySlug = Object.fromEntries(categories.map((category) => [category.slug, category]));

  const articles = [
    {
      title: 'Diriger sans titre : le leadership qui inspire vraiment',
      slug: 'diriger-sans-titre-leadership',
      excerpt:
        "Pourquoi l'influence réelle naît de la crédibilité, pas du statut — et comment la cultiver au quotidien.",
      content: `<p>Le leadership africain contemporain ne se joue plus uniquement dans les bureaux climatisés. Il se construit dans les conversations, les décisions difficiles et la capacité à rassembler autour d'une vision claire.</p>
<p>Chez Bany Talks, nous rencontrons chaque semaine des fondateurs qui n'attendent pas un titre pour entraîner. Ils montrent la voie par l'exemple, la transparence et l'exécution.</p>
<h2>Trois leviers concrets</h2>
<ul>
<li>Clarifier le « pourquoi » avant le « comment »</li>
<li>Écouter plus que l'on ne parle</li>
<li>Assumer les échecs publics pour accélérer l'apprentissage collectif</li>
</ul>
<p>Le vrai pouvoir, c'est de rendre les autres meilleurs — pas de briller seul.</p>`,
      coverImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80',
        'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80',
      ],
      author: 'Bany',
      category: bySlug.leadership._id,
      tags: ['leadership', 'management', 'culture'],
      status: 'published' as const,
      publishedAt: daysAgo(2),
      featured: true,
      seo: {
        metaTitle: 'Diriger sans titre : le leadership qui inspire | Bany Talks',
        metaDescription: "Découvrez comment cultiver une influence réelle sans dépendre d'un statut officiel.",
        ogImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80',
      },
    },
    {
      title: 'Lever des fonds en Afrique : ce que personne ne vous dit',
      slug: 'lever-des-fonds-en-afrique',
      excerpt: 'Pitch, traction, relations : les vérités terrain pour convaincre un investisseur sur le continent.',
      content: `<p>Lever des fonds n'est pas un sprint de slides — c'est une course de crédibilité. Les investisseurs africains et internationaux regardent d'abord la traction locale, puis le récit.</p>
<p>Nos invités fondateurs partagent souvent la même leçon : un deck parfait sans clients ne bat jamais un produit imparfait avec une file d'attente.</p>
<h2>Checklist avant de pitcher</h2>
<ol>
<li>Preuve de demande (paiements, waitlist active)</li>
<li>Unit economics compréhensibles</li>
<li>Équipe qui exécute sous contrainte</li>
</ol>
<p>Le capital suit la confiance. Construisez la confiance d'abord.</p>`,
      coverImage: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&q=80',
      gallery: [],
      author: 'Bany',
      category: bySlug.entrepreneuriat._id,
      tags: ['fundraising', 'startup', 'investissement'],
      status: 'published' as const,
      publishedAt: daysAgo(5),
      featured: true,
      seo: {
        metaTitle: 'Lever des fonds en Afrique | Bany Talks Blog',
        metaDescription: 'Conseils concrets pour pitcher et convaincre les investisseurs sur le continent africain.',
      },
    },
    {
      title: 'Business model : construire une machine à cash durable',
      slug: 'business-model-machine-a-cash',
      excerpt: 'De la monétisation à la récurrence : comment transformer une idée en entreprise rentable.',
      content: `<p>Un business model solide n'est pas une slide PowerPoint. C'est un système qui convertit de la valeur créée en revenus prévisibles.</p>
<p>Sur les marchés africains, la simplicité gagne souvent : pricing clair, canaux locaux, et une obsession pour le cash flow.</p>`,
      coverImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
      gallery: ['https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80'],
      author: 'Équipe Bany Talks',
      category: bySlug.business._id,
      tags: ['business', 'stratégie', 'monétisation'],
      status: 'published' as const,
      publishedAt: daysAgo(8),
      featured: false,
      seo: {
        metaTitle: 'Business model durable | Blog Bany Talks',
        metaDescription: 'Comment structurer un modèle économique rentable et adapté aux marchés africains.',
      },
    },
    {
      title: 'IA et médias : ce que les créateurs africains doivent anticiper',
      slug: 'ia-medias-createurs-africains',
      excerpt: 'Outils, opportunités et risques éthiques pour les podcasts et plateformes du continent.',
      content: `<p>L'intelligence artificielle accélère la production de contenu — mais elle ne remplace pas la voix authentique. Sur Bany Talks, la technologie sert le récit, jamais l'inverse.</p>
<p>Transcription, clipping, traduction : autant de leviers pour amplifier une conversation sans diluer son âme.</p>`,
      coverImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80',
      gallery: [],
      author: 'Bany',
      category: bySlug.technologie._id,
      tags: ['ia', 'média', 'création'],
      status: 'published' as const,
      publishedAt: daysAgo(12),
      featured: false,
      seo: {
        metaTitle: 'IA et médias africains | Bany Talks',
        metaDescription: "Comment les créateurs africains peuvent utiliser l'IA sans perdre leur authenticité.",
      },
    },
    {
      title: 'Innovation frugale : innover avec moins, impactez plus',
      slug: 'innovation-frugale-afrique',
      excerpt: "Pourquoi les contraintes locales sont souvent le meilleur moteur d'innovation.",
      content: `<p>L'innovation frugale n'est pas une mode. C'est une discipline : résoudre un problème réel avec les ressources disponibles, sans attendre le budget idéal.</p>`,
      coverImage: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&q=80',
      gallery: [],
      author: 'Équipe Bany Talks',
      category: bySlug.innovation._id,
      tags: ['innovation', 'frugalité', 'impact'],
      status: 'published' as const,
      publishedAt: daysAgo(15),
      featured: false,
      seo: {
        metaTitle: 'Innovation frugale en Afrique | Blog Bany',
        metaDescription: 'Comment innover efficacement malgré les contraintes de ressources.',
      },
    },
    {
      title: "Coulisses d'un enregistrement Bany Talks à Kinshasa",
      slug: 'coulisses-enregistrement-kinshasa',
      excerpt: "Une journée type au studio : préparation, énergie live et moments captés hors caméra.",
      content: `<p>Derrière chaque épisode, il y a une équipe, une lumière, et souvent un café trop fort. Voici ce que l'on ne voit pas à l'écran.</p>`,
      coverImage: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200&q=80',
      gallery: ['https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&q=80'],
      author: 'Bany',
      category: bySlug.podcasts._id,
      tags: ['podcast', 'studio', 'coulisses'],
      status: 'published' as const,
      publishedAt: daysAgo(18),
      featured: true,
      seo: {
        metaTitle: 'Coulisses studio Bany Talks Kinshasa',
        metaDescription: "Plongez dans les coulisses d'un enregistrement d'émission à Kinshasa.",
      },
    },
    {
      title: 'Interview exclusive : bâtir une marque personnelle crédible',
      slug: 'interview-marque-personnelle',
      excerpt: "Les conseils d'un entrepreneur média pour transformer son expertise en influence durable.",
      content: `<p>Une marque personnelle n'est pas une série de posts LinkedIn. C'est une promesse tenue, répétée, et visible dans le temps.</p>`,
      coverImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&q=80',
      gallery: [],
      author: 'Bany',
      category: bySlug.interviews._id,
      tags: ['interview', 'personal branding'],
      status: 'published' as const,
      publishedAt: daysAgo(22),
      featured: false,
      seo: {
        metaTitle: 'Marque personnelle crédible | Interview Bany Talks',
        metaDescription: 'Comment construire une marque personnelle solide et durable.',
      },
    },
    {
      title: 'Bany Talks ouvre un nouveau format live mensuel',
      slug: 'nouveau-format-live-mensuel',
      excerpt: 'Annonce : chaque mois, une conversation live avec un invité surprise et vos questions en direct.',
      content: `<p>Nous lançons un rendez-vous live mensuel pour rapprocher encore plus la communauté et le plateau.</p>`,
      coverImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80',
      gallery: [],
      author: 'Équipe Bany Talks',
      category: bySlug.actualites._id,
      tags: ['actualité', 'live', 'communauté'],
      status: 'published' as const,
      publishedAt: daysAgo(1),
      featured: false,
      seo: {
        metaTitle: 'Nouveau format live mensuel | Bany Talks',
        metaDescription: 'Découvrez le nouveau rendez-vous live mensuel de Bany Talks.',
      },
    },
    {
      title: 'Save the date : soirée builders à Kinshasa',
      slug: 'soiree-builders-kinshasa',
      excerpt: 'Networking, pitchs express et conversations sans filtre — réservez votre place.',
      content: `<p>Rejoignez-nous pour une soirée dédiée aux builders de Kinshasa. Speakers, networking et surprises.</p>`,
      coverImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80',
      gallery: [],
      author: 'Équipe Bany Talks',
      category: bySlug.evenements._id,
      tags: ['événement', 'kinshasa', 'networking'],
      status: 'published' as const,
      publishedAt: daysAgo(3),
      featured: false,
      seo: {
        metaTitle: 'Soirée builders Kinshasa | Événements Bany Talks',
        metaDescription: 'Inscrivez-vous à la soirée builders organisée par Bany Talks à Kinshasa.',
      },
    },
  ].map((article) => ({
    ...article,
    readingTimeMinutes: estimateReadingTime(article.content),
    scheduledAt: null,
  }));

  await Article.bulkWrite(
    articles.map((article) => ({
      updateOne: {
        filter: { slug: article.slug },
        update: { $set: article },
        upsert: true,
      },
    }))
  );
  console.log(`Seeded ${categories.length} categories and ${articles.length} articles.`);
}
