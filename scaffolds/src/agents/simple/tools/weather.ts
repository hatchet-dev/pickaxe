import { pickaxe } from "../../../client";

type WeatherInput = {
  city: string;
};

type WeatherOutput = {
  weather: string;
};

export default pickaxe.tool({
  name: "weather",
  fn: async (input: WeatherInput): Promise<WeatherOutput> => {
    return {
      weather: "sunny",
    };
  },
});