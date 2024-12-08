let map;
let marker;
let userLocation = { lat: 51.505, lon: -0.09 };

function initMap() {
  map = L.map("map").setView([userLocation.lat, userLocation.lon], 2);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  marker = L.marker([userLocation.lat, userLocation.lon]).addTo(map);

  map.on("click", async function (e) {
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;
    if (marker) {
      marker.setLatLng(e.latlng);
    } else {
      marker = L.marker([lat, lon]).addTo(map);
    }
    await fetchWeatherByCoordinates(lat, lon);
    await reverseGeocode(lat, lon);
  });
}

function getCurrentLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function (position) {
        userLocation.lat = position.coords.latitude;
        userLocation.lon = position.coords.longitude;
        initMap();
        fetchWeatherByCoordinates(userLocation.lat, userLocation.lon);
        reverseGeocode(userLocation.lat, userLocation.lon);
      },
      function () {
        console.error("Geolocation failed, defaulting to Cairo.");
        initMap();
        fetchWeatherByCoordinates(userLocation.lat, userLocation.lon);
        reverseGeocode(userLocation.lat, userLocation.lon);
      }
    );
  } else {
    console.error("Geolocation is not supported by this browser.");
    initMap();
    fetchWeatherByCoordinates(userLocation.lat, userLocation.lon);
    reverseGeocode(userLocation.lat, userLocation.lon);
  }
}

async function reverseGeocode(lat, lon) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
    );
    const data = await response.json();
    const cityName =
      data.address?.city || data.address?.town || data.address?.village;

    if (cityName) {
      document.getElementById("search").value = cityName;
    }
  } catch (error) {
    console.error("Error in reverse geocode:", error);
  }
}

async function fetchWeatherByCoordinates(lat, lon) {
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    console.error("Invalid coordinates:", lat, lon);
    return;
  }

  document.getElementById("loading").style.display = "block";
  try {
    const response = await fetch(
      `https://api.weatherapi.com/v1/forecast.json?key=3e05373f546143dcadd164501240812&q=${lat},${lon}&days=3`
    );
    document.getElementById("loading").style.display = "none";
    if (response.ok) {
      const data = await response.json();
      displayCurrent(data.location, data.current);
      displayForecast(data.forecast.forecastday);
    } else {
      document.getElementById("forecast").innerHTML =
        "<p class='text-danger'>Location not found. Please try again.</p>";
    }
  } catch (error) {
    document.getElementById("loading").style.display = "none";
    document.getElementById("forecast").innerHTML =
      "<p class='text-danger'>Unable to fetch weather data. Please try again later.</p>";
    console.error("Error fetching weather data:", error);
  }
}

async function search(location) {
  document.getElementById("loading").style.display = "block";
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${location}&format=json&limit=1`
    );
    document.getElementById("loading").style.display = "none";
    const data = await response.json();
    if (data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      map.setView([lat, lon], 10);
      if (marker) {
        marker.setLatLng([lat, lon]);
      } else {
        marker = L.marker([lat, lon]).addTo(map);
      }
      await fetchWeatherByCoordinates(lat, lon);
      await reverseGeocode(lat, lon);
    } else {
      document.getElementById("forecast").innerHTML =
        "<p class='text-danger'>Location not found. Please try again or try typing the full name.</p>";
    }
  } catch (error) {
    document.getElementById("loading").style.display = "none";
    document.getElementById("forecast").innerHTML =
      "<p class='text-danger'>Unable to fetch location. Please try again later.</p>";
    console.error("Error in search:", error);
  }
}

let Timer;
document.getElementById("search").addEventListener("keyup", (event) => {
  const location = event.target.value.trim();
  clearTimeout(Timer);
  Timer = setTimeout(() => {
    if (location) {
      search(location);
    }
  }, 500);
});

function displayCurrent(location, current) {
  if (!current) return;
  const currentHTML = `
    <div class="weather-card">
      <h3>${location.name}, ${location.country}</h3>
      <p>${formatDate(current.last_updated)}</p>
      <div class="temp">${current.temp_c}<sup>o</sup>C</div>
      <img src="https:${current.condition.icon}" alt="${
    current.condition.text
  }" class="icon">
      <p>${current.condition.text}</p>
      <p>Feels like: ${current.feelslike_c}<sup>o</sup>C</p>
      <p>Humidity: ${current.humidity}%</p>
      <p>UV Index: ${current.uv}</p>
      <p>Pressure: ${current.pressure_mb} mb</p>
      <p>Visibility: ${current.vis_km} km</p>
      <p>Wind: ${current.wind_kph} km/h, ${current.wind_dir}</p>
      <p>Precipitation: ${current.precip_mm} mm</p>
    </div>`;
  document.getElementById("forecast").innerHTML = currentHTML;
}

function displayForecast(forecastDays) {
  let forecastHTML = "";
  forecastDays.slice(1).forEach((day) => {
    const date = new Date(day.date.replace(" ", "T"));
    forecastHTML += `
      <div class="weather-card">
        <h3>${days[date.getDay()]}</h3>
        <p>${formatDate(day.date)}</p>
        <div class="temp">${day.day.maxtemp_c}<sup>o</sup>C</div>
        <small>Low: ${day.day.mintemp_c}<sup>o</sup>C</small>
        <img src="https:${day.day.condition.icon}" alt="${
      day.day.condition.text
    }" class="icon">
        <p>${day.day.condition.text}</p>
        <p>Humidity: ${day.day.avghumidity}%</p>
        <p>UV Index: ${day.day.uv}</p>
      </div>`;
  });
  document.getElementById("forecast").innerHTML += forecastHTML;
}

const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatDate(dateString) {
  const date = new Date(dateString.replace(" ", "T"));
  return `${days[date.getDay()]}, ${date.getDate()} ${
    monthNames[date.getMonth()]
  }`;
}

getCurrentLocation();
