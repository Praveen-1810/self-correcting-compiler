export async function POST(request) {
  try {
    const body = await request.json();
    const {
      nitrogen,
      phosphorus,
      potassium,
      temperature,
      humidity,
      ph,
      rainfall,
    } = Object.fromEntries(
      Object.entries(body).map(([key, value]) => [key, Number(value)])
    );

    if (
      !nitrogen ||
      !phosphorus ||
      !potassium ||
      !temperature ||
      !humidity ||
      !ph ||
      !rainfall
    ) {
      return Response.json({
        error: "All parameters are required",
      }, { status: 400 });
    }

    if (nitrogen < 0 || phosphorus < 0 || potassium < 0) {
      return Response.json({
        error: "Soil nutrient values must be positive",
      }, { status: 400 });
    }

    if (temperature < -50 || temperature > 60) {
      return Response.json({
        error: "Temperature must be between -50°C and 60°C",
      }, { status: 400 });
    }

    if (humidity < 0 || humidity > 100) {
      return Response.json({
        error: "Humidity must be between 0% and 100%",
      }, { status: 400 });
    }

    if (ph < 0 || ph > 14) {
      return Response.json({
        error: "pH must be between 0 and 14",
      }, { status: 400 });
    }

    if (rainfall < 0) {
      return Response.json({
        error: "Rainfall must be positive",
      }, { status: 400 });
    }

    let prediction;

    if (temperature > 30 && rainfall < 200) {
      if (ph >= 6 && ph <= 8) {
        prediction = "cotton";
      } else {
        prediction = "millet";
      }
    } else if (temperature >= 20 && temperature <= 30 && rainfall > 200) {
      if (nitrogen > 40 && phosphorus > 40) {
        prediction = "rice";
      } else {
        prediction = "maize";
      }
    } else if (temperature < 20) {
      if (humidity > 70) {
        prediction = "wheat";
      } else {
        prediction = "barley";
      }
    } else {
      if (ph < 6) {
        prediction = "groundnut";
      } else {
        prediction = "soybean";
      }
    }

    return Response.json({
      prediction: prediction,
    });
  } catch (error) {
    return Response.json({
      error: "Invalid request data",
    }, { status: 400 });
  }
}