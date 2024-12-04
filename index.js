import Fastify from "fastify";
import WebSocket from "ws";
import dotenv from "dotenv";
import fastifyFormBody from "@fastify/formbody";
import fastifyWs from "@fastify/websocket";

// Load environment variables from .env file
dotenv.config();

// Retrieve the OpenAI API key from environment variables.
const { OPENAI_API_KEY } = process.env;

if (!OPENAI_API_KEY) {
  console.error("Missing OpenAI API key. Please set it in the .env file.");
  process.exit(1);
}

// Initialize Fastify
const fastify = Fastify();
fastify.register(fastifyFormBody);
fastify.register(fastifyWs);

// Constants
const SYSTEM_MESSAGE = `You are restaurant waiter Stephie at Cafe Tazza restaurant who takes orders from customers. This is the restaurant menu.

Dosa and Idli
1. Ghee Roast Dosa - $10.99 
2. Plain Dosa - $10.99 
3. Masala Dosa - $10.99 
4. Onion Dosa - $11.99 
5. Mysore Masala Dosa - $11.99 
6. Paneer Dosa - $13.99 
7. Cheese Dosa - $12.99 
8. Rava Dosa - $12.99 
9. Rava Masala Dosa - $13.99 
10. Onion Rava Dosa - $12.99 
11. Onion Rava Masala Dosa - $13.99 
12. Vegetable Spring Dosa - $12.99 
13. Onion Masala Dosa - $13.99 
14. Egg Dosa - $13.99 
15. Chicken Keema Dosa - $13.99 
16. Lamb Keema Dosa - $13.99 
17. Steamed Idli - $8.99 
18. Medhu Vada - $8.99 
19. Pongal - $9.99 
20. Bisi Bile Bath - $9.99 
21. Onion Green Chili Uttapam - $12.99 
22. Onion Tomato Uttapam - $12.99 
23. Butter Toasted Idli - $9.99 
24. Masala Coconut Idli - $9.99 
25. Vegetable Uttapam - $12.99 

Paranthas + Naan + Rice
1. Aloo Parantha - $7.99 
2. Mooli Parantha - $7.99 
3. Gobi Parantha - $7.99 
4. Plain Malabar Parantha - $7.99 
5. Paneer Malabar Parantha - $12.99 
6. Veg Kothu Parantha - $11.99 
7. Lamb Malabar Parantha - $13.99 
8. Chicken Malabar Parantha - $12.99 
9. Chicken Kothu Parantha - $13.99 
10. Egg Kothu Malabar Parantha - $12.99 
11. Paneer Parantha - $9.99 
12. Onion Naan - $3.99 
13. Plain Naan - $3.99 
14. Butter Naan - $3.99 
15. Butter Garlic Naan - $3.99 
16. Tandoori Roti - $3.99 
17. Steamed White Rice - $3.99 

Kids Snacks
1. Chocolate Uttapam Pan Cake - $9.99 
2. Kids Cone Dosa - $9.99 
3. Mickey Mouse Uttapam - $9.99 
4. French Fries - $7.99 
5. Spring Roll - $7.99 
6. Chicken Nuggets - $8.99 

Indo Chinese
1. Veg Manchurian - $12.99 
2. Gobi Manchurian - $11.99 
3. Chilli Gobhi - $12.99 
4. Chicken Manchurian - $12.99 
5. Chili Paneer - $12.99 
6. Veg Hakka Noodles - $11.99 
7. Egg Hakka Noodles - $12.99 
8. Chicken Hakka Noodles - $12.99 
9. Veg Fried Rice - $11.99 
10. Egg Fried Rice - $12.99 
11. Chicken Fried Rice - $12.99 
12. Chicken 65 - $12.99 
13. Chili Chicken - $12.99 
14. Gobi 65 - $11.99 

Biryani
1. Paneer Veg Biryani - $13.99 
2. Chicken Biryani - $14.99 
3. Goat Dum Biryani - $15.99 
4. Veg Biryani - $13.99 

Chaat
1. Pani Poori - $9.99 
2. Samosa Chaat (2 pcs) - $9.99 
3. Papdi Chaat - $9.99 
4. Dahi Sev Poori - $9.99 
5. Dahi Bhalla Chaat - $9.99 
6. Bhel Poori - $9.99 
7. Aloo Tikki Chole - $9.99 
8. Papdi Bhalla Chaat - $9.99 
9. Dhokla Chaat - $9.99 
10. Kachori Chaat - $9.99 

Snacks
1. Chole Bhature - $13.99 
2. Poori Chole - $13.99 
3. Aloo Poori - $13.99 
4. Bombay Vada Pav - 2 Pieces - $11.99 
5. Pav Bhaaji - $11.99 
6. Masala Grilled Fish - $13.99 
7. Lamb Keema Pav - $13.99 
8. Chicken Keema Pav - $12.99 
9. Paneer Bhurji Pav - $12.99 
10. Fish Pakora - $12.99 
11. Chicken Pakora - $12.99 
12. Kutchi Dabeli - $10.99 
13. Dhokla - $11.99 

Samosa + Puff + Pakora
1. Chicken Puff - $3.99 
2. Egg Puff - $3.99 
3. Lamb Puff - $3.99 
4. Paneer Puff - $3.99 
5. Chilli Paneer Puff - $3.99 
6. Butter Chicken Puff - $3.99 
7. Potato Puff - $3.99 
8. Veg Puff - $3.99 
9. Samosa Jumbo - $2.99 
10. Samosa Small - $1.99 
11. Kachori - $2.99 
12. 1/2 Onion Pakora - $4.99 
13. Onion Pakora - $7.99 
14. Bread Pakora - $8.99 
15. Mirch Pakora - $8.99 
16. Paneer Pakora - $8.99 
17. 1/2 Vegetable Pakora - $4.99 
18. Vegetable Pakora - $7.99 
19. Fish Pakora - $12.99 
20. Chicken Pakora - $12.99 

Burger & Rolls
1. Desi Veggie Burger - $11.99 
2. Tandoori Paneer Roll - $11.99 
3. French Fries - $7.99 
4. Chicken Burger - $11.99 
5. Tandoori Chicken Roll - $11.99 

Tazza Pizza
1. Veg Delight Pizza - $19.99 
2. Tandoori Paneer Pizza - $19.99 
3. Shahi Paneer Pizza - $19.99 
4. Pav Bhaji Pizza - $19.99 
5. Chicken Tandoori Pizza - $19.99 
6. Butter Chicken Pizza - $19.99 
7. Malai Chicken Pizza - $19.99 
8. Chilli Chicken Pizza - $19.99 

Drinks + Candy
1. Indian Coffee - $2.99 
2. Masala Chai - $2.99 
3. Mango Lassi - $4.99 
4. Rose Flooda - $5.99 
5. Soda Can - $2.99 
6. Badam Milk - $4.99 
7. Rose Milk - $4.99 
8. Bottle Soda - $2.99 
9. Limca - $2.99 
10. Thumbs Up - $2.99 
11. Water - $1.99 
12. Ice Cream - 1 Scoop - $3.99 
13. Ice Cream - 2 Scoop - $5.99 
14. Salted Lassi - $3.99 

Pastries + Cakes
1. Black Forest - $4.99 
2. Butterscotch - $4.99 
3. Chocolate - $4.99 
4. Choco Lava - $4.99 
5. Mango - $4.99 
6. Pineapple - $4.99 
7. Vanilla - $4.99 
8. Cheesecake Slice - $5.99 
9. Cheesecake - $7.99 
10. Brownie - $4.99

You start with greeting them for calling Cafe Tazza and then ask what the customer wants to order. If customer asks for menu. First list down the categories. If customer asks for items from a specific category then list down that category's menu items along with price. You guide them throughout the order process. Once a customer mentions a menu item. You should mention the cost and ask quantity if not mentioned by customer. Once the customer is done, you try to upsell by asking if they want any drinks. Finally summarize the order (items and quantity) and the total bill amount to customer. End with mentioning that they will receive an sms with the order details and payment link.`;
const VOICE = "alloy";
const PORT = process.env.PORT || 10000; // Allow dynamic port assignment

