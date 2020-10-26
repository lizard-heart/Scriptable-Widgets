const API_URL = "https://www.purpleair.com/json?show=";
let SENSOR_ID = args.widgetParameter || // add your own
let SENSOR_ID2 = args.widgetParameter || //add your own
let SENSOR_ID3 = args.widgetParameter || // add your own
let SENSOR_ID4 = args.widgetParameter || //add your own

async function getSensorData(url, id) {
  let req = new Request(`${url}${id}`);
  let json = await req.loadJSON();

  return {
    val: json.results[0].PM2_5Value,
    ts: json.results[0].LastSeen,
    loc: json.results[0].Label,
  };
}

const levelAttributes = [
  {
    threshold: 300,
    label: "Hazardous",
    startColor: "FF3DE0",
    endColor: "D600B2",
  },
  {
    threshold: 200,
    label: "Very Unhealthy",
    startColor: "CD3DFF",
    endColor: "9D00D6",
  },
  {
    threshold: 150,
    label: "Unhealthy",
    startColor: "FF3D3D",
    endColor: "D60000",
  },
  {
    threshold: 100,
    label: "Unhealthy (S.G.)",
    startColor: "FFA63D",
    endColor: "D67200",
  },
  {
    threshold: 50,
    label: "Moderate",
    startColor: "FFA63D",
    endColor: "D67200",
  },
  {
    threshold: 0,
    label: "Healthy",
    startColor: "3DFF73",
    endColor: "00D63D",
  },
];

const getLevelAttributes = (level, attributes) =>
  attributes
    .filter((c) => level > c.threshold)
    .sort((a, b) => b.threshold - a.threshold)[0];

// Calculates the AQI level
function calculateLevel(aqi) {
  let res = {
    level: "OK",
    label: "fine",
    startColor: "white",
    endColor: "white",
  };

  let level = parseInt(aqi, 10) || 0;

  // Set attributes
  res = getLevelAttributes(level, levelAttributes);
  // Set level
  res.level = level;
  return res;
}

//Function to get AQI number from PPM reading
function aqiFromPM(pm) {
  if (pm > 350.5) {
    return calcAQI(pm, 500.0, 401.0, 500.0, 350.5);
  } else if (pm > 250.5) {
    return calcAQI(pm, 400.0, 301.0, 350.4, 250.5);
  } else if (pm > 150.5) {
    return calcAQI(pm, 300.0, 201.0, 250.4, 150.5);
  } else if (pm > 55.5) {
    return calcAQI(pm, 200.0, 151.0, 150.4, 55.5);
  } else if (pm > 35.5) {
    return calcAQI(pm, 150.0, 101.0, 55.4, 35.5);
  } else if (pm > 12.1) {
    return calcAQI(pm, 100.0, 51.0, 35.4, 12.1);
  } else if (pm >= 0.0) {
    return calcAQI(pm, 50.0, 0.0, 12.0, 0.0);
  } else {
    return "-";
  }
}

//Function that actually calculates the AQI number
function calcAQI(Cp, Ih, Il, BPh, BPl) {
  let a = Ih - Il;
  let b = BPh - BPl;
  let c = Cp - BPl;
  return Math.round((a / b) * c + Il);
}

async function run() {
  let wg = new ListWidget();

  try {
    console.log(`Using sensor ID: ${SENSOR_ID}`);
    let data = await getSensorData(API_URL, SENSOR_ID);
    let data2 = await getSensorData(API_URL, SENSOR_ID2);
    console.log(data);
    let data3 = await getSensorData(API_URL, SENSOR_ID3);
    let data4 = await getSensorData(API_URL, SENSOR_ID4);
    console.log(data);

    let header = wg.addText("Air Quality");
    header.textSize = 15;
    header.textColor = Color.black();

    let aqi = Math.round((aqiFromPM(data.val) + aqiFromPM(data2.val) + aqiFromPM(data3.val) + aqiFromPM(data4.val)) / 4);
    let level = calculateLevel(aqi);
    let aqitext = aqi.toString();
    console.log(aqi);
    console.log(level.level);
    let startColor = new Color(level.startColor);
    let endColor = new Color(level.endColor);
    let gradient = new LinearGradient();
    gradient.colors = [startColor, endColor];
    gradient.locations = [0.0, 1];
    console.log(gradient);

    wg.backgroundGradient = gradient;

    let content = wg.addText(aqitext);
    content.textSize = 50;
    content.textColor = Color.black();

    let wordLevel = wg.addText(level.label);
    wordLevel.textSize = 15;
    wordLevel.textColor = Color.black();

    let id = wg.addText(data.loc);
    id.textSize = 10;
    id.textColor = Color.black();

    let updatedAt = new Date(data.ts * 1000).toLocaleTimeString("en-US", {
      timeZone: "PST",
    });
    let ts = wg.addText(`${updatedAt}`);
    ts.textSize = 10;
    ts.textColor = Color.black();
  } catch (e) {
    console.log(e);
    let err = wg.addText(`error: ${e}`);
    err.textSize = 10;
    err.textColor = Color.red();
    err.textOpacity = 30;
  }

  Script.setWidget(wg);
  Script.complete();
}
await run();
