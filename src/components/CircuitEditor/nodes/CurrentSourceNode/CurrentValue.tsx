/**
 * CurrentValue component - renders the editable current value
 */

import { memo } from "react";
import { TextField, Tooltip } from "@mui/material";
import { formatValue } from "../../../../utils/formatValue";
import { ValueContainer, EditableValue } from "./styles";

interface CurrentValueProps {
  value: number;
  isEditing: boolean;
  editValue: string;
  onEditStart: () => void;
  onEditValueChange: (value: string) => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const CurrentValue = memo(
  ({ value, isEditing, editValue, onEditStart, onEditValueChange, onBlur, onKeyDown }: CurrentValueProps) => {
    return (
      <ValueContainer>
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
          <Tooltip title="Click to edit current">
            <EditableValue onClick={onEditStart}>{formatValue(value, "A")}</EditableValue>
          </Tooltip>
        )}
      </ValueContainer>
    );
  }
);

CurrentValue.displayName = "CurrentValue";
