/**
 * Configuration Tarifaire Centralisée — MarmiCout
 * Source unique de vérité pour la landing page et l'écran Paramètres > Abonnement.
 * Régime fiscal : TVA non applicable, article 293 B du CGI (prix nets finaux).
 */

export type BillingInterval = 'month' | 'year';

export type PlanId = 'trial' | 'essentiel' | 'pro' | 'pro_cloud' | 'fondateur';

export interface PlanPrice {
  amount: number;
  formatted: string;
  period: string;
  equivalentMonthlyFormatted?: string;
  stripePriceId: string | null;
}

export interface PricingPlan {
  id: PlanId;
  name: string;
  tagline: string;
  badge?: string;
  isRecommended?: boolean;
  storage: string;
  status: 'available' | 'coming_soon' | 'limited';
  scanQuota: number | null; // null = non applicable ou illimité
  monthlyPrice: PlanPrice | null;
  yearlyPrice: PlanPrice | null;
  features: string[];
  ctaText: {
    available: string;
    comingSoon?: string;
  };
}

export interface ComparisonRow {
  name: string;
  category: string;
  trial: string | boolean;
  essentiel: string | boolean;
  pro: string | boolean;
  proCloud: string | boolean;
}

export interface PricingConfig {
  flags: {
    cloudSyncEnabled: boolean;
    founderOfferEnabled: boolean;
    founderSeatsLeft: number | null; // Pilote le compteur : masquer si null, aucun chiffre inventé
  };
  copy: {
    title: string;
    subtitle: string;
    taxNotice: string;
    reassuranceBanner: string;
    convincingCalculation: {
      title: string;
      text: string;
    };
    whyCloud: {
      title: string;
      text: string;
    };
    positioning: {
      title: string;
      text: string;
    };
  };
  plans: PricingPlan[];
  founderOffer: {
    id: 'fondateur';
    name: string;
    badge: string;
    storage: string;
    priceFormatted: string;
    priceDetails: string;
    stripePriceId: string | null;
    ctaText: string;
    features: string[];
  };
  comparison: ComparisonRow[];
  faq: Array<{
    question: string;
    answer: string;
  }>;
}

