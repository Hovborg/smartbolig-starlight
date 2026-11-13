// Errors that end the model work for this run instead of trying the next model.

// A ceiling was reached: calls per run, neurons per run, or the daily budget.
export class CallBudgetExceeded extends Error {}

// The relay's daily spending ceiling is used up; nothing more can run today.
export class DailyBudgetExhausted extends CallBudgetExceeded {}
