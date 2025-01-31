
function getDaytimeFilter(todayOrTomorrow) {
  const now = new Date(Date.now());
  const dayStartHour = 6;
  const dayDurationHours = 12;
  let dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), dayStartHour, 0, 0)
  if (todayOrTomorrow == "tomorrow") { dayStart = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000); }
  const dayEnd = new Date(dayStart.getTime() + dayDurationHours * 60 * 60 * 1000) 
  return function(forecast) {
    return forecast.dt * 1000 >= dayStart.getTime() &&
           forecast.dt * 1000 <= dayEnd.getTime();
  }
}

function getNighttimeFilter() {
  const now = new Date(Date.now());
  const nightStartHour = 18;
  const nightDurationHours = 12;
  const nightStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), nightStartHour, 0, 0)
  const nightEnd = new Date(nightStart.getTime() + nightDurationHours * 60 * 60 * 1000) 
  return function(forecast) {
    return forecast.dt * 1000 >= nightStart.getTime() &&
           forecast.dt * 1000 <= nightEnd.getTime();
  }
}

function isItMorning(msNow) {
  const now = new Date(msNow);
  return now.getHours() < 12;
}

function minMaxMean(values, valueFunc, filter) {
  selectedValues = values.filter(filter).map(valueFunc);
  min = Math.min(...selectedValues);
  max = Math.max(...selectedValues);
  mean = selectedValues.reduce((a, b) => a+b, 0) / selectedValues.length;
  return { min, max, mean };
}

let lat = undefined;
let lon = undefined;

function onMapClick(e) {
  this.setLatLng(e.latlng)
  lat = e.latlng.lat;
  lon = e.latlng.lon;
  Cookies.set("lat", lat, { expires: 90 });
  Cookies.set("lon", lon, { expires: 90 });
  updateRugGuide()
}

async function setup() {
  setupMap();
  setupStabling();
}

async function setupStabling() {
  let stabling = Cookies.get("stabling") || "daytime";
  if (stabling == "nighttime") { $("#nighttimeButton").checked = true; }
  if (stabling == "daytime") { $("#daytimeButton").checked = true; }
  setStabling(stabling);
}

async function setupMap() {
  // lat: 52°18'10.08, long: -0°8'12.12
  // lat: 52.3028°, long: -0.1367°
  lat = parseFloat(Cookies.get("lat")) || 52.3028;
  lon = parseFloat(Cookies.get("lon")) || -0.1367;
 
  var map = L.map('map').setView([lat, lon], 13);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  const marker = L.marker([lat, lon]).addTo(map);
	map.on('click', onMapClick, marker);

  Cookies.set("lat", lat, { expires: 90 });
  Cookies.set("lon", lon, { expires: 90 });
}

const actualTemp = (forecast) => forecast.main.temp;
const feelsLikeTemp = (forecast) => forecast.main.feels_like;
const duringTheDayToday = getDaytimeFilter("today");
const duringTheNight = getNighttimeFilter(); 
const duringTheDayTomorrow = getDaytimeFilter("tomorrow");

var stablingRecommendations = [
  { "div": undefined, "tempSelector": undefined, "timeFilter": undefined },
  { "div": undefined, "tempSelector": undefined, "timeFilter": undefined },
]

