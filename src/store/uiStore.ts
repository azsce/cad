/**
 * UI state management using Zustand with persistence.
 * Stores user interface preferences like pane sizes.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { logger } from "../utils/logger";

/**
 * Pane size configuration for the three-pane layout.
 */
interface PaneSizes {
  /** Left pane (Circuit Manager) size as percentage */
  left: number;
  /** Center pane (Circuit Editor) size as percentage */
  center: number;
  /** Right pane (Analysis) size as percentage */
  right: number;
}

/**
 * The Zustand store interface for UI state management.
 */
interface UIStore {
  // State
  /** Current pane sizes */
  paneSizes: PaneSizes;
  /** Saved pane sizes before expanding right panel */
  savedPaneSizesForExpand: PaneSizes | null;
  /** Saved left panel size before collapsing */
  savedLeftPanelSize: number | null;
  /** Saved right panel size before collapsing */
  savedRightPanelSize: number | null;
  /** Left panel collapsed state */
  isLeftPanelCollapsed: boolean;
  /** Right panel expanded state (hides other panels) */
  isRightPanelExpanded: boolean;
  /** Right panel collapsed state */
  isRightPanelCollapsed: boolean;

  // Actions
  /** Update pane sizes */
  setPaneSizes: (sizes: PaneSizes) => void;
  /** Reset pane sizes to defaults */
  resetPaneSizes: () => void;
  /** Toggle left panel collapse state */
  toggleLeftPanelCollapse: () => void;
  /** Toggle right panel expand state */
  toggleRightPanelExpand: () => void;
  /** Toggle right panel collapse state */
  toggleRightPanelCollapse: () => void;
}

/**
 * Default pane sizes matching the original layout.
 */
const DEFAULT_PANE_SIZES: PaneSizes = {
  left: 20,
  center: 50,
  right: 30,
};

/**
 * Validates that panel sizes add up to approximately 100%.
 */
function validatePaneSizes(sizes: PaneSizes): boolean {
  const total = sizes.left + sizes.center + sizes.right;
  return Math.abs(total - 100) < 0.1; // Allow small floating point errors
}

/**
 * 🔄 Helper for collapsing a single panel
 */
function createCollapseState(panelKey: "left" | "right", currentSize: number) {
  const isLeft = panelKey === "left";
  return {
    ...(isLeft ? { isLeftPanelCollapsed: true } : { isRightPanelCollapsed: true, isRightPanelExpanded: false }),
    ...(isLeft ? { savedLeftPanelSize: currentSize } : { savedRightPanelSize: currentSize }),
  };
}

/**
 * 🔄 Helper for expanding a collapsed panel
 */
function createExpandedState(panelKey: "left" | "right", restoredSize: number, currentPaneSizes: PaneSizes) {
  const isLeft = panelKey === "left";
  return {
    ...(isLeft ? { isLeftPanelCollapsed: false } : { isRightPanelCollapsed: false, isRightPanelExpanded: false }),
    paneSizes: {
      ...currentPaneSizes,
      [panelKey]: restoredSize,
    },
    ...(isLeft ? { savedLeftPanelSize: null } : { savedRightPanelSize: null }),
  };
}

/**
 * 🔄 Generic panel collapse toggle handler
 */
function handlePanelCollapseToggle(state: UIStore, panelKey: "left" | "right", caller: string): Partial<UIStore> {
  const isLeft = panelKey === "left";
  const isCollapsed = isLeft ? state.isLeftPanelCollapsed : state.isRightPanelCollapsed;
  const savedSize = isLeft ? state.savedLeftPanelSize : state.savedRightPanelSize;
  const currentSize = state.paneSizes[panelKey];
  const isCollapsing = !isCollapsed;

  logger.info({ caller }, isCollapsing ? `Collapsing ${panelKey} panel` : `Expanding ${panelKey} panel`, {
    isCollapsing,
    currentPaneSizes: state.paneSizes,
    savedSize,
  });

  if (isCollapsing) {
    logger.debug({ caller }, `Saving ${panelKey} panel size`, { savedSize: currentSize });
    return createCollapseState(panelKey, currentSize);
  }

  const restoredSize = savedSize ?? currentSize;
  logger.debug({ caller }, `Restoring ${panelKey} panel size`, {
    restoredSize,
    savedSize,
    currentSize,
  });
  return createExpandedState(panelKey, restoredSize, state.paneSizes);
}