// List of Event Types to log to the console. See the OpenAI Realtime API Documentation: https://platform.openai.com/docs/api-reference/realtime
const LOG_EVENT_TYPES = [
  "error",
  "response.audio_transcript.done",
  "response.content.done",
  "rate_limits.updated",
  "response.done",
  "input_audio_buffer.committed",
  "input_audio_buffer.speech_stopped",
  "input_audio_buffer.speech_started",
  "session.created",
];

// Show AI response elapsed timing calculations
const SHOW_TIMING_MATH = false;

// Root Route
fastify.get("/", async (request, reply) => {
  reply.send({ message: "Twilio Media Stream Server is running!" });
});

// Route for Twilio to handle incoming calls
// <Say> punctuation to improve text-to-speech translation
fastify.all("/incoming-call", async (request, reply) => {
  const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
                          <Response>
                              <Say> </Say>
                              <Pause length="1"/>
                              <Say> </Say>
                              <Connect>
                                  <Stream url="wss://${request.headers.host}/media-stream" />
                              </Connect>
                          </Response>`;

  reply.type("text/xml").send(twimlResponse);
});

// WebSocket route for media-stream
fastify.register(async (fastify) => {
  fastify.get("/media-stream", { websocket: true }, (connection, req) => {
    console.log("Client connected");

    // Connection-specific state
    let streamSid = null;
    let latestMediaTimestamp = 0;
    let lastAssistantItem = null;
    let markQueue = [];
    let responseStartTimestampTwilio = null;
    const transcripts = [];

    const openAiWs = new WebSocket(
      "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01",
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "realtime=v1",
        },
      }
    );

    // Control initial session with OpenAI
    const initializeSession = () => {
      const sessionUpdate = {
        type: "session.update",
        session: {
          turn_detection: { type: "server_vad" },
          input_audio_format: "g711_ulaw",
          output_audio_format: "g711_ulaw",
          voice: VOICE,
          instructions: SYSTEM_MESSAGE,
          modalities: ["text", "audio"],
          temperature: 0.8,
        },
      };

      console.log("Sending session update:", JSON.stringify(sessionUpdate));
      openAiWs.send(JSON.stringify(sessionUpdate));

      // Uncomment the following line to have AI speak first:
      sendInitialConversationItem();
    };

    // Send initial conversation item if AI talks first
    const sendInitialConversationItem = () => {
      const initialConversationItem = {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: 'Greet the user with "Hi! Thank you for calling Cafe Tazza. What would you like to order?"',
            },
          ],
        },
      };

      if (SHOW_TIMING_MATH)
        console.log(
          "Sending initial conversation item:",
          JSON.stringify(initialConversationItem)
        );
      openAiWs.send(JSON.stringify(initialConversationItem));
      openAiWs.send(JSON.stringify({ type: "response.create" }));
    };

    // Handle interruption when the caller's speech starts
    const handleSpeechStartedEvent = () => {
      if (markQueue.length > 0 && responseStartTimestampTwilio != null) {
        const elapsedTime = latestMediaTimestamp - responseStartTimestampTwilio;
        if (SHOW_TIMING_MATH)
          console.log(
            `Calculating elapsed time for truncation: ${latestMediaTimestamp} - ${responseStartTimestampTwilio} = ${elapsedTime}ms`
          );

        if (lastAssistantItem) {
          const truncateEvent = {
            type: "conversation.item.truncate",
            item_id: lastAssistantItem,
            content_index: 0,
            audio_end_ms: elapsedTime,
          };
          if (SHOW_TIMING_MATH)
            console.log(
              "Sending truncation event:",
              JSON.stringify(truncateEvent)
            );
          openAiWs.send(JSON.stringify(truncateEvent));
        }

        connection.send(
          JSON.stringify({
            event: "clear",
            streamSid: streamSid,
          })
        );

        // Reset
        markQueue = [];
        lastAssistantItem = null;
        responseStartTimestampTwilio = null;
      }
    };

    // Send mark messages to Media Streams so we know if and when AI response playback is finished
    const sendMark = (connection, streamSid) => {
      if (streamSid) {
        const markEvent = {
          event: "mark",
          streamSid: streamSid,
          mark: { name: "responsePart" },
        };
        connection.send(JSON.stringify(markEvent));
        markQueue.push("responsePart");
      }
    };

    // Open event for OpenAI WebSocket
    openAiWs.on("open", () => {
      console.log("Connected to the OpenAI Realtime API");
      setTimeout(initializeSession, 100);
    });

    // Listen for messages from the OpenAI WebSocket (and send to Twilio if necessary)
    openAiWs.on("message", (data) => {
      try {
        const message = JSON.parse(data);
        const eventType = message.type;

        if (LOG_EVENT_TYPES.includes(eventType)) {
          console.log(`Received event: ${eventType}`, message);
        }

        switch (message.type) {
          case "response.audio.delta":
            const audioDelta = {
              event: "media",
              streamSid: streamSid,
              media: {
                payload: Buffer.from(message.delta, "base64").toString(
                  "base64"
                ),
              },
            };
            connection.send(JSON.stringify(audioDelta));

            // First delta from a new response starts the elapsed time counter
            if (!responseStartTimestampTwilio) {
              responseStartTimestampTwilio = latestMediaTimestamp;
              if (SHOW_TIMING_MATH)
                console.log(
                  `Setting start timestamp for new response: ${responseStartTimestampTwilio}ms`
                );
            }
            if (message.item_id) {
              lastAssistantItem = message.item_id;
            }
            sendMark(connection, streamSid);
            break;
          case "input_audio_buffer.speech_started":
            handleSpeechStartedEvent();
            break;
          case "response.audio_transcript.done":
            console.log(`Audio transcript: ${message.transcript}`);
            break;
          case "response.done":
            if (
              message.response.output &&
              message.response.output[0] &&
              message.response.output[0].content &&
              message.response.output[0].content[0]
            ) {
              const { transcript } = message.response.output[0].content[0];
              console.log(`Transcript: ${transcript}`);
              transcripts.push(transcript);
            }
            break;
        }
      } catch (error) {
        console.error(
          "Error processing OpenAI message:",
          error,
          "Raw message:",
          data
        );
      }
    });

    // Handle incoming messages from Twilio
    connection.on("message", (message) => {
      try {
        const data = JSON.parse(message);

        switch (data.event) {
          case "media":
            latestMediaTimestamp = data.media.timestamp;
            if (SHOW_TIMING_MATH)
              console.log(
                `Received media message with timestamp: ${latestMediaTimestamp}ms`
              );
            if (openAiWs.readyState === WebSocket.OPEN) {
              const audioAppend = {
                type: "input_audio_buffer.append",
                audio: data.media.payload,
              };
              openAiWs.send(JSON.stringify(audioAppend));
            }
            break;
          case "start":
            streamSid = data.start.streamSid;
            console.log("Incoming stream has started", streamSid);

            // Reset start and media timestamp on a new stream
            responseStartTimestampTwilio = null;
            latestMediaTimestamp = 0;
            break;
          case "mark":
            if (markQueue.length > 0) {
              markQueue.shift();
            }
            break;
          case "stop":
            console.log("Received completed:", data.event);
            console.log(`Transcripts: ${transcripts}`);
            break;
          default:
            console.log("Received non-media event:", data.event);
            break;
        }
      } catch (error) {
        console.error("Error parsing message:", error, "Message:", message);
      }
    });

    // Handle connection close
    connection.on("close", () => {
      if (openAiWs.readyState === WebSocket.OPEN) openAiWs.close();
      console.log("Client disconnected.");
    });

    // Handle WebSocket close and errors
    openAiWs.on("close", () => {
      console.log("Disconnected from the OpenAI Realtime API");
    });

    openAiWs.on("error", (error) => {
      console.error("Error in the OpenAI WebSocket:", error);
    });
  });
});

fastify.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server is listening on port ${PORT}`);
});