async function setStabling(stabling) {
  if (stabling != "daytime" && stabling != "nighttime") {
    const defaultStabling = "daytime";
    console.error(`Unexpected stabling option: ${stabling}. Setting to ${defaultStabling}`)
    stabling = defaultStabling;
  }

  let recommendations = $("#recommendations");
  let recommendationsSeparator = $("#recommendations-separator");
  let turnedOutDiv = $("#turned-out-recommendation");
  let stabledDiv = $("#stabled-recommendation");

  let isMorning = isItMorning(Date.now());
  let daytimeDiv = undefined;
  let nighttimeDiv = undefined;

  if (stabling == "daytime") { daytimeDiv = stabledDiv; nighttimeDiv = turnedOutDiv; }
  if (stabling == "nighttime") { nighttimeDiv = stabledDiv; daytimeDiv = turnedOutDiv; }
  daytimeDiv.find(".timeofday").text("\u263C Daytime");
  nighttimeDiv.find(".timeofday").text("\u263E Night-time");

  recommendations.empty();
  if (stabling == "nighttime" && !isMorning || stabling == "daytime" && isMorning) {
    stablingRecommendations[0] = { "div": stabledDiv, "tempSelector": actualTemp, "timeFilter": isMorning ? duringTheDayToday : duringTheNight };
    stablingRecommendations[1] = { "div": turnedOutDiv, "tempSelector": feelsLikeTemp, "timeFilter": isMorning ? duringTheNight : duringTheDayTomorrow };
  }
  else if (stabling == "daytime" && !isMorning || stabling == "nighttime" && isMorning) {
    stablingRecommendations[0] = { "div": turnedOutDiv, "tempSelector": feelsLikeTemp, "timeFilter": isMorning ? duringTheDayToday : duringTheNight };
    stablingRecommendations[1] = { "div": stabledDiv, "tempSelector": actualTemp, "timeFilter": isMorning ? duringTheNight : duringTheDayTomorrow };
  }

  recommendations.append(stablingRecommendations[0]["div"]);
  recommendations.append(recommendationsSeparator);
  recommendations.append(stablingRecommendations[1]["div"]);

  Cookies.set("stabling", stabling, {expires: 90});

  updateRecommendations();
}

async function updateRecommendations() {
  console.log(lat, lon);
  console.log(`${lat}, ${lon}`);
  const x = "404b509674bb4dfe117be467b2333c2c";
  const request = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${x}`;
  console.log(request);
  const response = await fetch(request);
  const data = await response.json();
  
  forecasts = data.list;
  console.log("Date and time: temperature, feels like temperature")
  console.log(forecasts.map(f => `${new Date(f.dt * 1000)}: ${f.main.temp}, ${f.main.feels_like}, ${f.pop * 100}%`).join("\n"));
  average_temp = forecasts.map(f => f.main.feels_like).reduce((a, b) => a+b, 0) / forecasts.length;
  console.log(`Average feels like: ${average_temp}`)

  for (const rec of stablingRecommendations) {
      applyForecast(rec["div"], data.list, rec["tempSelector"], rec["timeFilter"]);
  }
}

async function applyForecast(div, forecasts, tempSelector, timeFilter) {

  let { max: maxTemp, min: minTemp, mean: meanTemp } = minMaxMean(forecasts, tempSelector, timeFilter);
  let { max: maxPop, min: minPop, mean: meanPop } = minMaxMean(forecasts, f => f.pop * 100, timeFilter);

  precision = 2
  div.find(".max-temp").text(maxTemp.toPrecision(precision));
  div.find(".min-temp").text(minTemp.toPrecision(precision));
  div.find(".mean-temp").text(meanTemp.toPrecision(precision));
  div.find(".min-pop").text(`${minPop.toFixed(0)}`);
  div.find(".max-pop").text(`${maxPop.toFixed(0)}`);

  div.find(".selected").removeClass("selected").addClass("deselected")
  div.find(".colourable").removeClass("min15 min10 min5 min0 min-10 colder");
  if (average_temp > 15) {
    div.find(".min15").removeClass("deselected").addClass("selected");
    div.find(".colourable").addClass("min15")
  } else if (average_temp > 10) {
    div.find(".min10").removeClass("deselected").addClass("selected");;
    div.find(".colourable").addClass("min10")
  } else if (average_temp > 5) {
    div.find(".min5").removeClass("deselected").addClass("selected");;
    div.find(".colourable").addClass("min5")
  } else if (average_temp > 0) {
    div.find(".min0").removeClass("deselected").addClass("selected");;
    div.find(".colourable").addClass("min0")
  } else if (average_temp > -10) {
    div.find(".min-10").removeClass("deselected").addClass("selected");;
    div.find(".colourable").addClass("min-10")
  } else {
    div.find(".colder").removeClass("deselected").addClass("selected");;
    div.find(".colourable").addClass("colder")
  }
}
  
  // https://www.windmillfeeds.co.uk/wp-content/uploads/2019/01/BETA.jpg
  // https://www.beta-uk.org/media/trade/download/39672-BETA%20Outdoor%20Rug%20Insert%20v3.pdf
  // https://www.equus.co.uk/blogs/community/temperature-guide-to-rugging-a-horse
