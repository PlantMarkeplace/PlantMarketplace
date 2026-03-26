const API_URL = "http://localhost:5000/api/plants";

export const createPlant = async (plantData: any) => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(plantData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create plant");
  }

  return response.json();
};

export const getSellerPlants = async (sellerId: string) => {
  const response = await fetch(`${API_URL}?seller_id=${sellerId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch plants");
  }

  return response.json();
};