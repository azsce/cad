/**
 * ResistorValue component - renders the editable resistance value
 */

import { memo } from "react";
import { TextField, Tooltip } from "@mui/material";
import { formatValue } from "../../../../utils/formatValue";
import { ValueContainer, EditableValueBox } from "./styles";

interface ResistorValueProps {
  value: number;
  isEditing: boolean;
  editValue: string;
  onEditStart: () => void;
  onEditValueChange: (value: string) => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const ResistorValue = memo(
  ({ value, isEditing, editValue, onEditStart, onEditValueChange, onBlur, onKeyDown }: ResistorValueProps) => {
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
          <Tooltip title="Click to edit resistance">
            <EditableValueBox onClick={onEditStart}>{formatValue(value, "Ω")}</EditableValueBox>
          </Tooltip>
        )}
      </ValueContainer>
    );
  }
);

ResistorValue.displayName = "ResistorValue";
