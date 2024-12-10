import Fastify from "fastify";
import WebSocket from "ws";
import dotenv from "dotenv";
import fastifyFormBody from "@fastify/formbody";
import fastifyWs from "@fastify/websocket";

// Load environment variables from .env file
dotenv.config();

// import { SYSTEM_MESSAGE } from "./constants.js";
import { generateOrder } from "./openai.client.js";
import { getRestaurantDetails, getRestaurantMenuItems } from "./oms.client.js";

// Retrieve the OpenAI API key from environment variables.
const { OPENAI_API_KEY, RESTAURANT_REF_ID } = process.env;

if (!OPENAI_API_KEY) {
  console.error("Missing OpenAI API key. Please set it in the .env file.");
  process.exit(1);
}

// Initialize Fastify
const fastify = Fastify();
fastify.register(fastifyFormBody);
fastify.register(fastifyWs);

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
  fastify.get("/media-stream", { websocket: true }, async (connection, req) => {
    console.log("Client connected");

    const restaurantRefId = RESTAURANT_REF_ID;
    const { name: restaurantName } = await getRestaurantDetails(
      restaurantRefId
    );
    console.log("Restaurant name:", restaurantName);
    const menuItems = await getRestaurantMenuItems(restaurantRefId);
    console.log("Menu items:", menuItems);

    const SYSTEM_MESSAGE = `You are a restaurant's waiter Stephie at ${restaurantName} restaurant.
      Act like a human, but remember that you aren't a human
      and you can't do human things in the real world.
      Your voice and personality should be warm and engaging, with a lively tone.
      If interacting in a non-English language,
      start by using the standard accent or dialect familiar to the user.
      No need to mention menu items; the customer already has them.

      ${menuItems}

      You start with greeting them for calling Cafe Tazza and then ask what the customer wants to order.
      If customer asks for menu. First list down the categories.
      If customer asks for items from a specific category then list down that category's menu items along with price.
      You guide them throughout the order process. Once a customer mentions a menu item.
      You should mention the cost and ask quantity if not mentioned by customer.
      Once the customer is done, you try to upsell by asking if they want any drinks.
      Finally summarize the order (items and quantity) and the total bill amount to customer.
      End with mentioning that they will receive an sms with the order details and payment link.`;

    console.log("OpenAI system message:", SYSTEM_MESSAGE);
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
          turn_detection: {
            type: "server_vad",
            threshold: 0.4, // A higher threshold will require louder audio to activate the model.
            silence_duration_ms: 1000, // Duration of silence to detect speech stop (in milliseconds).
          },
          input_audio_format: "g711_ulaw",
          output_audio_format: "g711_ulaw",
          input_audio_transcription: {
            model: "whisper-1",
          },
          voice: VOICE,
          instructions: SYSTEM_MESSAGE,
          modalities: ["text", "audio"],
          temperature: 0.8,
        },
      };

      // console.log("Sending session update:", JSON.stringify(sessionUpdate));
      console.log("Sending session.update event.");
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
            /* console.log(
              "Sending truncation event:",
              JSON.stringify(truncateEvent)
            ); */
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
        const {
          type: eventType,
          event_id: eventId,
          response_id: responseId,
          item_id: itemId,
        } = message;

        if (LOG_EVENT_TYPES.includes(eventType)) {
          // console.log(`Received event: ${eventType}`, message);
          console.log(
            `Event type: ${message.type} `,
            `Event id: ${eventId} `,
            `Response id: ${responseId} `,
            `Item id: ${itemId}`
          );
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
          case "conversation.item.input_audio_transcription.completed":
            const { transcript } = message;
            console.log(`User input transcript: ${transcript}`);
            transcripts.push(`Customer: ${transcript}`);
            break;
          case "response.done":
            if (
              message.response.output &&
              message.response.output[0] &&
              message.response.output[0].content &&
              message.response.output[0].content[0]
            ) {
              const { transcript } = message.response.output[0].content[0];
              console.log(`Server audio transcript: ${transcript}`);
              transcripts.push(`Restaurant: ${transcript}`);
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
    connection.on("message", async (message) => {
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
            console.log("Incoming stream has started: ", streamSid);

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
            // console.log("Received completed:", data.event);
            console.log(`Full transcripts:\n${transcripts.join("\n")}`);
            const order = await generateOrder(transcripts.join("\n"));
            console.log("Order json:", order);
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
