#!/bin/bash

# 1. Run the official installer
echo "📦 Starting Bun installation..."
curl -fsSL https://bun.sh/install | bash

# 2. Define environment variables
BUN_INSTALL="$HOME/.bun"

# 3. Define shell configuration files and their respective bun configurations
declare -A SHELL_CONFIGS=(
  ["$HOME/.zshrc"]="\n# bun\nexport BUN_INSTALL=\"$HOME/.bun\"\nexport PATH=\"$BUN_INSTALL/bin:\$PATH\""
  ["$HOME/.bashrc"]="\n# bun\nexport BUN_INSTALL=\"$HOME/.bun\"\nexport PATH=\"$BUN_INSTALL/bin:\$PATH\""
  ["$HOME/.bash_profile"]="\n# bun\nexport BUN_INSTALL=\"$HOME/.bun\"\nexport PATH=\"$BUN_INSTALL/bin:\$PATH\""
  ["$HOME/.profile"]="\n# bun\nexport BUN_INSTALL=\"$HOME/.bun\"\nexport PATH=\"$BUN_INSTALL/bin:\$PATH\""
  ["$HOME/.config/fish/config.fish"]="\n# bun\nset -gx BUN_INSTALL \"$HOME/.bun\"\nset -gx PATH \"$BUN_INSTALL/bin\" \$PATH"
)

# 4. Add bun configuration to all existing shell config files
echo "🔧 Adding Bun to your shell profiles..."

for config_file in "${!SHELL_CONFIGS[@]}"; do
  if [ -f "$config_file" ]; then
    if ! grep -q "BUN_INSTALL" "$config_file"; then
      echo "  Adding to $(basename "$config_file")..."
      echo -e "${SHELL_CONFIGS[$config_file]}" >> "$config_file"
    else
      echo "  Bun configuration already exists in $(basename "$config_file")."
    fi
  else
    echo "  $(basename "$config_file") not found, skipping..."
  fi
done

# 5. Create .profile if it doesn't exist (fallback for minimal systems)
if [ ! -f "$HOME/.profile" ]; then
  echo "  Creating $HOME/.profile as fallback..."
  echo -e "${SHELL_CONFIGS["$HOME/.profile"]}" > "$HOME/.profile"
fi

# 6. Export PATH for current session
export PATH="$BUN_INSTALL/bin:$PATH"

echo "✅ Bun configuration added to all available shell profiles."

# 7. Verify installation
echo "\n🔍 Verifying installation..."
if command -v bun >/dev/null 2>&1; then
  echo "✅ Bun is now available in PATH: $(which bun)"
  echo "📋 Bun version: $(bun --version)"
else
  echo "⚠️  Bun not found in current PATH. Please restart your terminal or run:"
  echo "    export PATH=\"$BUN_INSTALL/bin:\$PATH\""
fi

# 8. Provide final instructions
echo "\n🎉 Bun installation complete!"
echo "To get started:"
echo "  1. Restart your terminal, or"
echo "  2. Run: source ~/.profile (or your shell's config file)"
echo "  3. Test with: bun --help"