// Invoked by `anchor migrate`. The provider is injected from Anchor.toml.
import * as anchor from "@coral-xyz/anchor";

module.exports = async function (provider: anchor.AnchorProvider) {
  anchor.setProvider(provider);
  // Nothing to initialise: polls are created by users via `create_poll`.
};
