const widgetParams = JSON.parse((args.widgetParameter != null) ? args.widgetParameter : '{ "LAT" : "37.77" , "LON" : "-122.43" , "LOC_NAME" : "San Francisco, US" }')

const API_KEY = // add your own from https://home.openweathermap.org/api_keys

var LAT = widgetParams.LAT // 12.34
var LON = widgetParams.LON // 12.34
var LOCATION_NAME = widgetParams.LOC_NAME // "Your place"

// Support locales
const locale = "en"
const nowstring = "now"
const feelsstring = "feels like"

// use imperial, metric, or standard (kelvin)
const units = "metric"
const twelveHours = true
const roundedGraph = true
const roundedTemp = true
const hoursToShow = (config.widgetFamily == "small") ? 3 : 11;
const spaceBetweenDays = (config.widgetFamily == "small") ? 60 : 44;

const contextSize = 282
const mediumWidgetWidth = 584

const accentColor = new Color("#EB6E4E", 1)
const backgroundColor = new Color("#1C1C1E", 1)

const locationNameCoords = new Point(30, 30)
const locationNameFontSize = 24
const weatherDescriptionCoords = new Point(30, 52)
const weatherDescriptionFontSize = 18
const footerFontSize = 20
const feelsLikeCoords = new Point(30, 230)
const lastUpdateTimePosAndSize = new Rect((config.widgetFamily == "small") ? 150 : 450, 230, 100, footerFontSize+1)

// cache
let fm = FileManager.iCloud();
let cachePath = fm.joinPath(fm.documentsDirectory(), "weatherCache"); // <- file name
if(!fm.fileExists(cachePath)){
  fm.createDirectory(cachePath)
}

let weatherData;
let usingCachedData = false;
let drawContext = new DrawContext();

drawContext.size = new Size((config.widgetFamily == "small") ? contextSize : mediumWidgetWidth, contextSize)
drawContext.opaque = false
drawContext.setTextAlignedCenter()

try {
  weatherData = await new Request("https://api.openweathermap.org/data/2.5/onecall?lat=" + LAT + "&lon=" + LON + "&exclude=minutely,alerts&units=" + units + "&lang" + locale + "&appid=" + API_KEY).loadJSON();
  fm.writeString(fm.joinPath(cachePath, "lastread"+"_"+LAT+"_"+LON), JSON.stringify(weatherData));
}catch(e){
  console.log("Offline mode")
  try{
    await fm.downloadFileFromiCloud(fm.joinPath(cachePath, "lastread"+"_"+LAT+"_"+LON));
    let raw = fm.readString(fm.joinPath(cachePath, "lastread"+"_"+LAT+"_"+LON));
    weatherData = JSON.parse(raw);
    usingCachedData = true;
  }catch(e2){
    console.log("Error: No offline data cached")
  }
}

let widget = new ListWidget();
widget.setPadding(0, 0, 0, 0);
widget.backgroundColor = backgroundColor;

drawText(LOCATION_NAME, locationNameFontSize, locationNameCoords.x, locationNameCoords.y, accentColor);
drawText(weatherData.current.weather[0].description, weatherDescriptionFontSize, weatherDescriptionCoords.x, weatherDescriptionCoords.y, Color.white())

let min, max, diff;
for(let i = 0; i<=hoursToShow ;i++){
  let temp = shouldRound(roundedGraph, weatherData.hourly[i].temp);
  min = (temp < min || min == undefined ? temp : min)
  max = (temp > max || max == undefined ? temp : max)
}
diff = max -min;

