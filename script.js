function isTonight(forecast) {
  const now = new Date(Date.now());
  const nightStartHour = 18;
  const nightDurationHours = 12;
  const nightStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), nightStartHour, 0, 0)
  const nightEnd = new Date(nightStart.getTime() + nightDurationHours * 60 * 60 * 1000) 
  return forecast.dt * 1000 >= nightStart.getTime() && forecast.dt * 1000 <= nightEnd.getTime();
}

function minMaxMean(values, valueFunc) {
  max = Math.max(...values.map(valueFunc));
  min = Math.min(...values.map(valueFunc));
  mean = values.map(valueFunc).reduce((a, b) => a+b, 0) / values.length;
  return { min, max, mean };
}

function onMapClick(e) {
  this.setLatLng(e.latlng)
  // Cookies.set("lat", e.latlng.lat, { expires: 10000 })
  // Cookies.set("lon", e.latlng.lng, { expires: 10000 })
  updateRugGuide(e.latlng.lat, e.latlng.lng)
}

async function setupRugGuide() {
  // lat: 52°18'10.08, long: -0°8'12.12
  // lat: 52.3028°, long: -0.1367°
  var lat = parseFloat(Cookies.get("lat")) || 52.3028;
  var lon = parseFloat(Cookies.get("lon")) || -0.1367;

  // const [lat, lon] = [52.3028, -0.1367]
  
  var map = L.map('map').setView([lat, lon], 13);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  const marker = L.marker([lat, lon]).addTo(map);
	map.on('click', onMapClick, marker);

  updateRugGuide(lat, lon)
}

async function updateRugGuide(lat, lon) {
  Cookies.set("lat", lat, { expires: 90 })
  Cookies.set("lon", lon, { expires: 90 })
  
  const x = "404b509674bb4dfe117be467b2333c2c"
  const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${x}`);
  const data = await response.json();
  
  forecasts = data.list.filter(isTonight);
  console.log("Date and time: temperature, feels like temperature")
  console.log(forecasts.map(f => `${new Date(f.dt * 1000)}: ${f.main.temp}, ${f.main.feels_like}`).join("\n"));
  average_temp = forecasts.map(f => f.main.feels_like).reduce((a, b) => a+b, 0) / forecasts.length;
  console.log(`Average feels like: ${average_temp}`)

  let { max: maxTemp, min: minTemp, mean: meanTemp } = minMaxMean(forecasts, f => f.main.temp);
  let { max: maxFeelsLike, min: minFeelsLike, mean: meanFeelsLike } = minMaxMean(forecasts, f => f.main.feels_like);
  let { max: maxPop, min: minPop, mean: meanPop } = minMaxMean(forecasts, f => f.pop * 100)

  precision = 2
  $("#max-temp").text(maxTemp.toPrecision(precision));
  $("#min-temp").text(minTemp.toPrecision(precision));
  $("#average-temp").text(meanTemp.toPrecision(precision));
  $("#max-feels-like").text(maxFeelsLike.toPrecision(precision));
  $("#min-feels-like").text(minFeelsLike.toPrecision(precision));
  $("#average-feels-like").text(meanFeelsLike.toPrecision(precision));
  $("#min-pop").text(`${minPop.toFixed(0)} %`);
  $("#max-pop").text(`${maxPop.toFixed(0)} %`);
  // $("#average-pop").text(`${meanPop.toFixed(0)} %`);

  $(".selected").removeClass("selected").addClass("deselected")
  $(".colourable").removeClass("min15 min10 min5 min0 min-10 colder");
  if (average_temp > 15) {
    $(".min15").removeClass("deselected").addClass("selected");
    $(".colourable").addClass("min15")
  } else if (average_temp > 10) {
    $(".min10").removeClass("deselected").addClass("selected");;
    $(".colourable").addClass("min10")
  } else if (average_temp > 5) {
    $(".min5").removeClass("deselected").addClass("selected");;
    $(".colourable").addClass("min5")
  } else if (average_temp > 0) {
    $(".min0").removeClass("deselected").addClass("selected");;
    $(".colourable").addClass("min0")
  } else if (average_temp > -10) {
    $(".min-10").removeClass("deselected").addClass("selected");;
    $(".colourable").addClass("min-10")
  } else {
    $(".colder").removeClass("deselected").addClass("selected");;
    $(".colourable").addClass("colder")
  }
  
  // https://www.windmillfeeds.co.uk/wp-content/uploads/2019/01/BETA.jpg
  // https://www.beta-uk.org/media/trade/download/39672-BETA%20Outdoor%20Rug%20Insert%20v3.pdf
  // https://www.equus.co.uk/blogs/community/temperature-guide-to-rugging-a-horse
}