"use client";
import React from "react";

function MainComponent() {
  const [formData, setFormData] = useState({
    nitrogen: "",
    phosphorus: "",
    potassium: "",
    temperature: "",
    humidity: "",
    ph: "",
    rainfall: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.nitrogen || formData.nitrogen < 0)
      newErrors.nitrogen = "Valid nitrogen content required";
    if (!formData.phosphorus || formData.phosphorus < 0)
      newErrors.phosphorus = "Valid phosphorus content required";
    if (!formData.potassium || formData.potassium < 0)
      newErrors.potassium = "Valid potassium content required";
    if (
      !formData.temperature ||
      formData.temperature < -50 ||
      formData.temperature > 60
    )
      newErrors.temperature = "Temperature must be between -50°C and 60°C";
    if (!formData.humidity || formData.humidity < 0 || formData.humidity > 100)
      newErrors.humidity = "Humidity must be between 0% and 100%";
    if (!formData.ph || formData.ph < 0 || formData.ph > 14)
      newErrors.ph = "pH must be between 0 and 14";
    if (!formData.rainfall || formData.rainfall < 0)
      newErrors.rainfall = "Valid rainfall amount required";
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();

    if (Object.keys(newErrors).length === 0) {
      setLoading(true);
      setSubmitError(null);

      try {
        const response = await fetch("/api/predict-crop", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        setRecommendation(
          `Based on our analysis, we recommend growing ${data.prediction}.`
        );
      } catch (error) {
        setSubmitError(
          error.message || "Failed to get recommendation. Please try again."
        );
        console.error(error);
      } finally {
        setLoading(false);
      }
    } else {
      setErrors(newErrors);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-8 font-inter">
          Crop Recommendation
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-inter text-gray-900 dark:text-white mb-2">
                Nitrogen Content (N)
              </label>
              <input
                type="number"
                name="nitrogen"
                value={formData.nitrogen}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-gray-900 dark:text-white dark:bg-gray-800"
                placeholder="Enter nitrogen content"
              />
              {errors.nitrogen && (
                <p className="mt-1 text-sm text-red-500">{errors.nitrogen}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-inter text-gray-900 dark:text-white mb-2">
                Phosphorus Content (P)
              </label>
              <input
                type="number"
                name="phosphorus"
                value={formData.phosphorus}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-gray-900 dark:text-white dark:bg-gray-800"
                placeholder="Enter phosphorus content"
              />
              {errors.phosphorus && (
                <p className="mt-1 text-sm text-red-500">{errors.phosphorus}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-inter text-gray-900 dark:text-white mb-2">
                Potassium Content (K)
              </label>
              <input
                type="number"
                name="potassium"
                value={formData.potassium}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-gray-900 dark:text-white dark:bg-gray-800"
                placeholder="Enter potassium content"
              />
              {errors.potassium && (
                <p className="mt-1 text-sm text-red-500">{errors.potassium}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-inter text-gray-900 dark:text-white mb-2">
                Temperature (°C)
              </label>
              <input
                type="number"
                name="temperature"
                value={formData.temperature}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-gray-900 dark:text-white dark:bg-gray-800"
                placeholder="Enter temperature"
              />
              {errors.temperature && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.temperature}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-inter text-gray-900 dark:text-white mb-2">
                Humidity (%)
              </label>
              <input
                type="number"
                name="humidity"
                value={formData.humidity}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-gray-900 dark:text-white dark:bg-gray-800"
                placeholder="Enter humidity"
              />
              {errors.humidity && (
                <p className="mt-1 text-sm text-red-500">{errors.humidity}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-inter text-gray-900 dark:text-white mb-2">
                pH Value
              </label>
              <input
                type="number"
                name="ph"
                value={formData.ph}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-gray-900 dark:text-white dark:bg-gray-800"
                placeholder="Enter pH value"
              />
              {errors.ph && (
                <p className="mt-1 text-sm text-red-500">{errors.ph}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-inter text-gray-900 dark:text-white mb-2">
                Rainfall (mm)
              </label>
              <input
                type="number"
                name="rainfall"
                value={formData.rainfall}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-gray-900 dark:text-white dark:bg-gray-800"
                placeholder="Enter rainfall"
              />
              {errors.rainfall && (
                <p className="mt-1 text-sm text-red-500">{errors.rainfall}</p>
              )}
            </div>
          </div>

          <div className="flex justify-center mt-8">
            <button
              type="submit"
              disabled={loading}
              className="bg-gray-900 hover:bg-gray-700 text-white font-inter px-8 py-3 rounded-md transition-colors duration-200"
            >
              {loading ? "Analyzing..." : "Get Recommendation"}
            </button>
          </div>
        </form>

        {submitError && (
          <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-sm font-inter">
              {submitError}
            </p>
          </div>
        )}

        {recommendation && !submitError && (
          <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white font-inter mb-4">
              Recommendation
            </h2>
            <p className="text-gray-700 dark:text-gray-300 font-inter">
              {recommendation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default MainComponent;