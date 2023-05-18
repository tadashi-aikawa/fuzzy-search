import { AnotherQuickSwitcherModal } from "./ui/AnotherQuickSwitcherModal";
import { App, Command, Notice, Platform } from "obsidian";
import { SearchCommand, Settings } from "./settings";
import { MoveModal } from "./ui/MoveModal";
import { HeaderModal } from "./ui/HeaderModal";
import { GrepModal } from "./ui/GrepModal";
import { existsRg } from "./utils/ripgrep";

const SEARCH_COMMAND_PREFIX = "search-command";

export function showSearchDialog(
  app: App,
  settings: Settings,
  command: SearchCommand
) {
  const modal = new AnotherQuickSwitcherModal({
    app,
    settings,
    command,
    originFile: app.workspace.getActiveFile(),
    inputQuery: "",
    navigationHistories: [],
    currentNavigationHistoryIndex: 0,
    stackHistory: true,
  });
  modal.open();
}

export function showMoveDialog(app: App, settings: Settings) {
  if (!app.workspace.getActiveFile()) {
    return;
  }

  const modal = new MoveModal(app, settings);
  modal.open();
}

export async function showGrepDialog(app: App, settings: Settings) {
  if (!Platform.isDesktop) {
    // noinspection ObjectAllocationIgnored
    new Notice("Grep is not supported on mobile.");
    return;
  }

  if (!(await existsRg(settings.ripgrepCommand))) {
    // noinspection ObjectAllocationIgnored
    new Notice(
      `"${settings.ripgrepCommand}" was not working as a ripgrep command. If you have not installed ripgrep yet, please install it.`
    );
    return;
  }

  const modal = new GrepModal(app, settings);
  modal.open();
}

export function showHeaderDialog(
  app: App,
  settings: Settings,
  floating: boolean
) {
  if (!app.workspace.getActiveFile()) {
    return;
  }

  const modal = new HeaderModal(app, settings, floating);
  modal.open();
}

export function createCommands(app: App, settings: Settings): Command[] {
  return [
    {
      id: "header-search-in-file",
      name: "Header search in file",
      checkCallback: (checking: boolean) => {
        if (checking) {
          return Boolean(app.workspace.getActiveFile());
        }
        showHeaderDialog(app, settings, false);
      },
    },
    {
      id: "header-floating-search-in-file",
      name: "Header floating search in file",
      checkCallback: (checking: boolean) => {
        if (checking) {
          return Boolean(app.workspace.getActiveFile());
        }
        showHeaderDialog(app, settings, true);
      },
    },
    {
      id: "move",
      name: "Move file to another folder",
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "m" }],
      checkCallback: (checking: boolean) => {
        if (checking) {
          return Boolean(app.workspace.getActiveFile());
        }
        showMoveDialog(app, settings);
      },
    },
    {
      id: "grep",
      name: "Grep",
      hotkeys: [],
      checkCallback: (checking: boolean) => {
        if (checking) {
          return Platform.isDesktop;
        }

        showGrepDialog(app, settings);
      },
    },
    ...settings.searchCommands.map((command) => {
      return {
        id: `${SEARCH_COMMAND_PREFIX}_${command.name
          .replace(/ /g, "-")
          .toLowerCase()}`,
        name: command.name,
        hotkeys: [],
        callback: () => {
          showSearchDialog(app, settings, command);
        },
      };
    }),
  ];
}
