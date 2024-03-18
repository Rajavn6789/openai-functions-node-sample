const express = require("express");
const OpenAI = require("openai");
const axios = require("axios");

const openai = new OpenAI({
  apiKey: "YOUR_API_KEY",
});

const app = express();
app.use(express.json());
const port = 5000;

function getTimeOfDay() {
  let date = new Date();
  let hours = date.getHours();
  let minutes = date.getMinutes();
  let seconds = date.getSeconds();
  let timeOfDay = "AM";
  if (hours > 12) {
    hours = hours - 12;
    timeOfDay = "PM";
  }
  return hours + ":" + minutes + ":" + seconds + " " + timeOfDay;
}

async function lookupWeather(location) {
  try {
    const latlongResponse = await axios.get(
      `https://geocoding-api.open-meteo.com/v1/search?name=${location}&count=1&language=en&format=json`
    );
    const { latitude, longitude } = latlongResponse.data.results[0];
    const weatherResponse = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&daily=temperature_2m_max,temperature_2m_min`
    );
    const { current, current_units } = weatherResponse.data;
    const weatherForecast = `Current Temperature: ${current.temperature_2m}${current_units.temperature_2m}`;

    return weatherForecast;
  } catch (error) {
    console.error(error);
    return "No forecast found";
  }
}

app.get("/health", (req, res) => {
  res.send("Iam good!");
});

app.post("/chatgpt", async (req, res) => {
  const prompt = req.body.prompt; // what is the weather in Bengaluru

  // Step 1: Call ChatGPT with the function definitions
  let messages = [
    {
      role: "user",
      content: prompt,
    },
  ];
  try {
    const initialResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0613",
      messages,
      functions: [
        {
          name: "getTimeOfDay",
          description: "Get the time of day.",
          parameters: {
            type: "object",
            properties: {},
            require: [],
          },
        },
        {
          name: "lookupWeather",
          description: "get the weather forecast in a given location",
          parameters: {
            type: "object", // specify that the parameter is an object
            properties: {
              location: {
                type: "string", // specify the parameter type as a string
                description:
                  "The location, e.g. Beijing, China. But it should be written in a city, state, country",
              },
            },
            required: ["location"], // specify that the location parameter is required
          },
        },
      ],
      function_call: "auto",
    });

    // Step 2: Prepare messages
    const wantsToUseFunction = initialResponse.choices[0].finish_reason;
    if (wantsToUseFunction === "function_call") {
      let content = "";
      const functionName =
        initialResponse.choices[0].message.function_call.name;
      if (functionName === "lookupWeather") {
        let argumentObj = JSON.parse(
          initialResponse.choices[0].message.function_call.arguments
        );
        content = await lookupWeather(argumentObj.location.split(",")[0]);
        messages.push(initialResponse.choices[0].message);
        messages.push({
          role: "function",
          name: "lookupWeather",
          content,
        });
      } else if (functionName === "getTimeOfDay") {
        content = getTimeOfDay();
        messages.push(initialResponse.choices[0].message);
        messages.push({
          role: "function",
          name: "getTimeOfDay",
          content,
        });
      } else {
        console.log("function not found");
      }

      // Step 3: Call ChatGPT with function messages
      try {
        let functionResponse = await openai.chat.completions.create({
          model: "gpt-3.5-turbo-0613",
          messages,
        });
        res.send(functionResponse.choices[0].message.content);
      } catch (e) {
        console.log("step3 error", e);
      }
    } else {
      res.send("no function");
    }
  } catch (e) {
    console.log("step3 error", e);
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