export const PRICING_CONFIG: PricingConfig = {
  flags: {
    cloudSyncEnabled: false, // Tant que le backend cloud n'est pas en production
    founderOfferEnabled: true,
    founderSeatsLeft: null // Pilote le compteur : si null, le compteur est masqué
  },

  copy: {
    title: "Un abonnement remboursé dès votre première fournée",
    subtitle: "Choisissez la formule adaptée à votre atelier. Sans engagement, résiliable à tout moment, sans TVA ajoutée.",
    taxNotice: "Prix nets, TVA non applicable (art. 293 B du CGI)",
    reassuranceBanner: "14 jours d'essai gratuit • Sans carte bancaire • Sans engagement • Édité en France par App à la Carte • Prix nets, TVA non applicable (art. 293 B du CGI)",
    convincingCalculation: {
      title: "Le calcul qui convainc",
      text: "Une recette sous-évaluée de seulement 0,50\u00A0€ par portion, vendue 70 fois par mois, c'est 35\u00A0€ de marge perdue. Plus que le prix de la formule Pro Cloud. MarmiCout vous montre ces écarts avant qu'ils ne vous coûtent."
    },
    whyCloud: {
      title: "Pourquoi choisir le Cloud ?",
      text: "Aujourd'hui, vos données vivent dans votre navigateur. C'est confidentiel, mais fragile : un ordinateur qui tombe en panne, un cache vidé ou un changement de poste, et tout peut disparaître. Avec Pro Cloud, vos recettes, stocks et ventes sont sauvegardés automatiquement chaque jour et accessibles sur tous vos appareils. Vous consultez une fiche sur la tablette en cuisine et retrouvez tout sur le PC du bureau le soir."
    },
    positioning: {
      title: "Positionnement",
      text: "Les logiciels de gestion pour la restauration démarrent généralement autour de 80\u00A0€ par mois et par site, et sont pensés pour les restaurants. MarmiCout est conçu pour les artisans et traiteurs indépendants : l'essentiel, sans la complexité ni le prix d'un ERP."
    }
  },

  plans: [
    {
      id: "trial",
      name: "Essai gratuit",
      tagline: "14 jours pour tester toutes les fonctions Pro en situation réelle",
      badge: "14 jours gratuits",
      storage: "Navigateur",
      status: "available",
      scanQuota: 150,
      monthlyPrice: {
        amount: 0,
        formatted: "0\u00A0€",
        period: "pendant 14 jours",
        stripePriceId: null
      },
      yearlyPrice: null,
      features: [
        "Toutes les fonctionnalités Pro incluses",
        "Sans carte bancaire requise",
        "Données de démonstration incluses",
        "Bouton « Démarrer de zéro » en un clic",
        "Stockage local confidentiel dans votre navigateur"
      ],
      ctaText: {
        available: "Démarrer mon essai gratuit"
      }
    },
    {
      id: "essentiel",
      name: "Essentiel",
      tagline: "La gestion quotidienne des coûts pour les artisans solos",
      storage: "Navigateur (local)",
      status: "available",
      scanQuota: 10,
      monthlyPrice: {
        amount: 14.9,
        formatted: "14,90\u00A0€",
        period: "/ mois",
        stripePriceId: null
      },
      yearlyPrice: {
        amount: 149,
        formatted: "149\u00A0€",
        period: "/ an",
        equivalentMonthlyFormatted: "12,42\u00A0€",
        stripePriceId: null
      },
      features: [
        "Produits & stocks illimités, alertes de stock bas",
        "Recettes illimitées avec coût par portion et prix de vente conseillé HT/TTC",
        "Productions par lot avec déstockage automatique",
        "Ventes & rapport de bénéfice net",
        "Fournisseurs et historique des prix",
        "10 scans de factures (OCR) par mois",
        "Export CSV et sauvegarde JSON manuelle",
        "Support par email"
      ],
      ctaText: {
        available: "Choisir cette formule"
      }
    },
    {
      id: "pro",
      name: "Pro",
      tagline: "Automatisation complète, imports avancés et synchronisation Google Sheets",
      storage: "Navigateur (local)",
      status: "available",
      scanQuota: 150,
      monthlyPrice: {
        amount: 24.9,
        formatted: "24,90\u00A0€",
        period: "/ mois",
        stripePriceId: null
      },
      yearlyPrice: {
        amount: 249,
        formatted: "249\u00A0€",
        period: "/ an",
        equivalentMonthlyFormatted: "20,75\u00A0€",
        stripePriceId: null
      },
      features: [
        "Tout le plan Essentiel, plus :",
        "150 scans de factures par mois",
        "Import de fiches techniques Word (.docx) et PDF",
        "Synchronisation Google Sheets en direct",
        "Rappel automatique d'export de sauvegarde (hebdomadaire)",
        "Support prioritaire"
      ],
      ctaText: {
        available: "Choisir cette formule"
      }
    },
    {
      id: "pro_cloud",
      name: "Pro Cloud",
      tagline: "Tranquillité absolue : sauvegarde quotidienne en ligne et multi-appareils",
      badge: "Recommandé",
      isRecommended: true,
      storage: "Sauvegarde en ligne + navigateur",
      status: "coming_soon",
      scanQuota: 150,
      monthlyPrice: {
        amount: 34.9,
        formatted: "34,90\u00A0€",
        period: "/ mois",
        stripePriceId: null
      },
      yearlyPrice: {
        amount: 349,
        formatted: "349\u00A0€",
        period: "/ an",
        equivalentMonthlyFormatted: "29,08\u00A0€",
        stripePriceId: null
      },
      features: [
        "Tout le plan Pro, plus :",
        "Sauvegarde automatique en ligne de toutes les données",
        "Accès sur plusieurs appareils : PC du bureau, tablette en cuisine, smartphone",
        "Restauration d'une version antérieure (historique 30 jours)",
        "Aucune perte de données en cas de changement d'ordinateur, de panne ou de cache vidé"
      ],
      ctaText: {
        available: "Sécuriser mes données",
        comingSoon: "Être prévenu du lancement"
      }
    }
  ],

  founderOffer: {
    id: "fondateur",
    name: "Offre Fondateur",
    badge: "Limitée aux 100 premiers clients",
    storage: "Sauvegarde en ligne",
    priceFormatted: "249\u00A0€",
    priceDetails: "la 1ʳᵉ année, puis tarif Pro Cloud garanti à vie au prix de lancement",
    stripePriceId: null,
    ctaText: "Devenir membre fondateur",
    features: [
      "Formule Pro Cloud complète incluse",
      "Sauvegarde en ligne automatique quotidienne & synchronisation multi-appareils",
      "150 scans de factures (OCR) par mois",
      "Tarif de lancement de 249\u00A0€/an garanti à vie tant que votre abonnement reste actif",
      "Support prioritaire direct avec les concepteurs de MarmiCout"
    ]
  },

  comparison: [
    {
      category: "Recettes & Marges",
      name: "Produits, ingrédients et stocks illimités",
      trial: true,
      essentiel: true,
      pro: true,
      proCloud: true
    },
    {
      category: "Recettes & Marges",
      name: "Alertes de stock bas personnalisables",
      trial: true,
      essentiel: true,
      pro: true,
      proCloud: true
    },
    {
      category: "Recettes & Marges",
      name: "Recettes illimitées & calcul du coût par portion",
      trial: true,
      essentiel: true,
      pro: true,
      proCloud: true
    },
    {
      category: "Recettes & Marges",
      name: "Prix de vente conseillé HT / TTC dynamique",
      trial: true,
      essentiel: true,
      pro: true,
      proCloud: true
    },
    {
      category: "Production & Ventes",
      name: "Productions par lot avec déstockage automatique",
      trial: true,
      essentiel: true,
      pro: true,
      proCloud: true
    },
    {
      category: "Production & Ventes",
      name: "Suivi des ventes & rapport de bénéfice net réel",
      trial: true,
      essentiel: true,
      pro: true,
      proCloud: true
    },
    {
      category: "Fournisseurs & Mercuriale",
      name: "Répertoire fournisseurs & historique des prix d'achat",
      trial: true,
      essentiel: true,
      pro: true,
      proCloud: true
    },
    {
      category: "Automatisation & Scans",
      name: "Scans de factures d'achat (OCR) par mois",
      trial: "150 scans (essai)",
      essentiel: "10 scans / mois",
      pro: "150 scans / mois",
      proCloud: "150 scans / mois"
    },
    {
      category: "Automatisation & Scans",
      name: "Import de fiches techniques Word (.docx) & PDF",
      trial: true,
      essentiel: false,
      pro: true,
      proCloud: true
    },
    {
      category: "Automatisation & Scans",
      name: "Synchronisation Google Sheets en direct",
      trial: true,
      essentiel: false,
      pro: true,
      proCloud: true
    },
    {
      category: "Sauvegarde & Données",
      name: "Export CSV & sauvegarde JSON manuelle",
      trial: true,
      essentiel: true,
      pro: true,
      proCloud: true
    },
    {
      category: "Sauvegarde & Données",
      name: "Rappel automatique d'export de sauvegarde hebdomadaire",
      trial: true,
      essentiel: false,
      pro: true,
      proCloud: true
    },
    {
      category: "Sauvegarde & Données",
      name: "Sauvegarde automatique en ligne quotidienne (Cloud)",
      trial: false,
      essentiel: false,
      pro: false,
      proCloud: "Bientôt disponible"
    },
    {
      category: "Sauvegarde & Données",
      name: "Accès multi-appareils synchronisé (PC, tablette, mobile)",
      trial: false,
      essentiel: false,
      pro: false,
      proCloud: "Bientôt disponible"
    },
    {
      category: "Sauvegarde & Données",
      name: "Historique de restauration sur 30 jours",
      trial: false,
      essentiel: false,
      pro: false,
      proCloud: "Bientôt disponible"
    },
    {
      category: "Support & Assistance",
      name: "Assistance client",
      trial: "Email",
      essentiel: "Email",
      pro: "Prioritaire",
      proCloud: "Prioritaire dédié"
    }
  ],

  faq: [
    {
      question: "Puis-je changer de formule ?",
      answer: "Oui, à tout moment depuis Paramètres > Abonnement. Le passage à une formule supérieure est immédiat."
    },
    {
      question: "Que deviennent mes données à la fin de l'essai ?",
      answer: "Elles restent sur votre appareil. Vous pouvez les exporter à tout moment, même sans abonnement actif."
    },
    {
      question: "Quelle différence entre Pro et Pro Cloud ?",
      answer: "Pro conserve vos données dans votre navigateur, sur un seul appareil. Pro Cloud les sauvegarde automatiquement en ligne et les synchronise entre vos appareils."
    },
    {
      question: "Pourquoi n'y a-t-il pas de TVA ?",
      answer: "App à la Carte relève de la franchise en base de TVA (article 293 B du CGI). Le prix affiché est le prix que vous payez."
    },
    {
      question: "Comment résilier ?",
      answer: "En un clic depuis Paramètres > Abonnement, ou par email à contact@appalacarte.fr. Aucun frais de résiliation."
    }
  ]
};