for(let i = 0; i<=hoursToShow ;i++){
  let hourData = weatherData.hourly[i];
  let nextHourTemp = shouldRound(roundedGraph, weatherData.hourly[i+1].temp);
  let hour = epochToDate(hourData.dt).getHours();
  if(twelveHours)
    hour = (hour > 12 ? hour - 12 : (hour == 0 ? "12a" : ((hour == 12) ? "12p" : hour)))
  let temp = i==0?weatherData.current.temp : hourData.temp
  let delta = (diff>0)?(shouldRound(roundedGraph, temp) - min) / diff:0.5;
  let nextDelta = (diff>0)?(nextHourTemp - min) / diff:0.5

  if(i < hoursToShow){
    let hourDay = epochToDate(hourData.dt);
    for(let i2 = 0 ; i2 < weatherData.daily.length ; i2++){
      let day = weatherData.daily[i2];
      if(isSameDay(epochToDate(day.dt), epochToDate(hourData.dt))){
        hourDay = day;
        break;
      }
    }
		// 'Night' boolean for line graph and SFSymbols
		var night = (hourData.dt > hourDay.sunset || hourData.dt < hourDay.sunrise)
    drawLine(spaceBetweenDays * (i) + 50, 175 - (50 * delta),spaceBetweenDays * (i+1) + 50 , 175 - (50 * nextDelta), 4, (night ? Color.gray() : accentColor))
  }

  drawTextC(shouldRound(roundedTemp, temp)+"°", 20, spaceBetweenDays*i+30, 135 - (50*delta), 50, 21, Color.white())

  // Next 2 lines SFSymbols tweak
  const condition = i==0?weatherData.current.weather[0].id:hourData.weather[0].id
  drawImage(symbolForCondition(condition), spaceBetweenDays * i + 34, 161 - (50*delta)); //40, 165

  drawTextC((i==0?nowstring:hour), 18, spaceBetweenDays*i+25, 200,50, 21, Color.gray())

  previousDelta = delta;
}

drawText(feelsstring + " " + Math.round(weatherData.current.feels_like) + "°", footerFontSize, feelsLikeCoords.x, feelsLikeCoords.y, Color.gray())

drawContext.setTextAlignedRight();
drawTextC(epochToDate(weatherData.current.dt).toLocaleTimeString(), footerFontSize, lastUpdateTimePosAndSize.x, lastUpdateTimePosAndSize.y, lastUpdateTimePosAndSize.width, lastUpdateTimePosAndSize.height, (usingCachedData) ? Color.yellow() : Color.gray())

if(usingCachedData)
  drawText("⚠️", 32, ((config.widgetFamily == "small") ? contextSize : mediumWidgetWidth)-72,30)

widget.backgroundImage = (drawContext.getImage())
widget.presentMedium()

function epochToDate(epoch){
  return new Date(epoch * 1000)
}

function drawText(text, fontSize, x, y, color = Color.black()){
  drawContext.setFont(Font.boldSystemFont(fontSize))
  drawContext.setTextColor(color)
  drawContext.drawText(new String(text).toString(), new Point(x, y))
}

function drawImage(image, x, y){
  drawContext.drawImageAtPoint(image, new Point(x, y))
}

function drawTextC(text, fontSize, x, y, w, h, color = Color.black()){
  drawContext.setFont(Font.boldSystemFont(fontSize))
  drawContext.setTextColor(color)
  drawContext.drawTextInRect(new String(text).toString(), new Rect(x, y, w, h))
}

function drawLine(x1, y1, x2, y2, width, color){
  const path = new Path()
  path.move(new Point(x1, y1))
  path.addLine(new Point(x2, y2))
  drawContext.addPath(path)
  drawContext.setStrokeColor(color)
  drawContext.setLineWidth(width)
  drawContext.strokePath()
}

function shouldRound(should, value){
  return ((should) ? Math.round(value) : value)
}

function isSameDay(date1, date2){
  return (date1.getYear() == date2.getYear() && date1.getMonth() == date2.getMonth() &&  date1.getDate() == date2.getDate())
}

// SFSymbol function
function symbolForCondition(cond){
  let symbols = {
  // Thunderstorm
    "2": function(){
      return "cloud.bolt.rain.fill"
    },
  // Drizzle
    "3": function(){
      return "cloud.drizzle.fill"
    },
  // Rain
    "5": function(){
      return (cond == 511) ? "cloud.sleet.fill" : "cloud.rain.fill"
    },
  // Snow
    "6": function(){
      return (cond >= 611 && cond <= 613) ? "cloud.snow.fill" : "snow"
    },
  // Atmosphere
    "7": function(){
      if (cond == 781) { return "tornado" }
      if (cond == 701 || cond == 741) { return "cloud.fog.fill" }
      return night ? "cloud.fog.fill" : "sun.haze.fill"
    },
  // Clear and clouds
    "8": function(){
      if (cond == 800) { return night ? "moon.stars.fill" : "sun.max.fill" }
      if (cond == 802 || cond == 803) { return night ? "cloud.moon.fill" : "cloud.sun.fill" }
      return "cloud.fill"
    }
  }
  // Get first condition digit.
  let conditionDigit = Math.floor(cond / 100)
  // Style and return the symbol.
  let sfs = SFSymbol.named(symbols[conditionDigit]())
  sfs.applyFont(Font.systemFont(25))
  return sfs.image
}

Script.complete()
