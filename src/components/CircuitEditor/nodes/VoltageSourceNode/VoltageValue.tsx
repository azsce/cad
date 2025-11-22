/**
 * VoltageValue component - renders the editable voltage value
 */

import { memo } from "react";
import { TextField, Tooltip } from "@mui/material";
import { formatValue } from "../../../../utils/formatValue";
import { ValueDisplayBox, EditableValueBox } from "./styles";

interface VoltageValueProps {
  value: number;
  isEditing: boolean;
  editValue: string;
  onEditStart: () => void;
  onEditValueChange: (value: string) => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const VoltageValue = memo(
  ({ value, isEditing, editValue, onEditStart, onEditValueChange, onBlur, onKeyDown }: VoltageValueProps) => {
    return (
      <ValueDisplayBox>
        {isEditing ? (
          <TextField
            value={editValue}
            onChange={e => {
              onEditValueChange(e.target.value);
            }}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            autoFocus
            size="small"
            sx={{
              width: 50,
              "& .MuiInputBase-input": {
                fontSize: 10,
                textAlign: "center",
                padding: "1px 2px",
              },
            }}
          />
        ) : (
          <Tooltip title="Click to edit voltage">
            <EditableValueBox onClick={onEditStart}>{formatValue(value, "V")}</EditableValueBox>
          </Tooltip>
        )}
      </ValueDisplayBox>
    );
  }
);

VoltageValue.displayName = "VoltageValue";