/**
 * UI store with localStorage persistence.
 */
export const useUIStore = create<UIStore>()(
  persist(
    set => ({
      // Initial state
      paneSizes: DEFAULT_PANE_SIZES,
      savedPaneSizesForExpand: null,
      savedLeftPanelSize: null,
      savedRightPanelSize: null,
      isLeftPanelCollapsed: false,
      isRightPanelExpanded: false,
      isRightPanelCollapsed: false,

      // Actions
      setPaneSizes: (sizes: PaneSizes) => {
        // Validate that sizes add up to approximately 100%
        const total = sizes.left + sizes.center + sizes.right;
        const isValid = Math.abs(total - 100) < 0.1; // Allow small floating point errors

        if (!isValid) {
          logger.warn({ caller: "uiStore.setPaneSizes" }, "Invalid panel sizes (not 100%), skipping", {
            sizes,
            total,
          });
          return;
        }

        logger.debug({ caller: "uiStore.setPaneSizes" }, "Setting pane sizes", { sizes });
        set({ paneSizes: sizes });
      },

      resetPaneSizes: () => {
        logger.info({ caller: "uiStore.resetPaneSizes" }, "Resetting pane sizes to defaults", {
          defaults: DEFAULT_PANE_SIZES,
        });
        set({
          paneSizes: DEFAULT_PANE_SIZES,
          savedPaneSizesForExpand: null,
          savedLeftPanelSize: null,
          savedRightPanelSize: null,
          isLeftPanelCollapsed: false,
          isRightPanelExpanded: false,
          isRightPanelCollapsed: false,
        });
      },

      toggleLeftPanelCollapse: () => {
        set(state => handlePanelCollapseToggle(state, "left", "uiStore.toggleLeftPanelCollapse"));
      },

      toggleRightPanelExpand: () => {
        set(state => {
          const isExpanding = !state.isRightPanelExpanded;

          logger.info(
            { caller: "uiStore.toggleRightPanelExpand" },
            isExpanding ? "Expanding right panel to fullscreen" : "Exiting fullscreen",
            {
              isExpanding,
              currentPaneSizes: state.paneSizes,
              savedPaneSizesForExpand: state.savedPaneSizesForExpand,
            }
          );

          if (isExpanding) {
            logger.debug({ caller: "uiStore.toggleRightPanelExpand" }, "Saving all panel sizes", {
              savedSizes: state.paneSizes,
            });
            return {
              isRightPanelExpanded: true,
              isRightPanelCollapsed: false,
              savedPaneSizesForExpand: state.paneSizes,
            };
          }

          const restoredSizes = state.savedPaneSizesForExpand ?? state.paneSizes;
          logger.debug({ caller: "uiStore.toggleRightPanelExpand" }, "Restoring all panel sizes", {
            restoredSizes,
            savedPaneSizesForExpand: state.savedPaneSizesForExpand,
          });
          return {
            isRightPanelExpanded: false,
            isRightPanelCollapsed: false,
            paneSizes: restoredSizes,
            savedPaneSizesForExpand: null,
          };
        });
      },

      toggleRightPanelCollapse: () => {
        set(state => handlePanelCollapseToggle(state, "right", "uiStore.toggleRightPanelCollapse"));
      },
    }),
    {
      name: "circuit-ui-storage",
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<UIStore>;

        // Validate persisted panel sizes
        if (persisted.paneSizes && !validatePaneSizes(persisted.paneSizes)) {
          logger.warn({ caller: "uiStore.merge" }, "Invalid persisted panel sizes, using defaults", {
            persisted: persisted.paneSizes,
            defaults: DEFAULT_PANE_SIZES,
          });
          persisted.paneSizes = DEFAULT_PANE_SIZES;
        }

        // Validate saved panel sizes for expand
        if (persisted.savedPaneSizesForExpand && !validatePaneSizes(persisted.savedPaneSizesForExpand)) {
          logger.warn({ caller: "uiStore.merge" }, "Invalid saved panel sizes for expand, clearing", {
            persisted: persisted.savedPaneSizesForExpand,
          });
          persisted.savedPaneSizesForExpand = null;
        }

        return { ...currentState, ...persisted };
      },
    }
  )
);
