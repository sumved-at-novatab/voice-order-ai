import axios, { HttpStatusCode } from "axios";
import dotenv from "dotenv";
// Load environment variables from .env file
dotenv.config();

const { UNIFIED_SERVICE_URL: baseUri, UNIFIED_API_KEY: apiKey } = process.env;

export const getRestaurantDetails = async (restaurantRefId) => {
  const url = `${baseUri}/internal-service/api/restaurants/${restaurantRefId}/details`;
  const headers = {
    "x-api-key": apiKey,
    "Content-Type": "application/json",
  };

  try {
    const response = await axios.get(url, { headers });
    if (response.status !== HttpStatusCode.Ok) {
      throw new Error(response.status + ": " + response.statusText);
    }
    console.log("getRestaurantDetails: Response:", {
      status: response.status,
      message: response.statusText,
    });
    /* console.log(
      "getRestaurantDetails: Response json:",
      JSON.stringify(response.data, null, 2)
    ); */
    return response.data;
  } catch (error) {
    console.error(
      `getRestaurantDetails: Error fetching restaurant details: ${error.message}`,
      error
    );
    throw new Error(error.message);
  }
};

const getPublishedMenuItems = (data) => {
  return data
    .filter((category) => category.published && !category.markedForDelete)
    .map((category) => {
      const menuItems = category.menuItems
        .filter((item) => item.published && !item.isDeleted)
        .map(
          (item) =>
            `  - ${item.name} (${item.dietType}) - $${item.price} ${item.currency}`
        )
        .join("\n");
      return `${category.name}\n${menuItems}`;
    })
    .join("\n\n");
};

export const getRestaurantMenuItems = async (restaurantRefId) => {
  const url = `${baseUri}/internal-service/api/restaurants/${restaurantRefId}/ComposedMenuItems`;
  const headers = {
    "x-api-key": apiKey,
    "Content-Type": "application/json",
  };

  try {
    const response = await axios.get(url, { headers });
    if (response.status !== HttpStatusCode.Ok) {
      throw new Error(response.status + ": " + response.statusText);
    }
    console.log("getRestaurantMenuItems: Response status:", {
      status: response.status,
      message: response.statusText,
    });
    const publishedMenuItems = getPublishedMenuItems(response.data);
    console.log(
      "getRestaurantMenuItems: Published menu items:",
      publishedMenuItems
    );
    return publishedMenuItems;
  } catch (error) {
    console.error(
      `getRestaurantMenuItems: Error fetching restaurant menu items: ${error.message}`,
      error
    );
    throw new Error(error.message);
  }
};
