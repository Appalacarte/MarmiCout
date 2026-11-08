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
    address: "173 rue de Courcelles, 75017 Paris, France (domiciliation HelloDom)",
    siren: "132 021 098",
    siret: "132 021 098 00018",
    rcs: "", // À compléter si inscrit (ex: "RCS Paris 132 021 098"), sinon laisser vide
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
    address: "340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis",
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
