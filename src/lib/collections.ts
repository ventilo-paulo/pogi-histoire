export type CollectionMeta = {
  id: string;
  title: string;
  subtitle: string;
  available?: boolean;
};

/** Single source of truth for the collections shown on /collections and in search. */
export const COLLECTIONS: CollectionMeta[] = [
  { id: "wwii", title: "Seconde Guerre Mondiale", subtitle: "Fronts, résistances, mémoire" },
  { id: "antiquite", title: "Antiquité", subtitle: "Rome, Grèce, Égypte" },
  { id: "moyen-age", title: "Moyen-Âge", subtitle: "Chevalerie, féodalité, croisades" },
  { id: "ameriques", title: "Les Amériques", subtitle: "Découvertes, révolutions, cultures" },
  { id: "illustres", title: "Les illustres", subtitle: "Portraits marquants", available: true },
  { id: "afrique", title: "L'Afrique", subtitle: "Empires, décolonisation, héritages" },
];
