export class BattleFormula {
  static damage({ baseDamage, emotionMultiplier = 1, defenseMultiplier = 1, statusMultiplier = 1 }) {
    return Math.max(0, Math.round(baseDamage * emotionMultiplier * defenseMultiplier * statusMultiplier));
  }
}
