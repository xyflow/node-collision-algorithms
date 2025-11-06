export HOME=/vercel
export CARGO_HOME="$HOME/.cargo"
export RUSTUP_HOME="$HOME/.rustup"
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
  | sh -s -- -y --profile minimal --default-toolchain stable --no-modify-path
export PATH="$CARGO_HOME/bin:$PATH"
rustup target add wasm32-unknown-unknown
pnpm install