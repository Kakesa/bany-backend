import { EmailTemplate } from './template.model.js';

const DEFAULT_TEMPLATES = [
  {
    name: 'Bienvenue Bany',
    slug: 'welcome',
    category: 'welcome' as const,
    subject: 'Bienvenue dans l’univers Bany Talks',
    previewText: 'Merci pour votre inscription à la newsletter.',
    isSystem: true,
    htmlBody: `
      <p>Bonjour {{firstName}},</p>
      <p>Merci de rejoindre la communauté <strong>Bany Official</strong>.</p>
      <p>Vous recevrez désormais :</p>
      <ul>
        <li>les synthèses d’épisodes</li>
        <li>les ressources exclusives de nos invités</li>
        <li>les invitations aux enregistrements studio à Kinshasa</li>
      </ul>
      <p style="margin:28px 0">
        <a href="{{siteUrl}}" style="display:inline-block;background:#ef3b3b;color:#fff;text-decoration:none;padding:12px 18px;font-weight:700">
          Découvrir Bany Talks
        </a>
      </p>
      <p>À très vite,<br/>L’équipe Bany Official</p>
    `,
    textBody:
      'Bonjour {{firstName}},\n\nMerci de rejoindre Bany Official. Vous serez informé des prochains épisodes, ressources et invitations studio.\n\n{{siteUrl}}',
  },
  {
    name: 'Nouvel article',
    slug: 'article-publish',
    category: 'article' as const,
    subject: 'Nouveau sur Bany Talks — {{title}}',
    previewText: '{{excerpt}}',
    isSystem: true,
    htmlBody: `
      <p>Un nouveau contenu vient d’être publié :</p>
      <h2 style="color:#fff;font-size:20px;margin:12px 0">{{title}}</h2>
      <p>{{excerpt}}</p>
      <p style="margin:28px 0">
        <a href="{{articleUrl}}" style="display:inline-block;background:#ef3b3b;color:#fff;text-decoration:none;padding:12px 18px;font-weight:700">
          Lire l’article
        </a>
      </p>
    `,
    textBody: 'Nouveau sur Bany Talks : {{title}}\n\n{{excerpt}}\n\nLire : {{articleUrl}}',
  },
  {
    name: 'Annonce / Épisode',
    slug: 'announcement',
    category: 'announcement' as const,
    subject: '{{subject}}',
    previewText: 'Une nouveauté de Bany Official',
    isSystem: true,
    htmlBody: `
      <div style="white-space:pre-wrap">{{message}}</div>
      <p style="margin:28px 0">
        <a href="{{siteUrl}}" style="display:inline-block;background:#ef3b3b;color:#fff;text-decoration:none;padding:12px 18px;font-weight:700">
          Voir sur le site
        </a>
      </p>
    `,
    textBody: '{{message}}\n\n{{siteUrl}}',
  },
];

export async function ensureDefaultEmailTemplates() {
  for (const tpl of DEFAULT_TEMPLATES) {
    const existing = await EmailTemplate.findOne({ slug: tpl.slug });
    if (!existing) {
      await EmailTemplate.create(tpl);
    }
  }
}
