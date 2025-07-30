async function handler(params) {
  const {
    nitrogen,
    phosphorus,
    potassium,
    temperature,
    humidity,
    ph,
    rainfall,
  } = Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, Number(value)])
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
    return {
      error: "All parameters are required",
    };
  }

  if (nitrogen < 0 || phosphorus < 0 || potassium < 0) {
    return {
      error: "Soil nutrient values must be positive",
    };
  }

  if (temperature < -50 || temperature > 60) {
    return {
      error: "Temperature must be between -50°C and 60°C",
    };
  }

  if (humidity < 0 || humidity > 100) {
    return {
      error: "Humidity must be between 0% and 100%",
    };
  }

  if (ph < 0 || ph > 14) {
    return {
      error: "pH must be between 0 and 14",
    };
  }

  if (rainfall < 0) {
    return {
      error: "Rainfall must be positive",
    };
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

  return {
    prediction: prediction,
  };
}