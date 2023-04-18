import { TFile } from "obsidian";
import { smartEquals, smartIncludes, smartStartsWith } from "./utils/strings";
import { minBy } from "./utils/collection-helper";
import { LANGUAGES, layouts } from "./utils/layouts";

type MatchType =
  | "not found"
  | "name"
  | "prefix-name"
  | "word-perfect"
  | "directory"
  | "header"
  | "link"
  | "tag";

export interface SuggestionItem {
  file: TFile;
  tags: string[];
  aliases: string[];
  headers: string[];
  links: string[];
  frontMatter?: { [key: string]: string | number };
  matchResults: MatchQueryResult[];
  phantom: boolean;
  starred: boolean;
  tokens: string[];
  order?: number;
}

interface MatchQueryResult {
  type: MatchType;
  alias?: string;
  query: string;
  meta?: string[];
}

function translateText(text: string, layout: keyof LANGUAGES) {
  const symbols = layouts[layout];
  return text
    .split("")
    .map((char) => symbols[char.toLowerCase()] || char)
    .join("");
}

function matchQuery(
  item: SuggestionItem,
  query: string,
  options: {
    searchByTags: boolean;
    searchByHeaders: boolean;
    searchByLinks: boolean;
    isNormalizeAccentsDiacritics: boolean;
  }
): MatchQueryResult[] {
  const {
    searchByTags,
    searchByHeaders,
    searchByLinks,
    isNormalizeAccentsDiacritics,
  } = options;

  // tag
  if (searchByTags && query.startsWith("#")) {
    const tags = item.tags.filter((tag) =>
      smartIncludes(tag.slice(1), query.slice(1), isNormalizeAccentsDiacritics)
    );
    return [
      {
        type: tags.length > 0 ? "tag" : "not found",
        meta: tags,
        query,
      },
    ];
  }

  const qs = query.split("/");
  const file = qs.pop()!;
  const dirs = qs;
  const includeDir = dirs.every((dir) =>
    smartIncludes(item.file.parent.path, dir, isNormalizeAccentsDiacritics)
  );
  if (!includeDir) {
    return [{ type: "not found", query }];
  }

  let results: MatchQueryResult[] = [];

  if (
    item.tokens.some((t) => smartEquals(t, file, isNormalizeAccentsDiacritics))
  ) {
    results.push({ type: "word-perfect", meta: [item.file.name], query });
  }

  if (smartStartsWith(item.file.name, file, isNormalizeAccentsDiacritics)) {
    results.push({ type: "prefix-name", meta: [item.file.name], query });
  }
  const prefixNameMatchedAliases = item.aliases.filter((x) =>
    smartStartsWith(x, file, isNormalizeAccentsDiacritics)
  );
  if (prefixNameMatchedAliases.length > 0) {
    results.push({
      type: "prefix-name",
      meta: prefixNameMatchedAliases,
      alias: minBy(prefixNameMatchedAliases, (x) => x.length),
      query,
    });
  }

  if (smartIncludes(item.file.name, file, isNormalizeAccentsDiacritics)) {
    results.push({ type: "name", meta: [item.file.name], query });
  }
  const nameMatchedAliases = item.aliases.filter((x) =>
    smartIncludes(x, file, isNormalizeAccentsDiacritics)
  );
  if (nameMatchedAliases.length > 0) {
    results.push({
      type: "name",
      meta: nameMatchedAliases,
      alias: minBy(nameMatchedAliases, (x) => x.length),
      query,
    });
  }

  if (
    smartIncludes(item.file.parent.path, query, isNormalizeAccentsDiacritics)
  ) {
    results.push({ type: "directory", meta: [item.file.path], query });
  }

  if (searchByHeaders) {
    const headers = item.headers.filter((header) =>
      smartIncludes(header, query, isNormalizeAccentsDiacritics)
    );
    if (headers.length > 0) {
      results.push({
        type: "header",
        meta: headers,
        query,
      });
    }
  }

  if (searchByLinks) {
    const links = item.links.filter((link) =>
      smartIncludes(link, query, isNormalizeAccentsDiacritics)
    );
    if (links.length > 0) {
      results.push({
        type: "link",
        meta: links,
        query,
      });
    }
  }

  if (searchByTags) {
    const tags = item.tags.filter((tag) =>
      smartIncludes(tag.slice(1), query, isNormalizeAccentsDiacritics)
    );
    if (tags.length > 0) {
      results.push({
        type: "tag",
        meta: tags,
        query,
      });
    }
  }

  return results.length === 0 ? [{ type: "not found", query }] : results;
}

function matchQueryAll(
  item: SuggestionItem,
  queries: string[],
  options: {
    searchByTags: boolean;
    searchByHeaders: boolean;
    searchByLinks: boolean;
    isNormalizeAccentsDiacritics: boolean;
  }
): MatchQueryResult[] {
  return queries.flatMap((q) => {
    const [query, negative] = q.startsWith("-")
      ? [q.slice(1), true]
      : [q, false];

    const ukrainianLayout = translateText(query, "UKRAINIAN");
    const polishLayout = translateText(query, "POLISH");
    const germanLayout = translateText(query, "GERMAN");
    const romanianLayout = translateText(query, "ROMANIAN");
    const russianLayout = translateText(query, "RUSSIAN");
    const frenchLayout = translateText(query, "FRENCH");
    const turkishLayout = translateText(query, "TURKISH");
    const portugueseLayout = translateText(query, "PORTUGUESE");
    const spanishLayout = translateText(query, "SPANISH");
    const italianLayout = translateText(query, "ITALIAN");

    const matchedLayouts = [
      ukrainianLayout,
      polishLayout,
      germanLayout,
      romanianLayout,
      frenchLayout,
      russianLayout,
      turkishLayout,
      portugueseLayout,
      spanishLayout,
      italianLayout,
    ].map((languageLayout) => {
      const matched = matchQuery(item, languageLayout, options);
      return matched;
    });

    if (matchedLayouts.every((matched) => matched[0]?.type === "not found")) {
      return negative ? [] : matchedLayouts.flat();
    } else {
      return negative
        ? [{ type: "not found", query }]
        : matchedLayouts.flat().filter((x) => x.type !== "not found");
    }
  });
}

export function stampMatchResults(
  item: SuggestionItem,
  queries: string[],
  options: {
    searchByTags: boolean;
    searchByHeaders: boolean;
    searchByLinks: boolean;
    isNormalizeAccentsDiacritics: boolean;
  }
): SuggestionItem {
  return {
    ...item,
    matchResults: matchQueryAll(item, queries, options),
  };
}
