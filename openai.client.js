import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import dotenv from "dotenv";
// Load environment variables from .env file
dotenv.config();

const { OPENAI_API_KEY } = process.env;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const OrderItem = z.object({
  menuRefId: z.string().describe("The unique reference ID for the menu item."),
  item: z.string().describe("The name of the menu item."),
  quantity: z.number().describe("The quantity of the item ordered."),
  price: z.number().describe("Price per item."),
  modifiers: z.array(z.any()).length(0).describe("An array that must always be empty."),
});

const Order = z.object({
  items: z.array(OrderItem),
});

export const generateOrder = async (transcripts, menuItems) => {
  const ORDER_SYSTEM_MESSAGE = `You are a helpful assistant.
    Here is an audio transcript between the customer and the restaurant customer care.
    Below is the restaurant menu items json for your reference to pick the id of each of the items.
    Please remember price in the schema is price per item.
    ${JSON.stringify(menuItems)}`;
  const completion = await openai.beta.chat.completions.parse({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: ORDER_SYSTEM_MESSAGE,
      },
      { role: "user", content: transcripts },
    ],
    response_format: zodResponseFormat(Order, "order"),
  });
  const order = completion.choices[0].message.parsed;
  return order;
};
