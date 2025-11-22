/**
 * Styled components for CurrentSourceNode
 */

import { Box, styled } from "@mui/material";

export const NodeWrapper = styled(Box)({
  position: "relative",
});

export const RotatedContent = styled(Box, {
  shouldForwardProp: prop => prop !== "rotation" && prop !== "selected",
})<{ rotation: number; selected: boolean }>(({ rotation, selected, theme }) => ({
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
}));

export const ValueContainer = styled(Box)({
  position: "absolute",
  right: -8,
  top: "50%",
  transform: "translateY(-50%) rotate(-90deg)",
  transformOrigin: "center",
  fontSize: 10,
  fontWeight: "bold",
  whiteSpace: "nowrap",
});

export const EditableValue = styled("span")(({ theme }) => ({
  cursor: "pointer",
  padding: "1px 4px",
  borderRadius: theme.spacing(0.5),
  backgroundColor: theme.palette.action.hover,
  "&:hover": {
    backgroundColor: theme.palette.action.selected,
  },
}));
