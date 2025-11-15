/**
 * UI state management using Zustand with persistence.
 * Stores user interface preferences like pane sizes.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { logger } from '../utils/logger';

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
 * UI store with localStorage persistence.
 */
export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
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
        logger.debug({ caller: 'uiStore.setPaneSizes' }, 'Setting pane sizes', { sizes });
        set({ paneSizes: sizes });
      },

      resetPaneSizes: () => {
        set({ paneSizes: DEFAULT_PANE_SIZES });
      },

      toggleLeftPanelCollapse: () => {
        set((state) => {
          const isCollapsing = !state.isLeftPanelCollapsed;
          
          logger.info(
            { caller: 'uiStore.toggleLeftPanelCollapse' },
            isCollapsing ? 'Collapsing left panel' : 'Unclasping left panel',
            {
              isCollapsing,
              currentPaneSizes: state.paneSizes,
              savedLeftPanelSize: state.savedLeftPanelSize,
            }
          );
          
          if (isCollapsing) {
            logger.debug(
              { caller: 'uiStore.toggleLeftPanelCollapse' },
              'Saving left panel size',
              { savedSize: state.paneSizes.left }
            );
            return {
              isLeftPanelCollapsed: true,
              savedLeftPanelSize: state.paneSizes.left,
            };
          }
          
          const restoredSize = state.savedLeftPanelSize ?? state.paneSizes.left;
          logger.debug(
            { caller: 'uiStore.toggleLeftPanelCollapse' },
            'Restoring left panel size',
            {
              restoredSize,
              savedLeftPanelSize: state.savedLeftPanelSize,
              currentLeft: state.paneSizes.left,
            }
          );
          return {
            isLeftPanelCollapsed: false,
            paneSizes: {
              ...state.paneSizes,
              left: restoredSize,
            },
            savedLeftPanelSize: null,
          };
        });
      },

      toggleRightPanelExpand: () => {
        set((state) => {
          const isExpanding = !state.isRightPanelExpanded;
          
          logger.info(
            { caller: 'uiStore.toggleRightPanelExpand' },
            isExpanding ? 'Expanding right panel to fullscreen' : 'Exiting fullscreen',
            {
              isExpanding,
              currentPaneSizes: state.paneSizes,
              savedPaneSizesForExpand: state.savedPaneSizesForExpand,
            }
          );
          
          if (isExpanding) {
            logger.debug(
              { caller: 'uiStore.toggleRightPanelExpand' },
              'Saving all panel sizes',
              { savedSizes: state.paneSizes }
            );
            return {
              isRightPanelExpanded: true,
              isRightPanelCollapsed: false,
              savedPaneSizesForExpand: state.paneSizes,
            };
          }
          
          const restoredSizes = state.savedPaneSizesForExpand ?? state.paneSizes;
          logger.debug(
            { caller: 'uiStore.toggleRightPanelExpand' },
            'Restoring all panel sizes',
            {
              restoredSizes,
              savedPaneSizesForExpand: state.savedPaneSizesForExpand,
            }
          );
          return {
            isRightPanelExpanded: false,
            isRightPanelCollapsed: false,
            paneSizes: restoredSizes,
            savedPaneSizesForExpand: null,
          };
        });
      },

      toggleRightPanelCollapse: () => {
        set((state) => {
          const isCollapsing = !state.isRightPanelCollapsed;
          
          logger.info(
            { caller: 'uiStore.toggleRightPanelCollapse' },
            isCollapsing ? 'Collapsing right panel' : 'Unclasping right panel',
            {
              isCollapsing,
              currentPaneSizes: state.paneSizes,
              savedRightPanelSize: state.savedRightPanelSize,
            }
          );
          
          if (isCollapsing) {
            logger.debug(
              { caller: 'uiStore.toggleRightPanelCollapse' },
              'Saving right panel size',
              { savedSize: state.paneSizes.right }
            );
            return {
              isRightPanelCollapsed: true,
              isRightPanelExpanded: false,
              savedRightPanelSize: state.paneSizes.right,
            };
          }
          
          const restoredSize = state.savedRightPanelSize ?? state.paneSizes.right;
          logger.debug(
            { caller: 'uiStore.toggleRightPanelCollapse' },
            'Restoring right panel size',
            {
              restoredSize,
              savedRightPanelSize: state.savedRightPanelSize,
              currentRight: state.paneSizes.right,
            }
          );
          return {
            isRightPanelCollapsed: false,
            isRightPanelExpanded: false,
            paneSizes: {
              ...state.paneSizes,
              right: restoredSize,
            },
            savedRightPanelSize: null,
          };
        });
      },
    }),
    {
      name: 'circuit-ui-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
