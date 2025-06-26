//ValidatePressDieCombination Story
'use server';
/**
 * @fileOverview Validates if the press-die combination is feasible based on production conditions using AI.
 *
 * - validatePressDieCombination - A function that validates the press-die combination.
 * - ValidatePressDieCombinationInput - The input type for the validatePressDieCombination function.
 * - ValidatePressDieCombinationOutput - The return type for the validatePressDieCombination function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ValidatePressDieCombinationInputSchema = z.object({
  itemCode: z.string().describe('The item code of the task.'),
  pressNo: z.number().describe('The press number selected for the task.'),
  dieNo: z.number().describe('The die number selected for the task.'),
  material: z.string().describe('The material of the task.'),
  productionConditions: z.string().describe('The production conditions as a stringified JSON array.'),
});
export type ValidatePressDieCombinationInput = z.infer<
  typeof ValidatePressDieCombinationInputSchema
>;

const ValidatePressDieCombinationOutputSchema = z.object({
  isValid: z.boolean().describe('Whether the press-die combination is valid.'),
  reason: z.string().describe('The reason for the validation result.'),
});
export type ValidatePressDieCombinationOutput = z.infer<
  typeof ValidatePressDieCombinationOutputSchema
>;

export async function validatePressDieCombination(
  input: ValidatePressDieCombinationInput
): Promise<ValidatePressDieCombinationOutput> {
  return validatePressDieCombinationFlow(input);
}

const validatePressDieCombinationPrompt = ai.definePrompt({
  name: 'validatePressDieCombinationPrompt',
  input: {schema: ValidatePressDieCombinationInputSchema},
  output: {schema: ValidatePressDieCombinationOutputSchema},
  prompt: `You are an AI assistant specializing in manufacturing process validation.

You are provided with the item code, press number, die number, material and a list of valid production conditions.

Determine if the provided press-die combination is valid for the given item code and material, based on the production conditions.

Production Conditions: {{{productionConditions}}}

Item Code: {{{itemCode}}}
Press Number: {{{pressNo}}}
Die Number: {{{dieNo}}}
Material: {{{material}}}

Respond with a boolean value indicating whether the press-die combination is valid, and a reason for the validation result.
`,
});

const validatePressDieCombinationFlow = ai.defineFlow(
  {
    name: 'validatePressDieCombinationFlow',
    inputSchema: ValidatePressDieCombinationInputSchema,
    outputSchema: ValidatePressDieCombinationOutputSchema,
  },
  async input => {
    try {
      // Parse the productionConditions string into a JSON array
      const productionConditionsArray = JSON.parse(input.productionConditions);

      // Check if the provided combination exists in the production conditions
      const isValidCombination = productionConditionsArray.some(
        (condition: any) =>
          condition.itemCode === input.itemCode &&
          condition.pressNo === input.pressNo &&
          condition.dieNo === input.dieNo &&
          condition.material === input.material
      );

      let reason = '';
      if (isValidCombination) {
        reason = 'The press-die combination is valid based on the provided production conditions.';
      } else {
        reason = 'The press-die combination is not valid based on the provided production conditions.';
      }

      return {isValid: isValidCombination, reason: reason};
    } catch (error: any) {
      // Handle JSON parsing errors or other unexpected errors
      console.error('Error validating press-die combination:', error);
      return {isValid: false, reason: `An error occurred during validation: ${error.message}`};
    }
  }
);
