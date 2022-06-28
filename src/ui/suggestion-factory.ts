import { SuggestionItem } from "../matcher";
import { count, uniq, uniqFlatMap } from "../utils/collection-helper";
import { ALIAS, FOLDER, HEADER, LINK, TAG } from "./icons";

interface Elements {
  itemDiv: HTMLDivElement;
  descriptionDiv?: HTMLDivElement;
}

interface Options {
  showDirectory: boolean;
  showFullPathOfDirectory: boolean;
  showAliasesOnTop: boolean;
  hideGutterIcons: boolean;
}

function createItemDiv(
  item: SuggestionItem,
  aliases: string[],
  options: Options
): Elements["itemDiv"] {
  const itemDiv = createDiv({
    cls: [
      "another-quick-switcher__item",
      item.phantom ? "another-quick-switcher__phantom_item" : "",
      item.starred ? "another-quick-switcher__starred_item" : "",
      options.hideGutterIcons ? "another-quick-switcher__gutter_hidden" : "",
    ],
  });

  const entryDiv = createDiv({
    cls: "another-quick-switcher__item__entry",
  });

  const titleDiv = createDiv({
    cls: "another-quick-switcher__item__title",
    text:
      options.showAliasesOnTop && aliases.length > 0
        ? aliases.join(" / ")
        : item.file.basename,
  });
  entryDiv.appendChild(titleDiv);

  if (item.order! < 9) {
    const hotKeyGuide = createSpan({
      cls: "another-quick-switcher__item__hot-key-guide",
      text: `${item.order! + 1}`,
    });
    entryDiv.appendChild(hotKeyGuide);
  }

  if (options.showDirectory) {
    const directoryDiv = createDiv({
      cls: "another-quick-switcher__item__directory",
    });
    directoryDiv.insertAdjacentHTML("beforeend", FOLDER);
    const text = options.showFullPathOfDirectory
      ? item.file.parent.path
      : item.file.parent.name;
    directoryDiv.appendText(` ${text}`);
    entryDiv.appendChild(directoryDiv);
  }

  itemDiv.appendChild(entryDiv);

  return itemDiv;
}

function createDescriptionDiv(
  item: SuggestionItem,
  aliases: string[],
  tags: string[],
  links: string[],
  countByHeader: { [header: string]: number },
  headerResultsNum: number,
  options: Options
): Elements["descriptionDiv"] {
  const descriptionDiv = createDiv({
    cls: "another-quick-switcher__item__descriptions",
  });

  if (aliases.length > 0) {
    const aliasDiv = createDiv({
      cls: "another-quick-switcher__item__description",
    });

    const displayAliases = options.showAliasesOnTop
      ? [item.file.basename]
      : aliases;
    displayAliases.forEach((x) => {
      const aliasSpan = createSpan({
        cls: "another-quick-switcher__item__description__alias",
      });
      aliasSpan.insertAdjacentHTML("beforeend", ALIAS);
      aliasSpan.appendText(x);
      aliasDiv.appendChild(aliasSpan);
    });
    descriptionDiv.appendChild(aliasDiv);
  }

  if (tags.length > 0) {
    const tagsDiv = createDiv({
      cls: "another-quick-switcher__item__description",
    });
    tags.forEach((x) => {
      const tagsSpan = createSpan({
        cls: "another-quick-switcher__item__description__tag",
      });
      tagsSpan.insertAdjacentHTML("beforeend", TAG);
      tagsSpan.appendText(x.replace("#", ""));
      tagsDiv.appendChild(tagsSpan);
    });
    descriptionDiv.appendChild(tagsDiv);
  }

  if (links.length > 0) {
    const linksDiv = createDiv({
      cls: "another-quick-switcher__item__description",
    });
    links.forEach((x) => {
      const linksSpan = createSpan({
        cls: "another-quick-switcher__item__description__link",
      });
      linksSpan.insertAdjacentHTML("beforeend", LINK);
      linksSpan.appendChild(
        createSpan({ text: x, attr: { style: "padding-left: 3px" } })
      );
      linksDiv.appendChild(linksSpan);
    });
    descriptionDiv.appendChild(linksDiv);
  }

  if (Object.keys(countByHeader).length > 0) {
    const headersDiv = createDiv({
      cls: "another-quick-switcher__item__description",
    });

    Object.entries(countByHeader)
      .map(([header, n]) => ({ header, n }))
      .sort((a, b) => b.n - a.n)
      .forEach(({ header, n }) => {
        const headersSpan = createSpan({
          cls: [
            "another-quick-switcher__item__description__header",
            n !== headerResultsNum
              ? "another-quick-switcher__item__description__header__dimmed"
              : "",
          ],
        });
        headersSpan.insertAdjacentHTML("beforeend", HEADER);
        headersSpan.appendChild(
          createSpan({ text: header, attr: { style: "padding-left: 3px" } })
        );
        headersDiv.appendChild(headersSpan);
      });
    descriptionDiv.appendChild(headersDiv);
  }

  return descriptionDiv;
}

export function createElements(
  item: SuggestionItem,
  options: Options
): Elements {
  const aliases = uniqFlatMap(
    item.matchResults.filter((res) => res.alias),
    (x) => x.meta ?? []
  );
  const tags = uniqFlatMap(
    item.matchResults.filter((res) => res.type === "tag"),
    (x) => x.meta ?? []
  );
  const links = uniqFlatMap(
    item.matchResults.filter((res) => res.type === "link"),
    (x) => x.meta ?? []
  );

  const headerResults = item.matchResults.filter(
    (res) => res.type === "header"
  );
  const headerResultsNum = headerResults.length;
  const countByHeader = count(
    headerResults.flatMap((xs) => uniq(xs.meta ?? []))
  );

  const itemDiv = createItemDiv(item, aliases, options);

  if (
    aliases.length === 0 &&
    tags.length === 0 &&
    links.length === 0 &&
    countByHeader === {}
  ) {
    return { itemDiv };
  }
  const descriptionDiv = createDescriptionDiv(
    item,
    aliases,
    tags,
    links,
    countByHeader,
    headerResultsNum,
    options
  );

  return {
    itemDiv,
    descriptionDiv,
  };
}
