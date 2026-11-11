/**
 * CE FICHIER EST GÉNÉRÉ AUTOMATIQUEMENT DEPUIS src/config/legal.ts D'APP À LA CARTE.
 * NE PAS MODIFIER DIRECTEMENT. SOURCE UNIQUE DE VÉRITÉ : Créateur_application/src/config/legal.ts
 */

export interface LegalConfig {
  legalBasis: string;
  editor: {
    commercialName: string;
    fullName: string;
    legalForm: string;
    fullEditorDesignation: string;
    address: string;
    siren: string;
    siret: string;
    rcs?: string;
    phone: string;
    phoneRaw: string;
    email: string;
    publicationDirector: string;
  };
  tva: {
    mention: string;
  };
  host: {
    name: string;
    address: string;
    phone: string;
    phoneRaw: string;
    website: string;
  };
  registrar: {
    name: string;
    address: string;
    phone: string;
    phoneRaw: string;
    website: string;
  };
  privacyPolicy: {
    hasPolicy: boolean;
    dataPrivacyFrameworkMentioned: boolean;
    cookiePolicyMentioned: boolean;
    url?: string;
  };
  terms: {
    hasCGU: boolean;
    hasCGV: boolean;
    urlCGU?: string;
    urlCGV?: string;
  };
}

export const LEGAL_CONFIG: LegalConfig = {
  legalBasis:
    "Conformément à l'article 1-1 de la loi n° 2004-575 du 21 juin 2004 pour la Confiance dans l'Économie Numérique (LCEN), modifiée par la loi n° 2024-449 du 21 mai 2024 (SREN), et à l'article 19 de cette même loi.",
  editor: {
    commercialName: "App à la Carte",
    fullName: "Hervé CHAMPAGNE",
    legalForm: "Entrepreneur individuel (EI)",
    fullEditorDesignation: "Hervé CHAMPAGNE, Entrepreneur individuel (EI)",
    address: "173 rue de Courcelles, 75017 Paris, France",
    siren: "132 021 098",
    siret: "132 021 098 00018",
    rcs: "", // Activité libérale non réglementée au RNE (INPI), non inscrit au RCS
    phone: "07 69 59 04 70",
    phoneRaw: "+33769590470",
    email: "contact@appalacarte.fr",
    publicationDirector: "l'éditeur",
  },
  tva: {
    mention: "TVA non applicable, article 293 B du CGI.",
  },
  host: {
    name: "Vercel Inc.",
    address: "440 N Barranca Ave #4133, Covina, CA 91723, USA",
    phone: "+1 951-383-6898",
    phoneRaw: "+19513836898",
    website: "https://vercel.com",
  },
  registrar: {
    name: "OVHcloud (OVH SAS)",
    address: "2 rue Kellermann, 59100 Roubaix, France",
    phone: "+33 9 72 10 10 07",
    phoneRaw: "+33972101007",
    website: "https://www.ovhcloud.com",
  },
  privacyPolicy: {
    hasPolicy: true,
    dataPrivacyFrameworkMentioned: true,
    cookiePolicyMentioned: true,
  },
  terms: {
    hasCGU: false,
    hasCGV: false,
  },
};
