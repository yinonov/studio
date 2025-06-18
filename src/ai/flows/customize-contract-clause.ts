// src/ai/flows/customize-contract-clause.ts
'use server';

/**
 * @fileOverview AI-powered clause customization flow.
 *
 * - customizeContractClause - A function that generates legal wording for a custom contract clause.
 * - CustomizeContractClauseInput - The input type for the customizeContractClause function.
 * - CustomizeContractClauseOutput - The return type for the customizeContractClause function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CustomizeContractClauseInputSchema = z.object({
  userDescription: z
    .string()
    .describe('A plain language description of the desired contract clause.'),
});
export type CustomizeContractClauseInput = z.infer<typeof CustomizeContractClauseInputSchema>;

const CustomizeContractClauseOutputSchema = z.object({
  legalWording: z
    .string()
    .describe('The generated legal wording for the custom contract clause.'),
});
export type CustomizeContractClauseOutput = z.infer<typeof CustomizeContractClauseOutputSchema>;

export async function customizeContractClause(
  input: CustomizeContractClauseInput
): Promise<CustomizeContractClauseOutput> {
  return customizeContractClauseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'customizeContractClausePrompt',
  input: {schema: CustomizeContractClauseInputSchema},
  output: {schema: CustomizeContractClauseOutputSchema},
  prompt: `You are an AI assistant specialized in generating legally sound contract clauses for Israeli contracts.

  Based on the user's description, generate the appropriate legal wording for a custom contract clause that complies with Israeli law.

  User Description: {{{userDescription}}}

  Legal Wording:`, // Removed 'TOS' since it's not a concrete requirement.
});

const customizeContractClauseFlow = ai.defineFlow(
  {
    name: 'customizeContractClauseFlow',
    inputSchema: CustomizeContractClauseInputSchema,
    outputSchema: CustomizeContractClauseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
