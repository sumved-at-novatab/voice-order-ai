import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import dotenv from "dotenv";
// Load environment variables from .env file
dotenv.config();

const { OPENAI_API_KEY } = process.env;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const OrderItem = z.object({
  id: z.string(),
  item: z.string(),
  quantity: z.number(),
  cost: z.number(),
});

const Order = z.object({
  items: z.array(OrderItem),
  total_bill_amount: z.number(),
});

export const generateOrder = async (transcripts, menuItems) => {
  const ORDER_SYSTEM_MESSAGE = `You are a helpful assistant.
    Here is an audio transcript between the customer and the restaurant customer care.
    Below is the restaurant menu items json for your reference to pick the id of each of the items.
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
