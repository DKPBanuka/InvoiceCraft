
'use server';
/**
 * @fileOverview An AI flow to forecast sales based on historical data.
 *
 * - forecastSales - A function that provides a sales forecast.
 * - SalesDataInput - The input type for the forecastSales function.
 * - SalesForecastOutput - The return type for the forecastSales function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SalesDataItemSchema = z.object({
  date: z.string().describe('The date of the sales data point (e.g., YYYY-MM-DD).'),
  total: z.number().describe('The total sales amount for that day.'),
});

const SalesDataInputSchema = z.object({
  salesData: z.array(SalesDataItemSchema).describe('An array of historical sales data.'),
});
export type SalesDataInput = z.infer<typeof SalesDataInputSchema>;

const SalesForecastOutputSchema = z.object({
  forecast: z
    .string()
    .describe('A comprehensive, easy-to-read sales forecast and analysis based on the provided data. It should include trends, patterns, and a prediction for the next 30 days. The tone should be like a helpful business advisor.'),
});
export type SalesForecastOutput = z.infer<typeof SalesForecastOutputSchema>;


export async function forecastSales(input: SalesDataInput): Promise<SalesForecastOutput> {
  return forecastSalesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'salesForecastPrompt',
  input: {schema: SalesDataInputSchema},
  output: {schema: SalesForecastOutputSchema},
  prompt: `You are a business analytics expert. Your task is to analyze the following daily sales data and provide a sales forecast for the next 30 days.

Please provide a detailed analysis. Look for trends (upward, downward, stable), seasonality, or any other patterns.
Based on your analysis, generate a clear, concise, and insightful forecast. Mention potential revenue for the next month.
The forecast should be written in a friendly, advisory tone.

Historical Sales Data:
{{#each salesData}}
- Date: {{{date}}}, Sales: {{{total}}}
{{/each}}
`,
});

const forecastSalesFlow = ai.defineFlow(
  {
    name: 'forecastSalesFlow',
    inputSchema: SalesDataInputSchema,
    outputSchema: SalesForecastOutputSchema,
  },
  async input => {
    // In a real-world scenario, you might add more complex logic here,
    // like fetching more data or calling other services.
    if (input.salesData.length < 7) {
        return { forecast: "There is not enough historical data to generate a meaningful forecast. Please accumulate at least 7 days of sales." };
    }

    const {output} = await prompt(input);
    return output!;
  }
);
