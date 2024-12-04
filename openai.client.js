import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import dotenv from "dotenv";
// Load environment variables from .env file
dotenv.config();

import { ORDER_SYSTEM_MESSAGE } from "./constants.js";

const { OPENAI_API_KEY } = process.env;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const OrderItem = z.object({
  dish: z.string(),
  quantity: z.number(),
  cost: z.number(),
});

const Order = z.object({
  items: z.array(OrderItem),
  total_bill_amount: z.number(),
});

export const generateOrder = async (transcripts) => {
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
