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

    const pageURL = "https://vzjeqdcotzqyzi2a4f8ea4lv.pages.dev/"
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
    const redditItems = {};

    feedItems.forEach(item => {
        if (item.source === 'reddit' && item.subreddit) {
            if (!redditItems[item.subreddit]) {
                redditItems[item.subreddit] = [];
            }
            redditItems[item.subreddit].push(item);
            return;
        }

        if (!groupedFeeds[item.source]) {
            groupedFeeds[item.source] = [];
        }
        groupedFeeds[item.source].push(item);
    });

    // Helper functions
    function degreesToCardinal(degrees) {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        return directions[Math.round(degrees / 45) % 8];
    }

    function getMoonPhaseDescription(phase) {
        if (phase === 0) return "New Moon";
        else if (phase < 0.25) return "Waxing Crescent";
        else if (phase === 0.25) return "First Quarter";
        else if (phase < 0.5) return "Waxing Gibbous";
        else if (phase === 0.5) return "Full Moon";
        else if (phase < 0.75) return "Waning Gibbous";
        else if (phase === 0.75) return "Last Quarter";
        else return "Waning Crescent";
    }

    // Fix XKCD image URLs
    xkcdItems.forEach(comic => {
        if (comic.url && comic.url.startsWith('//')) {
            comic.image = `https:${comic.url}`;
        } else {
            comic.image = comic.url;
        }
    });

    // Build HTML with dark theme and email-compatible tables
    let html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <link href="https://fonts.cdnfonts.com/css/cascadia-code" rel="stylesheet">
  </head>
  <body style="font-family: 'Cascadia Code', monospace, sans-serif; margin: 0; padding: 0; background-color: #121212; color: #e0e0e0;">
    <!-- Main Container -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #121212;">
        <tr>
            <td align="center" valign="top">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="margin: 20px auto; background-color: #1e1e1e;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 15px; border-bottom: 1px solid #333333;">
                            <h1 style="font-size: 20px; margin: 0; color: #ffffff;">Huginn Daily <a href="${pageURL}" style="color: #58a6ff; text-decoration: none; font-size: 16px;">💻</a></h1>
                            <p style="font-size: 14px; margin: 5px 0 0; color: #b0b0b0;">${dateTime}</p>
                            <p style="font-size: 14px; margin: 5px 0 0; color: #b0b0b0;">${uuid}</p>
                        </td>
                    </tr>`;

    // Weather section
    if (weatherItem) {
        const sunriseDate = new Date(parseInt(weatherItem.sunriseTime) * 1000);
        const sunsetDate = new Date(parseInt(weatherItem.sunsetTime) * 1000);
        const sunriseTime = sunriseDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const sunsetTime = sunsetDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const windDirection = degreesToCardinal(weatherItem.avewind.degrees);
        const moonPhaseDesc = getMoonPhaseDescription(parseFloat(weatherItem.moonPhase));

        html += `
                    <!-- Weather Card -->
                    <tr>
                        <td style="padding: 15px; border-bottom: 1px solid #333333;">
                            <h2 style="font-size: 18px; margin: 0 0 10px 0; color: #ffffff; border-bottom: 2px solid #58a6ff; padding-bottom: 5px;">Weather</h2>
                            <table width="100%" cellpadding="8" cellspacing="0" border="0" style="margin-top: 10px; border-collapse: collapse;">
                                <tr style="background-color: #252525;">
                                    <th align="left" style="padding: 8px; border-bottom: 1px solid #333333; font-weight: bold; color: #ffffff;">Summary</th>
                                    <td style="padding: 8px; border-bottom: 1px solid #333333; color: #e0e0e0;">${weatherItem.icon || '⛅️'} ${weatherItem.conditions}</td>
                                </tr>
                                <tr style="background-color: #2a2a2a;">
                                    <th align="left" style="padding: 8px; border-bottom: 1px solid #333333; font-weight: bold; color: #ffffff;">Temperature Range</th>
                                    <td style="padding: 8px; border-bottom: 1px solid #333333; color: #e0e0e0;">${weatherItem.low.celsius}°C to ${weatherItem.high.celsius}°C (${weatherItem.low.fahrenheit}°F to ${weatherItem.high.fahrenheit}°F)</td>
                                </tr>
                                <tr style="background-color: #252525;">
                                    <th align="left" style="padding: 8px; border-bottom: 1px solid #333333; font-weight: bold; color: #ffffff;">Feels Like</th>
                                    <td style="padding: 8px; border-bottom: 1px solid #333333; color: #e0e0e0;">Low: ${weatherItem.low.fahrenheit_apparent}°F | High: ${weatherItem.high.fahrenheit_apparent}°F</td>
                                </tr>
                                <tr style="background-color: #2a2a2a;">
                                    <th align="left" style="padding: 8px; border-bottom: 1px solid #333333; font-weight: bold; color: #ffffff;">Humidity</th>
                                    <td style="padding: 8px; border-bottom: 1px solid #333333; color: #e0e0e0;">${weatherItem.avehumidity}%</td>
                                </tr>
                                <tr style="background-color: #252525;">
                                    <th align="left" style="padding: 8px; border-bottom: 1px solid #333333; font-weight: bold; color: #ffffff;">Wind</th>
                                    <td style="padding: 8px; border-bottom: 1px solid #333333; color: #e0e0e0;">${weatherItem.avewind.kph} km/h (${weatherItem.avewind.mph} mph), ${windDirection}</td>
                                </tr>
                                <tr style="background-color: #2a2a2a;">
                                    <th align="left" style="padding: 8px; border-bottom: 1px solid #333333; font-weight: bold; color: #ffffff;">Dew Point</th>
                                    <td style="padding: 8px; border-bottom: 1px solid #333333; color: #e0e0e0;">${weatherItem.dewPoint}°F</td>
                                </tr>
                                <tr style="background-color: #252525;">
                                    <th align="left" style="padding: 8px; border-bottom: 1px solid #333333; font-weight: bold; color: #ffffff;">Cloud Cover</th>
                                    <td style="padding: 8px; border-bottom: 1px solid #333333; color: #e0e0e0;">${(weatherItem.cloudCover * 100).toFixed(0)}%</td>
                                </tr>
                                <tr style="background-color: #2a2a2a;">
                                    <th align="left" style="padding: 8px; border-bottom: 1px solid #333333; font-weight: bold; color: #ffffff;">Pressure</th>
                                    <td style="padding: 8px; border-bottom: 1px solid #333333; color: #e0e0e0;">${weatherItem.pressure} hPa</td>
                                </tr>
                                <tr style="background-color: #252525;">
                                    <th align="left" style="padding: 8px; border-bottom: 1px solid #333333; font-weight: bold; color: #ffffff;">Sunrise/Sunset</th>
                                    <td style="padding: 8px; border-bottom: 1px solid #333333; color: #e0e0e0;">🌅 ${sunriseTime} / 🌇 ${sunsetTime}</td>
                                </tr>
                                <tr style="background-color: #2a2a2a;">
                                    <th align="left" style="padding: 8px; font-weight: bold; color: #ffffff;">Moon Phase</th>
                                    <td style="padding: 8px; color: #e0e0e0;">${moonPhaseDesc} (${(parseFloat(weatherItem.moonPhase) * 100).toFixed(0)}%)</td>
                                </tr>
                            </table>
                        </td>
                    </tr>`;
    }

    // XKCD section
    if (xkcdItems && xkcdItems.length > 0) {
        html += `
                    <!-- XKCD Card -->
                    <tr>
                        <td style="padding: 15px; border-bottom: 1px solid #333333;">
                            <h2 style="font-size: 18px; margin: 0 0 10px 0; color: #ffffff; border-bottom: 2px solid #58a6ff; padding-bottom: 5px;">XKCD</h2>`;

        xkcdItems.forEach(comic => {
            html += `
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 15px;">
                                <tr>
                                    <td align="center">
                                        <a href="${comic.url}" style="color: #58a6ff; text-decoration: none;">
                                            <img src="${comic.image}" alt="${comic.title}" width="100%" style="max-width: 600px; height: auto; border: 0; display: block;">
                                        </a>
                                    </td>
                                </tr>
                            </table>`;
        });

        html += `
                        </td>
                    </tr>`;
    }

    // Feed items grouped by source
    Object.keys(groupedFeeds).forEach(source => {
        if (groupedFeeds[source].length > 0) {
            const sourceTitle = source.charAt(0).toUpperCase() + source.slice(1);

            html += `
                    <!-- ${sourceTitle} Card -->
                    <tr>
                        <td style="padding: 15px; border-bottom: 1px solid #333333;">
                            <h2 style="font-size: 18px; margin: 0 0 10px 0; color: #ffffff; border-bottom: 2px solid #58a6ff; padding-bottom: 5px;">${sourceTitle}</h2>
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">`;

            groupedFeeds[source].forEach(item => {
                html += `
                                <tr>
                                    <td style="padding: 8px 0; border-bottom: 1px solid #333333;">
                                        <a href="${item.url}" style="color: #58a6ff; text-decoration: none; font-size: 14px;">${item.title}</a>
                                    </td>
                                </tr>`;
            });

            html += `
                            </table>
                        </td>
                    </tr>`;
        }
    });

    // Reddit items
    if (Object.keys(redditItems).length > 0) {
        html += `
                    <!-- Reddit Card -->
                    <tr>
                        <td style="padding: 15px; border-bottom: 1px solid #333333;">
                            <h2 style="font-size: 18px; margin: 0 0 10px 0; color: #ffffff; border-bottom: 2px solid #58a6ff; padding-bottom: 5px;">Reddit</h2>`;

        Object.keys(redditItems).forEach(subreddit => {
            html += `
                            <h3 style="font-size: 16px; margin: 15px 0 5px 0; color: #58a6ff; text-align: right;">r/${subreddit}</h3>
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">`;

            redditItems[subreddit].forEach(item => {
                html += `
                                <tr>
                                    <td style="padding: 8px 0; border-bottom: 1px solid #333333;">
                                        <a href="${item.url}" style="color: #58a6ff; text-decoration: none; font-size: 14px;">${item.title}</a>
                                    </td>
                                </tr>`;
            });

            html += `
                            </table>`;
        });

        html += `
                        </td>
                    </tr>`;
    }

    // Movie trailers section
    if (trailerItems && trailerItems.length > 0) {
        html += `
                    <!-- Trailers Card -->
                    <tr>
                        <td style="padding: 15px;">
                            <h2 style="font-size: 18px; margin: 0 0 10px 0; color: #ffffff; border-bottom: 2px solid #58a6ff; padding-bottom: 5px;">Movie Trailers</h2>
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">`;

        trailerItems.forEach(trailer => {
            html += `
                                <tr>
                                    <td style="padding: 8px 0; border-bottom: 1px solid #333333;">
                                        <a href="${trailer.url}" style="color: #58a6ff; text-decoration: none; font-size: 14px;">${trailer.title}</a>
                                    </td>
                                </tr>`;
        });

        html += `
                            </table>
                        </td>
                    </tr>`;
    }

    // Footer
    html += `
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 15px; background-color: #252525; text-align: center; font-size: 12px; color: #b0b0b0;">
                            Sent via Huginn • ${dateTime}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
  </body>
  </html>`;

    this.createEvent({
        digest_html: html,
        digest_date: dateTime
    });
};