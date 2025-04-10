Agent.base64Encode = function (str) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';

  for (let i = 0; i < str.length; i += 3) {
    const a = str.charCodeAt(i);
    const b = str.charCodeAt(i + 1);
    const c = str.charCodeAt(i + 2);

    const enc1 = a >> 2;
    const enc2 = ((a & 3) << 4) | (b >> 4);
    let enc3 = ((b & 15) << 2) | (c >> 6);
    let enc4 = c & 63;

    if (isNaN(b)) {
      enc3 = enc4 = 64;
    } else if (isNaN(c)) {
      enc4 = 64;
    }

    output += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + chars.charAt(enc4);
  }

  return output;
}

Agent.generateUUID = function () {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

Agent.receive = function () {
  const events = this.incomingEvents();
  if (!events.length) return;

  const uuid = this.generateUUID();
  const dateTime = new Date().toLocaleString('en-US', {
    timeZone: 'Europe/Athens',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    // hour: '2-digit',
    // minute: '2-digit',
    // second: '2-digit',
    // hour12: false
  });

  const items = events.reduce((acc, event) => {
    if (event.payload && event.payload.events) {
      return acc.concat(event.payload.events);
    }
    return acc;
  }, []);

  let weatherItem = items.find(item => item.source === 'weather');
  let xkcdItems = items.filter(item => item.source === 'xkcd');
  let trailerItems = items.filter(item => item.source === 'trailers');

  // group by
  const feedItems = items.filter(item =>
    item.source !== 'weather' &&
    item.source !== 'xkcd' &&
    item.source !== 'trailers'
  );

  feedItems.sort((a, b) => new Date(b.date_published) - new Date(a.date_published));

  const groupedFeeds = {};
  const redditItems = {}; // Separate reddit items

  feedItems.forEach(item => {
    // Handle Reddit separately
    if (item.source === 'reddit' && item.subreddit) {
      if (!redditItems[item.subreddit]) {
        redditItems[item.subreddit] = [];
      }
      redditItems[item.subreddit].push(item);
      return;
    }

    // Handle other sources
    if (!groupedFeeds[item.source]) {
      groupedFeeds[item.source] = [];
    }
    groupedFeeds[item.source].push(item);
  });

  // Build HTML
  let html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      :root {
        --bg-color: #121212;
        --container-bg: #1e1e1e;
        --text-color: #e0e0e0;
        --heading-color: #ffffff;
        --subheading-color: #58a6ff;
        --link-color: #58a6ff;
        --border-color: #333333;
        --item-hover: #2a2a2a;
        --shadow: 0 4px 12px rgba(0,0,0,0.2);
        --accent-color: #58a6ff;
        --tooltip-bg: #2a2a2a;
        --tooltip-text: #e0e0e0;
        --table-header-bg: #2a2a2a;
        --table-header-text: #ffffff;
        --table-row-odd: #1e1e1e;
        --table-row-even: #252525;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        line-height: 1.5;
        color: var(--text-color);
        background-color: var(--bg-color);
        margin: 0;
        padding: 0;
      }
      
      .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 15px;
      }
      
      .card {
        background-color: var(--container-bg);
        border-radius: 8px;
        box-shadow: var(--shadow);
        padding: 16px;
        margin-bottom: 16px;
        transition: all 0.2s ease;
      }
      
      .card:hover {
        box-shadow: 0 6px 12px rgba(0,0,0,0.15);
      }

      .header-p {
        margin: 0.2em 0;
        font-weight: 500;
        letter-spacing: -0.02em;
        font-size: 14px;
      }

      .subreddit {
        text-align: right;
      }
      
      h2 {
        font-size: 18px;
        font-weight: 600;
        color: var(--heading-color);
        margin-top: 0;
        margin-bottom: 12px;
        padding-bottom: 6px;
        border-bottom: 2px solid var(--accent-color);
      }
      
      h3 {
        font-size: 16px;
        font-weight: 500;
        color: var(--subheading-color);
        margin-bottom: 8px;
      }
      
      a {
        color: var(--link-color);
        text-decoration: none;
        transition: color 0.2s ease;
      }
      
      a:hover {
        color: var(--accent-color);
        text-decoration: underline;
      }
      
      /* Weather Table Styles */
      .weather-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
        border-radius: 6px;
        overflow: hidden;
      }
      
      .weather-table th {
        background-color: var(--table-header-bg);
        color: var(--table-header-text);
        font-weight: 500;
        text-align: left;
        padding: 8px 12px;
        font-size: 14px;
      }
      
      .weather-table td {
        padding: 8px 12px;
        border-bottom: 1px solid var(--border-color);
        font-size: 14px;
      }
      
      .weather-table tr:nth-child(odd) {
        background-color: var(--table-row-odd);
      }
      
      .weather-table tr:nth-child(even) {
        background-color: var(--table-row-even);
      }
      
      .weather-table tr:last-child td {
        border-bottom: none;
      }
      
      .comic {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin: 12px 0;
      }
      
      .comic-title {
        font-weight: 600;
        margin-bottom: 8px;
        text-align: center;
        font-size: 15px;
      }
      
      .comic img {
        max-width: 600px;
        max-height: auto;
        object-fit: contain;
        border-radius: 6px;
        margin-bottom: 6px;
        cursor: pointer;
      }
      
      .comic-number {
        font-size: 12px;
        color: var(--text-color);
        opacity: 0.7;
        margin-top: 3px;
      }
      
      .item-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      
      .item-list li {
        padding: 8px 10px;
        border-bottom: 1px solid var(--border-color);
        position: relative;
        font-size: 14px;
      }
      
      .item-list li:last-child {
        border-bottom: none;
      }
      
      .item-list li:hover {
        background-color: var(--item-hover);
        border-radius: 4px;
      }
      
      .item-content {
        display: none;
        position: absolute;
        z-index: 10;
        background-color: var(--tooltip-bg);
        color: var(--tooltip-text);
        border-radius: 6px;
        padding: 15px;
        width: 90%;
        max-width: 100%;
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        left: 50%;
        transform: translateX(-50%);
        bottom: 100%;
        font-size: 13px;
        line-height: 1.4;
        overflow: auto;
        max-height: 250px;
        border: 4px solid var(--border-color);
      }

      .item-content::-webkit-scrollbar {
        display: none;
      }

      .item-list li:hover .item-content {
        display: block;
      }
      
      .item-list li::before {
        content: "•";
        color: var(--accent-color);
        font-weight: bold;
        display: inline-block;
        width: 1em;
        margin-left: -0.5em;
      }
      
      @media (max-width: 600px) {
        .container {
          padding: 10px;
        }
        
        .card {
          padding: 12px;
          margin-bottom: 12px;
        }
        
        .item-content {
          width: 95%;
          left: 2.5%;
          transform: none;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
  `;

  html += `
      <div class="card">
        <h2>Huginn Daily</h2>
        <p class="header-p">${dateTime}</p>
        <p class="header-p">${uuid}</p>
      </div>
  `;

  // Weather section with detailed table
  if (weatherItem) {
    // Format sunrise and sunset times
    const sunriseDate = new Date(parseInt(weatherItem.sunriseTime) * 1000);
    const sunsetDate = new Date(parseInt(weatherItem.sunsetTime) * 1000);
    const sunriseTime = sunriseDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const sunsetTime = sunsetDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Get moon phase description
    const moonPhase = parseFloat(weatherItem.moonPhase);
    let moonPhaseDesc = "Unknown";
    if (moonPhase === 0) moonPhaseDesc = "New Moon";
    else if (moonPhase < 0.25) moonPhaseDesc = "Waxing Crescent";
    else if (moonPhase === 0.25) moonPhaseDesc = "First Quarter";
    else if (moonPhase < 0.5) moonPhaseDesc = "Waxing Gibbous";
    else if (moonPhase === 0.5) moonPhaseDesc = "Full Moon";
    else if (moonPhase < 0.75) moonPhaseDesc = "Waning Gibbous";
    else if (moonPhase === 0.75) moonPhaseDesc = "Last Quarter";
    else if (moonPhase < 1) moonPhaseDesc = "Waning Crescent";

    html += `
      <div class="card">
        <h2>Weather</h2>
        <table class="weather-table">
          <tr>
            <th>Summary</th>
            <td>${weatherItem.icon || '⛅️'} ${weatherItem.conditions}</td>
          </tr>
          <tr>
            <th>Temperature Range</th>
            <td>${weatherItem.low.celsius}°C to ${weatherItem.high.celsius}°C (${weatherItem.low.fahrenheit}°F to ${weatherItem.high.fahrenheit}°F)</td>
          </tr>
          <tr>
            <th>Feels Like</th>
            <td>Low: ${weatherItem.low.fahrenheit_apparent}°F | High: ${weatherItem.high.fahrenheit_apparent}°F</td>
          </tr>
          <tr>
            <th>Humidity</th>
            <td>${weatherItem.avehumidity}%</td>
          </tr>
          <tr>
            <th>Wind</th>
            <td>${weatherItem.avewind.kph} km/h (${weatherItem.avewind.mph} mph), Direction: ${weatherItem.avewind.degrees}°</td>
          </tr>
          <tr>
            <th>Precipitation</th>
            <td>Probability: ${weatherItem.precip.probability * 100}%, Type: ${weatherItem.precip.type !== "none" ? weatherItem.precip.type : "No precipitation expected"}</td>
          </tr>
          <tr>
            <th>Sunrise / Sunset</th>
            <td>🌅 ${sunriseTime} / 🌇 ${sunsetTime}</td>
          </tr>
          <tr>
            <th>Moon Phase</th>
            <td>${moonPhaseDesc} (${(moonPhase * 100).toFixed(0)}%)</td>
          </tr>
          <tr>
            <th>Cloud Cover</th>
            <td>${(parseFloat(weatherItem.cloudCover) * 100).toFixed(0)}%</td>
          </tr>
          <tr>
            <th>Pressure</th>
            <td>${weatherItem.pressure} hPa</td>
          </tr>
          <tr>
            <th>Dew Point</th>
            <td>${weatherItem.dewPoint}°F</td>
          </tr>
          <tr>
            <th>Visibility</th>
            <td>${weatherItem.visibility} miles</td>
          </tr>
        </table>
      </div>
  `;
  }

  // XKCD section
  if (xkcdItems && xkcdItems.length > 0) {
    html += `
      <div class="card">
        <h2>XKCD</h2>
  `;
    xkcdItems.forEach(comic => {
      html += `
        <div class="comic">
          <a href="${comic.url}" target="_blank">
            <img src="${comic.url}" alt="${comic.title}">
          </a>
        </div>
  `;
    });

    html += `
      </div>
  `;
  }

  // Feed items grouped by source (except Reddit)
  Object.keys(groupedFeeds).forEach(source => {
    if (groupedFeeds[source].length > 0) {
      const sourceTitle = source.charAt(0).toUpperCase() + source.slice(1);
      html += `
      <div class="card">
        <h2>${sourceTitle}</h2>
        <ul class="item-list">
  `;

      groupedFeeds[source].forEach(item => {
        html += `
          <li>
            <a href="${item.url}" target="_blank">${item.title}</a>
            ${item.content ? `<div class="item-content">${item.content}</div>` : ''}
          </li>
  `;
      });

      html += `
        </ul>
      </div>
  `;
    }
  });

  // Reddit items (after other feeds)
  if (Object.keys(redditItems).length > 0) {
    html += `
      <div class="card">
        <h2>Reddit</h2>
  `;

    Object.keys(redditItems).forEach(subreddit => {
      html += `
        <h3 class="subreddit">r/${subreddit}</h3>
        <ul class="item-list">
  `;

      redditItems[subreddit].forEach(item => {
        html += `
          <li>
            <a href="${item.url}" target="_blank">${item.title}</a>
            ${item.content ? `<div class="item-content">${item.content}</div>` : ''}
          </li>
  `;
      });

      html += `
        </ul>
  `;
    });

    html += `
      </div>
  `;
  }

  // Movie trailers section
  if (trailerItems && trailerItems.length > 0) {
    html += `
      <div class="card">
        <h2>Movie Trailers</h2>
        <ul class="item-list">
  `;

    trailerItems.forEach(trailer => {
      html += `
          <li>
            <a href="${trailer.url}" target="_blank">${trailer.title}</a>
            ${trailer.content ? `<div class="item-content">${trailer.content}</div>` : ''}
          </li>
  `;
    });

    html += `
        </ul>
      </div>
  `;
  }

  // Close HTML tags
  html += `
    </div>
  </body>
  </html>`;

  this.createEvent({
    digest_html: html,
    digest_html_b64: this.base64Encode(unescape(encodeURIComponent(html))),
    digest_date: dateTime
  });
};