// Shared table for the amount-type maths. accounting-api/test/calc-cases.ts
// holds an identical copy, so the browser preview and the server are tested
// against the same inputs and must agree. Change both together.
export interface CalcCase {
  name: string
  type: string
  inputs: unknown
  // A number = the saved amount; a string = the exact error message.
  expected: number | string
}

export const CALC_CASES: CalcCase[] = [
  // FIXED
  { name: 'fixed passes the number through', type: 'FIXED', inputs: [250], expected: 250 },
  { name: 'fixed rounds to whole cents', type: 'FIXED', inputs: [10.456], expected: 10.46 },
  { name: 'fixed rejects two numbers', type: 'FIXED', inputs: [1, 2], expected: 'A fixed amount has one number.' },

  // SUM
  { name: 'sum of three', type: 'SUM', inputs: [580, 200, 988], expected: 1768 },
  { name: 'sum has no float drift', type: 'SUM', inputs: [0.1, 0.2], expected: 0.3 },
  { name: 'sum allows a negative number (a discount)', type: 'SUM', inputs: [1000, -150.5], expected: 849.5 },
  { name: 'sum with six numbers', type: 'SUM', inputs: [1, 2, 3, 4, 5, 6], expected: 21 },
  { name: 'sum with ten numbers', type: 'SUM', inputs: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], expected: 10 },
  { name: 'sum with eleven numbers', type: 'SUM', inputs: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], expected: 'Use at most 10 numbers.' },
  { name: 'sum with one number', type: 'SUM', inputs: [5], expected: 'Enter at least two numbers.' },
  { name: 'sum that cancels out', type: 'SUM', inputs: [5, -5], expected: 'The amount must be more than 0.' },

  // MULTIPLY
  { name: 'quantity x unit price', type: 'MULTIPLY', inputs: [1000, 5], expected: 5000 },
  { name: 'multiply decimals', type: 'MULTIPLY', inputs: [2.5, 3.33], expected: 8.33 },
  { name: 'multiply rounds to whole cents', type: 'MULTIPLY', inputs: [0.1, 0.3], expected: 0.03 },
  { name: 'multiply by zero', type: 'MULTIPLY', inputs: [0, 50], expected: 'The amount must be more than 0.' },
  { name: 'multiply a negative', type: 'MULTIPLY', inputs: [-3, 4], expected: 'The amount must be more than 0.' },
  { name: 'multiply with one box', type: 'MULTIPLY', inputs: [3], expected: 'Fill in both boxes.' },
  { name: 'multiply with three boxes', type: 'MULTIPLY', inputs: [3, 4, 5], expected: 'Fill in both boxes.' },
  { name: 'multiply that is too big', type: 'MULTIPLY', inputs: [1_000_000_000, 1_000_000_000], expected: 'The amount is too big.' },
  { name: 'multiply that rounds to nothing', type: 'MULTIPLY', inputs: [0.001, 1], expected: 'The amount must be more than 0.' },

  // RATE_MONTHS
  { name: 'monthly rate x months', type: 'RATE_MONTHS', inputs: [7500, 5], expected: 37500 },
  { name: 'part of a month', type: 'RATE_MONTHS', inputs: [1000, 2.5], expected: 2500 },

  // SPLIT
  { name: 'total divided by people', type: 'SPLIT', inputs: [9000, 3], expected: 3000 },
  { name: 'split rounds to whole cents', type: 'SPLIT', inputs: [100, 3], expected: 33.33 },
  { name: 'split rounds up', type: 'SPLIT', inputs: [200, 3], expected: 66.67 },
  { name: 'split by zero people', type: 'SPLIT', inputs: [9000, 0], expected: "Number of people can't be 0." },
  { name: 'split zero', type: 'SPLIT', inputs: [0, 4], expected: 'The amount must be more than 0.' },

  // PERCENT
  { name: 'percent of a number', type: 'PERCENT', inputs: [5, 20000], expected: 1000 },
  { name: 'percent with decimals', type: 'PERCENT', inputs: [12.5, 250], expected: 31.25 },
  { name: 'percent of zero', type: 'PERCENT', inputs: [10, 0], expected: 'The amount must be more than 0.' },
  { name: 'zero percent', type: 'PERCENT', inputs: [0, 500], expected: 'The amount must be more than 0.' },
  { name: 'percent over 100', type: 'PERCENT', inputs: [150, 200], expected: 300 },

  // AVERAGE
  { name: 'average of three', type: 'AVERAGE', inputs: [250, 500, 300], expected: 350 },
  { name: 'average rounds to whole cents', type: 'AVERAGE', inputs: [1, 1, 2], expected: 1.33 },
  { name: 'average with six numbers', type: 'AVERAGE', inputs: [10, 20, 30, 40, 50, 60], expected: 35 },
  { name: 'average with ten numbers', type: 'AVERAGE', inputs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], expected: 5.5 },
  { name: 'average with one number', type: 'AVERAGE', inputs: [7], expected: 'Enter at least two numbers.' },

  // Bad input
  { name: 'unknown type', type: 'POWER', inputs: [2, 3], expected: 'Unknown amount type.' },
  { name: 'empty list', type: 'SUM', inputs: [], expected: 'Fill in the boxes to calculate the amount.' },
  { name: 'not a list', type: 'SUM', inputs: '1+2', expected: 'Fill in the boxes to calculate the amount.' },
  { name: 'NaN', type: 'MULTIPLY', inputs: [Number.NaN, 2], expected: 'Every box must be a number.' },
  { name: 'Infinity', type: 'MULTIPLY', inputs: [Number.POSITIVE_INFINITY, 2], expected: 'Every box must be a number.' },
  { name: 'a string number', type: 'MULTIPLY', inputs: ['5', 2], expected: 'Every box must be a number.' },
  { name: 'null', type: 'MULTIPLY', inputs: [null, 2], expected: 'Every box must be a number.' },
  { name: 'a number just over the limit', type: 'SUM', inputs: [1_000_000_001, 1], expected: 'One of the numbers is too big.' },
  { name: 'a number at the limit', type: 'SUM', inputs: [1_000_000_000, 1], expected: 1_000_000_001 },
  { name: 'a negative number past the limit', type: 'SUM', inputs: [-1_000_000_001, 5], expected: 'One of the numbers is too big.' },
]
