{
  description = "WuYun2";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: 
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = f:
        nixpkgs.lib.genAttrs systems (system:
          let
            pkgs = import nixpkgs { inherit system; };
          in
          f system pkgs);
    in {
      devShells = forAllSystems (_system: pkgs: {
        default = pkgs.mkShell {
          packages = [
            pkgs.nodejs_24
          ];
          shell = pkgs.zsh;
          shellHook = ''
            export SHELL=${pkgs.zsh}/bin/zsh
            export NODE_OPTIONS=--openssl-legacy-provider
            if [ -z "$ZSH_VERSION" ]; then
              if [ -z "$NIX_DEV_ZDOTDIR" ]; then
                export NIX_DEV_ZDOTDIR="$(mktemp -d)"
                cat >"$NIX_DEV_ZDOTDIR/.zshrc" <<'EOF'
if [ -f "$HOME/.zshrc" ]; then
  source "$HOME/.zshrc"
fi
case "$PROMPT" in
  "(dev)"*) ;;
  *)
    if [ -z "$PROMPT" ]; then
      PROMPT='%~ %# '
    fi
    PROMPT="(dev) $PROMPT"
    ;;
esac
EOF
              fi
              export ZDOTDIR="$NIX_DEV_ZDOTDIR"
              exec ${pkgs.zsh}/bin/zsh
            else
              case "$PROMPT" in
                "(dev)"*) ;;
                *)
                  if [ -z "$PROMPT" ]; then
                    PROMPT='%~ %# '
                  fi
                  PROMPT="(dev) $PROMPT"
                  ;;
              esac
              case "$PS1" in
                "(dev)"*) ;;
                *) PS1="(dev) ''${PS1:-\\u@\\h:\\w\\$ }" ;;
              esac
              export PROMPT PS1
            fi
          '';
        };
      });
    };
}

