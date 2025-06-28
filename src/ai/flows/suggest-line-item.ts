// src/ai/flows/suggest-line-item.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting line items based on user input.
 *
 * - suggestLineItem - A function that suggests line items for invoice creation.
 * - SuggestLineItemInput - The input type for the suggestLineItem function.
 * - SuggestLineItemOutput - The output type for the suggestLineItem function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestLineItemInputSchema = z.object({
  partialDescription: z
    .string()
    .describe('A partial description of the line item to be suggested.'),
});
export type SuggestLineItemInput = z.infer<typeof SuggestLineItemInputSchema>;

const SuggestLineItemOutputSchema = z.object({
  suggestion: z
    .string()
    .describe(
      'A suggested line item description, or an empty string if no suggestion is relevant.'
    ),
});
export type SuggestLineItemOutput = z.infer<typeof SuggestLineItemOutputSchema>;

export async function suggestLineItem(input: SuggestLineItemInput): Promise<SuggestLineItemOutput> {
  return suggestLineItemFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestLineItemPrompt',
  input: {schema: SuggestLineItemInputSchema},
  output: {schema: SuggestLineItemOutputSchema},
  prompt: `You are an invoicing assistant.

  The user will provide a partial description of a line item.
  If you can generate a plausible, complete description, return it in the suggestion field.
  If you cannot, return an empty string.

  Partial Description: {{{partialDescription}}} `,
});

const suggestLineItemFlow = ai.defineFlow(
  {
    name: 'suggestLineItemFlow',
    inputSchema: SuggestLineItemInputSchema,
    outputSchema: SuggestLineItemOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
