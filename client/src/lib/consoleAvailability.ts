export type ConsoleName = "PS4" | "PS5";
export type LicenseName = "primaria" | "secundaria";

/**
 * O jogo é vendido pra esse console? Olha o campo "plataforma" cadastrado: "PS5" só serve pra
 * PS5, "PS4" só pra PS4, "PS4/PS5" (ou vazio) serve pros dois.
 */
export function platformSupportsConsole(platform: string | null | undefined, consoleName: ConsoleName): boolean {
  const p = (platform || "").toUpperCase();
  const has4 = p.includes("PS4");
  const has5 = p.includes("PS5");
  if (!has4 && !has5) return true;
  return consoleName === "PS4" ? has4 : has5;
}

/**
 * Esse console deve aparecer como indisponível pra esse tipo de licença?
 * - Plataforma do jogo não inclui o console: indisponível (jogo só de PS5 não vende pra PS4).
 * - Secundária: vale pra qualquer console do jogo, então só depende do estoque de secundária —
 *   nunca do estoque de primária de cada console (era isso que deixava PS4 e PS5 "sem estoque"
 *   num jogo que só tinha conta secundária cadastrada).
 * - Primária: depende do estoque daquele console.
 * `undefined` no campo de estoque = ainda sem nenhuma conta cadastrada, não trava.
 */
export function isConsoleUnavailable(
  product: any,
  consoleName: ConsoleName,
  accountType: LicenseName,
  platform?: string | null
): boolean {
  if (!platformSupportsConsole(platform ?? product?.platform, consoleName)) return true;
  if (accountType === "secundaria") return product?.secundariaAvailable === false;
  return consoleName === "PS4"
    ? product?.ps4PrimariaAvailable === false
    : product?.ps5PrimariaAvailable === false;
}

/** Nenhum console do jogo tem vaga nesse tipo de licença. */
export function isLicenseUnavailable(product: any, accountType: LicenseName, platform?: string | null): boolean {
  return (["PS4", "PS5"] as ConsoleName[]).every((c) => isConsoleUnavailable(product, c, accountType, platform));
}
