/**
 * Styled components for VoltageSourceNode
 */

import { Box, styled } from "@mui/material";

export const OuterWrapper = styled(Box)<{ width: number; height: number }>(({ width, height }) => ({
  position: "relative",
  width,
  height,
}));

export const InnerRotatedBox = styled(Box)<{ rotation: number; selected?: boolean }>(
  ({ theme, rotation, selected }) => ({
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: `translate(-50%, -50%) rotate(${String(rotation)}deg)`,
    transformOrigin: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.palette.background.paper,
    border: `2px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
    borderRadius: theme.spacing(1),
    padding: theme.spacing(1),
    width: 60,
    height: 80,
    boxShadow: selected ? theme.shadows[3] : "none",
  })
);

export const ValueDisplayBox = styled(Box)({
  position: "absolute",
  right: -5,
  top: "50%",
  transform: "translateY(-50%) rotate(-90deg)",
  transformOrigin: "center",
  fontSize: 10,
  fontWeight: "bold",
  whiteSpace: "nowrap",
});

export const EditableValueBox = styled("span")(({ theme }) => ({
  cursor: "pointer",
  padding: "1px 4px",
  borderRadius: theme.spacing(0.5),
  backgroundColor: theme.palette.action.hover,
  "&:hover": {
    backgroundColor: theme.palette.action.selected,
  },
}));
