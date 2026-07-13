import { supabase } from "@/integrations/supabase/client";

type RealtimeChannel = ReturnType<typeof supabase.channel>;

export type CategoryLite = {
  id: string;
  name: string;
};

export type ArticleLite = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  image_url: string | null;
  category: string | null;
};

type Listener = () => void;

const categoryListeners = new Set<Listener>();
let categoriesSnapshot: CategoryLite[] = [];
let categoriesChannel: RealtimeChannel | null = null;
let categoriesLoadPromise: Promise<void> | null = null;

function notifyCategories() {
  categoryListeners.forEach((listener) => listener());
}

async function loadCategories() {
  if (categoriesLoadPromise) return categoriesLoadPromise;

  categoriesLoadPromise = supabase
    .from("categories")
    .select("id,name,sort_order")
    .order("sort_order")
    .then(({ data }) => {
      categoriesSnapshot = (data ?? []).map((category) => ({
        id: category.id,
        name: category.name,
      }));
      notifyCategories();
    })
    .finally(() => {
      categoriesLoadPromise = null;
    });

  return categoriesLoadPromise;
}

function ensureCategoriesChannel() {
  if (categoriesChannel) return;

  categoriesChannel = supabase
    .channel("cats-live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "categories" },
      () => {
        void loadCategories();
      },
    );

  categoriesChannel.subscribe();
}

export const categoriesStore = {
  getSnapshot: () => categoriesSnapshot,
  subscribe: (listener: Listener) => {
    categoryListeners.add(listener);
    void loadCategories();
    ensureCategoriesChannel();

    return () => {
      categoryListeners.delete(listener);
      if (categoryListeners.size === 0 && categoriesChannel) {
        void supabase.removeChannel(categoriesChannel);
        categoriesChannel = null;
      }
    };
  },
};

const articleListeners = new Set<Listener>();
let articlesSnapshot: ArticleLite[] | null = null;
let articlesChannel: RealtimeChannel | null = null;
let articlesLoadPromise: Promise<void> | null = null;

function notifyArticles() {
  articleListeners.forEach((listener) => listener());
}

async function loadPublishedArticles() {
  if (articlesLoadPromise) return articlesLoadPromise;

  articlesLoadPromise = supabase
    .from("articles")
    .select("id,title,slug,excerpt,image_url,category")
    .eq("published", true)
    .order("published_at", { ascending: false })
    .then(({ data }) => {
      articlesSnapshot = (data ?? []).map((article) => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        image_url: article.image_url,
        category: article.category,
      }));
      notifyArticles();
    })
    .finally(() => {
      articlesLoadPromise = null;
    });

  return articlesLoadPromise;
}

function ensureArticlesChannel() {
  if (articlesChannel) return;

  articlesChannel = supabase
    .channel("articles-live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "articles" },
      () => {
        void loadPublishedArticles();
      },
    );

  articlesChannel.subscribe();
}

export const publishedArticlesStore = {
  getSnapshot: () => articlesSnapshot,
  subscribe: (listener: Listener) => {
    articleListeners.add(listener);
    void loadPublishedArticles();
    ensureArticlesChannel();

    return () => {
      articleListeners.delete(listener);
      if (articleListeners.size === 0 && articlesChannel) {
        void supabase.removeChannel(articlesChannel);
        articlesChannel = null;
      }
    };
  },
};